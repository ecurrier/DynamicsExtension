import { Badge, Button, makeStyles, ProgressBar, Text, tokens } from '@fluentui/react-components'
import { ArrowLeft20Regular, Play20Regular, Stop20Regular } from '@fluentui/react-icons'
import { useMemo, useRef } from 'react'

import { cellText } from '@/modules/webapi/lib'
import {
  CopyButton,
  DataTable,
  type DataTableColumn,
  FormRow,
  FormStack,
  Grow,
  useAppToast,
  useConfirm,
} from '@/shared/components'
import { type Environment } from '@/shared/storage'

import { useTargetMetadata } from '../hooks'
import {
  buildTransportPayload,
  formatFailures,
  type PayloadContext,
  type RunItem,
  type RunItemResult,
  runWithConcurrency,
  summarize,
} from '../lib'
import { useTransporterStore } from '../store'

const CONCURRENCY = 4
const STATUS_COLORS: Record<RunItemResult['status'], 'success' | 'danger' | 'warning'> = {
  success: 'success',
  failed: 'danger',
  cancelled: 'warning',
}
const ACTION_COLORS: Record<RunItem['action'], 'success' | 'brand' | 'danger'> = {
  create: 'success',
  update: 'brand',
  delete: 'danger',
}

const useStyles = makeStyles({
  hint: {
    color: tokens.colorNeutralForeground3,
  },
  mono: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
  },
})

interface RunStepProps {
  target: Environment | null
}

export const RunStep = ({ target }: RunStepProps) => {
  const styles = useStyles()
  const toast = useAppToast()
  const confirm = useConfirm()
  const {
    entity,
    plan,
    selectedFields,
    results,
    progress,
    running,
    startRun,
    recordResult,
    finishRun,
    setPlan,
    setStep,
  } = useTransporterStore()
  const { targetOps, metadata, entitySets } = useTargetMetadata(target, entity?.logicalName ?? null)
  const abortRef = useRef<AbortController | null>(null)
  const nameAttribute = metadata.data?.info.primaryNameAttribute ?? null

  const items = useMemo<RunItem[]>(() => {
    if (!plan || !metadata.data) {
      return []
    }
    const context: PayloadContext = {
      attributes: metadata.data.attributes,
      selected: selectedFields ?? new Set<string>(),
      entitySets,
      primaryIdAttribute: metadata.data.info.primaryIdAttribute,
    }
    const label = (row: Record<string, unknown>) => (nameAttribute ? cellText(row[nameAttribute]) : '')
    const writes = plan.rows.flatMap((row): RunItem[] =>
      row.id && row.action !== 'skip'
        ? [
            {
              id: row.id,
              action: row.action,
              label: label(row.row),
              payload: buildTransportPayload(row.row, row.id, context, row.action).payload,
            },
          ]
        : [],
    )
    const creates = writes.filter((item) => item.action === 'create')
    const updates = writes.filter((item) => item.action === 'update')
    const deletes = plan.deletes.map((id): RunItem => ({ id, action: 'delete', label: '' }))
    return [...creates, ...updates, ...deletes]
  }, [plan, metadata.data, selectedFields, entitySets, nameAttribute])

  const start = async () => {
    if (!plan || !targetOps || !metadata.data || !target) {
      return
    }
    const counts = plan.counts
    const confirmed = await confirm({
      title: `Run against ${target.name}?`,
      content: (
        <>
          <p>
            {counts.create} record{counts.create === 1 ? '' : 's'} will be created, {counts.update} updated, and{' '}
            {counts.delete} deleted in <strong>{target.name}</strong>.
          </p>
          <p>
            <strong>Updates and deletes cannot be undone.</strong>
          </p>
        </>
      ),
      confirmLabel: 'Run',
    })
    if (!confirmed) {
      return
    }
    const controller = new AbortController()
    abortRef.current = controller
    const entitySetName = metadata.data.info.entitySetName
    startRun(items.length)
    try {
      const ops = await targetOps()
      const outcome = await runWithConcurrency(
        items,
        async (item) => {
          if (item.action === 'create') {
            await ops.create({ entitySetName, payload: item.payload ?? {} })
          } else if (item.action === 'update') {
            await ops.update({ entitySetName, id: item.id, payload: item.payload ?? {} })
          } else {
            await ops.remove({ entitySetName, id: item.id })
          }
        },
        { concurrency: CONCURRENCY, signal: controller.signal, onResult: recordResult },
      )
      const summary = summarize(outcome)
      if (summary.failed > 0) {
        toast.error(`${summary.failed} of ${summary.total} failed`, 'Copy the failures below to review them')
      } else if (summary.cancelled > 0) {
        toast.info('Run cancelled', `${summary.succeeded} done, ${summary.cancelled} not started`)
      } else {
        toast.success(
          'Run complete',
          `${summary.succeeded} record${summary.succeeded === 1 ? '' : 's'} written to ${target.name}`,
        )
      }
    } catch (error) {
      toast.error('The run stopped unexpectedly', error)
    } finally {
      finishRun()
      abortRef.current = null
    }
  }

  const columns = useMemo<DataTableColumn<RunItemResult>[]>(
    () => [
      {
        id: 'action',
        label: 'Action',
        width: 90,
        render: (result) => (
          <Badge appearance="tint" size="small" color={ACTION_COLORS[result.action]}>
            {result.action}
          </Badge>
        ),
        sortValue: (result) => result.action,
      },
      {
        id: 'status',
        label: 'Status',
        width: 100,
        render: (result) => (
          <Badge appearance="tint" size="small" color={STATUS_COLORS[result.status]}>
            {result.status}
          </Badge>
        ),
        sortValue: (result) => result.status,
      },
      {
        id: 'id',
        label: 'Id',
        width: 290,
        render: (result) => <span className={styles.mono}>{result.id}</span>,
        sortValue: (result) => result.id,
      },
      { id: 'label', label: 'Name', width: 200, render: (result) => result.label, sortValue: (result) => result.label },
      {
        id: 'message',
        label: 'Message',
        width: 360,
        render: (result) => <span title={result.message}>{result.message}</span>,
        sortValue: (result) => result.message,
      },
    ],
    [styles],
  )

  const summary = summarize(results)
  const failures = formatFailures(results)
  const finished = !running && results.length > 0

  return (
    <FormStack>
      <FormRow>
        <Grow>
          <Text size={200} className={styles.hint}>
            {plan
              ? `${items.length} operation${items.length === 1 ? '' : 's'} queued for ${target?.name ?? 'the target'}: ${plan.counts.create} create, ${plan.counts.update} update, ${plan.counts.delete} delete`
              : 'Build a plan first.'}
          </Text>
        </Grow>
        <Button
          icon={<ArrowLeft20Regular />}
          disabled={running}
          onClick={() => {
            setPlan(null)
            setStep('plan')
          }}
        >
          Back to plan
        </Button>
        {running ? (
          <Button icon={<Stop20Regular />} onClick={() => abortRef.current?.abort()}>
            Cancel
          </Button>
        ) : null}
        <Button
          appearance="primary"
          icon={<Play20Regular />}
          disabled={running || items.length === 0 || !targetOps || !metadata.data}
          onClick={() => void start()}
        >
          {running ? 'Running...' : finished ? 'Run again' : 'Run'}
        </Button>
      </FormRow>
      {progress ? (
        <>
          <ProgressBar value={progress.total === 0 ? 0 : progress.done / progress.total} />
          <Text size={200} className={styles.hint}>
            {progress.done} of {progress.total} done · {summary.succeeded} succeeded · {summary.failed} failed
            {summary.cancelled > 0 ? ` · ${summary.cancelled} cancelled` : ''}
          </Text>
        </>
      ) : null}
      {results.length > 0 ? (
        <>
          <FormRow>
            <Grow>
              <span />
            </Grow>
            <CopyButton
              text={failures}
              label="Copy failures"
              successMessage="Failures copied as tab-separated lines"
              disabled={!failures}
            />
          </FormRow>
          <DataTable
            items={results}
            columns={columns}
            getRowId={(result) => `${result.action}:${result.id}`}
            pageSize={100}
            maxHeight="calc(100vh - 360px)"
            autoFitColumns={false}
            emptyMessage="No results yet"
          />
        </>
      ) : null}
    </FormStack>
  )
}
