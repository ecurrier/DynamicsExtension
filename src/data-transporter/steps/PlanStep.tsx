import {
  Badge,
  Button,
  Checkbox,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Spinner,
  Text,
  tokens,
} from '@fluentui/react-components'
import { ArrowRight20Regular, ArrowSwap20Regular } from '@fluentui/react-icons'
import { useEffect, useMemo, useState } from 'react'

import { cellText } from '@/modules/webapi/lib'
import { CodeBlock, DataTable, type DataTableColumn, FormRow, FormStack, Grow, useAppToast } from '@/shared/components'
import { useAsyncAction } from '@/shared/hooks'
import { type Environment } from '@/shared/storage'

import { FieldSelector } from './FieldSelector'
import { useTargetMetadata } from '../hooks'
import {
  buildPlan,
  buildTransportPayload,
  defaultSelection,
  type PayloadContext,
  type PlannedRow,
  restrictFetchXmlToId,
  retrieveAllRows,
  rowId,
  selectableFields,
  sourceColumns,
} from '../lib'
import { useTransporterStore } from '../store'

const SCOPE_LIMIT = 100_000
const ACTION_COLORS: Record<PlannedRow['action'], 'success' | 'brand' | 'subtle'> = {
  create: 'success',
  update: 'brand',
  skip: 'subtle',
}

const useStyles = makeStyles({
  hint: {
    color: tokens.colorNeutralForeground3,
  },
  options: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
  },
  split: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 3fr) minmax(320px, 2fr)',
    gap: '16px',
    alignItems: 'start',
  },
  mono: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
  },
  activeRow: {
    outline: `2px solid ${tokens.colorBrandStroke1}`,
    outlineOffset: '-2px',
  },
  preview: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
})

interface PlanStepProps {
  target: Environment | null
}

type KeyedRow = PlannedRow & { key: string }

export const PlanStep = ({ target }: PlanStepProps) => {
  const styles = useStyles()
  const toast = useAppToast()
  const {
    entity,
    fetchXml,
    sourceRows,
    options,
    selectedFields,
    plan,
    setOptions,
    setSelectedFields,
    setPlan,
    setStep,
  } = useTransporterStore()
  const { targetOps, metadata, entities, entitySets } = useTargetMetadata(target, entity?.logicalName ?? null)
  const compare = useAsyncAction('Could not compare with the target')
  const [previewKey, setPreviewKey] = useState<string | null>(null)

  const columns = useMemo(() => sourceColumns(sourceRows), [sourceRows])
  const fields = useMemo(
    () => (metadata.data ? selectableFields(metadata.data.attributes, columns) : []),
    [metadata.data, columns],
  )
  useEffect(() => {
    if (selectedFields === null && metadata.data) {
      setSelectedFields(defaultSelection(fields))
    }
  }, [selectedFields, metadata.data, fields, setSelectedFields])
  const selected = useMemo(() => selectedFields ?? new Set<string>(), [selectedFields])
  const info = metadata.data?.info ?? null
  const primaryId = info?.primaryIdAttribute || entity?.primaryIdAttribute || ''
  const nameAttribute = info?.primaryNameAttribute ?? entity?.primaryNameAttribute ?? null

  const runCompare = () =>
    compare.run(async () => {
      if (!targetOps || !info) {
        throw new Error('The target entity metadata has not loaded yet')
      }
      const ops = await targetOps()
      const ids = sourceRows.map((row) => rowId(row, primaryId)).filter((id): id is string => id !== null)
      const existing = new Set(
        await ops.existingIds({
          entityLogicalName: info.logicalName,
          entitySetName: info.entitySetName,
          primaryIdAttribute: primaryId,
          ids,
        }),
      )
      let scope: Set<string> | null = null
      if (options.deleteMissing) {
        const restricted = restrictFetchXmlToId(fetchXml, primaryId)
        const all = await retrieveAllRows((request) => ops.retrievePage(request), {
          entitySetName: info.entitySetName,
          fetchXml: restricted,
          maxRows: SCOPE_LIMIT,
          pageSize: 5000,
        })
        if (all.truncated) {
          throw new Error(`The query returns more than ${SCOPE_LIMIT} target rows, narrow it before syncing deletes`)
        }
        scope = new Set(all.rows.map((row) => rowId(row, primaryId)).filter((id): id is string => id !== null))
      }
      const built = buildPlan(sourceRows, primaryId, existing, scope, options)
      setPlan(built)
      setPreviewKey(null)
      toast.success(
        'Plan ready',
        `${built.counts.create} to create, ${built.counts.update} to update, ${built.counts.delete} to delete`,
      )
    })

  const items = useMemo<KeyedRow[]>(
    () => (plan?.rows ?? []).map((row, index) => ({ ...row, key: row.id ?? `row-${index}` })),
    [plan],
  )
  const payloadContext: PayloadContext | null = metadata.data
    ? { attributes: metadata.data.attributes, selected, entitySets, primaryIdAttribute: primaryId }
    : null
  const previewRow = items.find((row) => row.key === previewKey) ?? null
  const preview =
    previewRow && previewRow.id && previewRow.action !== 'skip' && payloadContext
      ? buildTransportPayload(previewRow.row, previewRow.id, payloadContext, previewRow.action)
      : null

  const planColumns = useMemo<DataTableColumn<KeyedRow>[]>(
    () => [
      {
        id: 'action',
        label: 'Action',
        width: 90,
        render: (row) => (
          <Badge appearance="tint" size="small" color={ACTION_COLORS[row.action]}>
            {row.action}
          </Badge>
        ),
        sortValue: (row) => row.action,
      },
      {
        id: 'id',
        label: 'Id',
        width: 290,
        render: (row) => <span className={styles.mono}>{row.id ?? '—'}</span>,
        sortValue: (row) => row.id,
      },
      {
        id: 'name',
        label: 'Name',
        width: 220,
        render: (row) => (nameAttribute ? cellText(row.row[nameAttribute]) : '—'),
        sortValue: (row) => (nameAttribute ? cellText(row.row[nameAttribute]) : ''),
      },
      {
        id: 'reason',
        label: 'Note',
        width: 260,
        render: (row) => row.reason ?? '',
        sortValue: (row) => row.reason,
      },
    ],
    [nameAttribute, styles],
  )

  return (
    <FormStack>
      <div className={styles.options}>
        <Checkbox
          label="Create records missing in the target"
          checked={options.create}
          onChange={(_, data) => setOptions({ ...options, create: data.checked === true })}
        />
        <Checkbox
          label="Update records that exist in both"
          checked={options.update}
          onChange={(_, data) => setOptions({ ...options, update: data.checked === true })}
        />
        <Checkbox
          label="Delete target records missing from the source"
          checked={options.deleteMissing}
          onChange={(_, data) => setOptions({ ...options, deleteMissing: data.checked === true })}
        />
      </div>
      {options.deleteMissing ? (
        <MessageBar intent="warning">
          <MessageBarBody>
            Delete runs the same query against the target and removes every record it returns that is not in the source
            result. Check the filter before running.
          </MessageBarBody>
        </MessageBar>
      ) : null}
      {metadata.isLoading || entities.isLoading ? (
        <Spinner size="small" label="Loading target metadata..." labelPosition="after" />
      ) : null}
      {metadata.isError ? <Text size={200}>{metadata.error.message}</Text> : null}
      {entities.isError ? <Text size={200}>{entities.error.message}</Text> : null}
      {metadata.data ? <FieldSelector fields={fields} selected={selected} onChange={setSelectedFields} /> : null}
      <FormRow>
        <Grow>
          <Text size={200} className={styles.hint}>
            {plan
              ? `${plan.counts.create} create · ${plan.counts.update} update · ${plan.counts.skip} skip · ${plan.counts.delete} delete`
              : 'Compare the source rows with the target to see what would change.'}
          </Text>
        </Grow>
        <Button
          appearance="primary"
          icon={<ArrowSwap20Regular />}
          disabled={compare.running || !metadata.data || !targetOps || selected.size === 0}
          onClick={() => void runCompare()}
        >
          {compare.running ? 'Comparing...' : 'Compare with target'}
        </Button>
        <Button icon={<ArrowRight20Regular />} disabled={!plan} onClick={() => setStep('run')}>
          Continue to run
        </Button>
      </FormRow>
      {plan ? (
        <div className={styles.split}>
          <DataTable
            items={items}
            columns={planColumns}
            getRowId={(row) => row.key}
            pageSize={100}
            maxHeight="calc(100vh - 620px)"
            autoFitColumns={false}
            onRowClick={(row) => setPreviewKey(row.key)}
            rowClassName={(row) => (row.key === previewKey ? styles.activeRow : undefined)}
            emptyMessage="The source returned no rows"
          />
          <div className={styles.preview}>
            {preview && previewRow ? (
              <>
                <Text weight="semibold">Payload for {previewRow.action}</Text>
                <CodeBlock value={JSON.stringify(preview.payload, null, 2)} language="json" height="220px" />
                {preview.skipped.length > 0 ? (
                  <Text size={200} className={styles.hint}>
                    Skipped: {preview.skipped.map((skip) => `${skip.field} (${skip.reason})`).join(', ')}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text size={200} className={styles.hint}>
                Select a create or update row to preview the payload that will be sent.
              </Text>
            )}
          </div>
        </div>
      ) : null}
    </FormStack>
  )
}
