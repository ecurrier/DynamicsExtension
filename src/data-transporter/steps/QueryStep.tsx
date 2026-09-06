import { Button, Combobox, Dropdown, Field, makeStyles, Option, Text, tokens } from '@fluentui/react-components'
import { ArrowRight20Regular, ArrowReset20Regular, Play20Regular, Stop20Regular } from '@fluentui/react-icons'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useRef, useState } from 'react'

import { cellText, columnsFromRows } from '@/modules/webapi/lib'
import { CodeEditor, DataTable, type DataTableColumn, FormRow, FormStack, Grow, useAppToast } from '@/shared/components'
import { useAsyncAction } from '@/shared/hooks'
import { formatXml } from '@/shared/lib'
import { type Environment } from '@/shared/storage'
import { type TransportRow } from '@/shared/types'

import { useSourceGateway } from '../hooks'
import { retrieveAllRows } from '../lib'
import { MAX_ROW_OPTIONS, useTransporterStore } from '../store'

const PAGE_SIZE = 1000
const ENTITY_OPTION_LIMIT = 100
const PREVIEW_COLUMN_LIMIT = 12

const useStyles = makeStyles({
  hint: {
    color: tokens.colorNeutralForeground3,
  },
  logical: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    marginLeft: '6px',
  },
})

interface QueryStepProps {
  target: Environment | null
}

export const QueryStep = ({ target }: QueryStepProps) => {
  const styles = useStyles()
  const toast = useAppToast()
  const {
    source,
    entity,
    viewId,
    fetchXml,
    maxRows,
    sourceRows,
    sourceTruncated,
    setEntity,
    setView,
    setFetchXml,
    setMaxRows,
    setSourceRows,
    setStep,
  } = useTransporterStore()
  const gateway = useSourceGateway(source)
  const [entityFilter, setEntityFilter] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const retrieve = useAsyncAction('Could not retrieve records')

  const entities = useQuery({
    queryKey: gateway.key('listEntities'),
    queryFn: () => gateway.ops.listEntities(),
    enabled: gateway.ready,
    staleTime: Infinity,
    retry: false,
  })
  const entityLogicalName = entity?.logicalName ?? ''
  const views = useQuery({
    queryKey: gateway.key('listViews', { entityLogicalName }),
    queryFn: () => gateway.ops.listViews({ entityLogicalName }),
    enabled: gateway.ready && entity !== null,
    staleTime: Infinity,
    retry: false,
  })

  const entityOptions = useMemo(() => {
    const term = entityFilter.trim().toLowerCase()
    const all = entities.data ?? []
    const matching = term
      ? all.filter(
          (candidate) => candidate.displayName.toLowerCase().includes(term) || candidate.logicalName.includes(term),
        )
      : all
    return matching.slice(0, ENTITY_OPTION_LIMIT)
  }, [entities.data, entityFilter])
  const selectedView = views.data?.find((view) => view.id === viewId) ?? null
  const previewColumns = useMemo(
    () =>
      columnsFromRows(sourceRows)
        .filter((column) => !column.includes('@'))
        .slice(0, PREVIEW_COLUMN_LIMIT),
    [sourceRows],
  )
  const tableColumns = useMemo<DataTableColumn<TransportRow>[]>(
    () =>
      previewColumns.map((column) => ({
        id: column,
        label: column,
        width: 160,
        render: (row) => cellText(row[column]),
        sortValue: (row) => cellText(row[column]),
      })),
    [previewColumns],
  )

  const run = () =>
    retrieve.run(async () => {
      if (!entity) {
        throw new Error('Choose an entity first')
      }
      if (!fetchXml.trim()) {
        throw new Error('Choose a view or enter FetchXML')
      }
      const controller = new AbortController()
      abortRef.current = controller
      setProgress(0)
      try {
        const result = await retrieveAllRows(
          (request) => gateway.ops.retrievePage(request),
          { entitySetName: entity.entitySetName, fetchXml, maxRows, pageSize: PAGE_SIZE },
          setProgress,
          controller.signal,
        )
        setSourceRows(result.rows, result.truncated)
        toast.success(
          `Retrieved ${result.rows.length} record${result.rows.length === 1 ? '' : 's'}`,
          result.truncated ? `Stopped at the ${maxRows} row limit` : undefined,
        )
      } finally {
        abortRef.current = null
        setProgress(null)
      }
    })

  const statusText =
    progress !== null
      ? `Retrieving... ${progress} rows so far`
      : sourceRows.length > 0
        ? `${sourceRows.length} row${sourceRows.length === 1 ? '' : 's'} loaded${sourceTruncated ? ' (row limit reached)' : ''}`
        : 'No rows loaded yet'

  return (
    <FormStack>
      <FormRow>
        <Grow>
          <Field label="Entity">
            <Combobox
              freeform
              placeholder={entities.isLoading ? 'Loading entities...' : 'Search entities by name...'}
              value={entityFilter || (entity ? `${entity.displayName} (${entity.logicalName})` : '')}
              selectedOptions={entity ? [entity.logicalName] : []}
              onChange={(event) => setEntityFilter(event.target.value)}
              onOptionSelect={(_, data) => {
                const found = entities.data?.find((candidate) => candidate.logicalName === data.optionValue)
                if (found) {
                  setEntity(found)
                  setEntityFilter('')
                }
              }}
            >
              {entityOptions.map((candidate) => (
                <Option
                  key={candidate.logicalName}
                  value={candidate.logicalName}
                  text={`${candidate.displayName} (${candidate.logicalName})`}
                >
                  {candidate.displayName}
                  <span className={styles.logical}>{candidate.logicalName}</span>
                </Option>
              ))}
            </Combobox>
          </Field>
        </Grow>
        <Field label="View">
          <Dropdown
            style={{ minWidth: '240px' }}
            placeholder={views.isLoading ? 'Loading views...' : 'Pick a view...'}
            disabled={!entity}
            value={selectedView?.name ?? ''}
            selectedOptions={viewId ? [viewId] : []}
            onOptionSelect={(_, data) => {
              const view = views.data?.find((candidate) => candidate.id === data.optionValue)
              if (view) {
                setView(view.id, formatXml(view.fetchXml))
              }
            }}
          >
            {(views.data ?? []).map((view) => (
              <Option key={view.id} value={view.id} text={view.name}>
                {view.name}
              </Option>
            ))}
          </Dropdown>
        </Field>
        <Field label="Max rows">
          <Dropdown
            style={{ minWidth: '110px' }}
            value={String(maxRows)}
            selectedOptions={[String(maxRows)]}
            onOptionSelect={(_, data) => data.optionValue && setMaxRows(Number(data.optionValue))}
          >
            {MAX_ROW_OPTIONS.map((option) => (
              <Option key={option} value={String(option)} text={String(option)}>
                {option}
              </Option>
            ))}
          </Dropdown>
        </Field>
      </FormRow>
      {entities.isError ? <Text size={200}>{entities.error.message}</Text> : null}
      <Field label="FetchXML">
        <CodeEditor
          value={fetchXml}
          language="xml"
          height="220px"
          placeholder="Pick a view or paste FetchXML for the chosen entity..."
          onChange={setFetchXml}
        />
      </Field>
      <FormRow>
        <Button
          icon={<ArrowReset20Regular />}
          disabled={!selectedView}
          onClick={() => selectedView && setView(selectedView.id, formatXml(selectedView.fetchXml))}
        >
          Reset to view
        </Button>
        <Grow>
          <Text size={200} className={styles.hint}>
            {statusText}
          </Text>
        </Grow>
        {retrieve.running ? (
          <Button icon={<Stop20Regular />} onClick={() => abortRef.current?.abort()}>
            Cancel
          </Button>
        ) : null}
        <Button
          appearance="primary"
          icon={<Play20Regular />}
          disabled={retrieve.running || !entity || !fetchXml.trim()}
          onClick={() => void run()}
        >
          Retrieve from source
        </Button>
        <Button
          icon={<ArrowRight20Regular />}
          disabled={sourceRows.length === 0 || !target || retrieve.running}
          onClick={() => setStep('plan')}
        >
          Continue to plan
        </Button>
      </FormRow>
      {sourceRows.length > 0 ? (
        <DataTable
          items={sourceRows}
          columns={tableColumns}
          pageSize={50}
          maxHeight="calc(100vh - 560px)"
          autoFitColumns={false}
          emptyMessage="No rows"
        />
      ) : null}
    </FormStack>
  )
}
