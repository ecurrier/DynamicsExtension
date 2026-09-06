import { Badge, Button, Field, Input, makeStyles, Text, tokens, Tooltip } from '@fluentui/react-components'
import { History20Regular, TargetArrow20Regular } from '@fluentui/react-icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import {
  AreaContainer,
  DataTable,
  type DataTableColumn,
  EmptyState,
  FormRow,
  FormStack,
  Grow,
  PageRequirementGate,
} from '@/shared/components'
import { isGuid } from '@/shared/lib'
import { type AuditChange, type AuditConfiguration, type AuditEntry } from '@/shared/types'

import { InvestigateConnection, TablePicker } from '../../components'
import { useInvestigateGateway, usePageTarget } from '../../hooks'
import { useInvestigateStore } from '../../store'

const useStyles = makeStyles({
  caption: {
    color: tokens.colorNeutralForeground3,
  },
  mono: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
  },
  activeRow: {
    outline: `2px solid ${tokens.colorBrandStroke1}`,
    outlineOffset: '-2px',
  },
  split: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    gap: '12px',
    alignItems: 'start',
  },
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: 0,
  },
})

const auditWarning = (configuration: AuditConfiguration): string | null => {
  if (!configuration.organizationEnabled) {
    return 'Auditing is switched off for the whole environment, so no history is being recorded anywhere.'
  }
  if (!configuration.tableEnabled) {
    return 'Auditing is switched off for this table, so changes to its records are not recorded.'
  }
  if (configuration.auditedColumns === 0) {
    return 'The table is audited but no columns have auditing enabled, so column changes are not recorded.'
  }
  return null
}

export const HistoryArea = () => {
  const styles = useStyles()
  const connection = useInvestigateStore((state) => state.connection)
  const table = useInvestigateStore((state) => state.table)
  const recordId = useInvestigateStore((state) => state.recordId)
  const setRecordId = useInvestigateStore((state) => state.setRecordId)
  const gateway = useInvestigateGateway(connection)
  const pageTarget = usePageTarget()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const enabled = gateway.ready && table.trim().length > 0 && isGuid(recordId.trim())

  const history = useQuery({
    queryKey: gateway.key('getRecordHistory', { entityLogicalName: table, recordId }),
    queryFn: () => gateway.ops.getRecordHistory({ entityLogicalName: table, recordId }),
    enabled,
    staleTime: 30_000,
    retry: false,
  })

  const detail = useMutation({
    mutationFn: (auditId: string) => gateway.ops.getAuditDetail({ auditId }),
  })

  const entries = useMemo(() => history.data?.entries ?? [], [history.data])
  const pageRecord = pageTarget.data?.recordId ?? null
  const warning = history.data ? auditWarning(history.data.configuration) : null

  const columns = useMemo<DataTableColumn<AuditEntry>[]>(
    () => [
      {
        id: 'when',
        label: 'When',
        width: 130,
        render: (entry) => (entry.createdOn ? new Date(entry.createdOn).toLocaleString() : '—'),
        sortValue: (entry) => entry.createdOn,
      },
      {
        id: 'who',
        label: 'Changed by',
        width: 120,
        render: (entry) => entry.userName ?? '—',
        sortValue: (entry) => entry.userName,
      },
      {
        id: 'action',
        label: 'Event',
        width: 110,
        render: (entry) => (
          <Badge appearance="tint" size="small">
            {entry.actionLabel}
          </Badge>
        ),
        sortValue: (entry) => entry.actionLabel,
      },
    ],
    [],
  )

  const changeColumns = useMemo<DataTableColumn<AuditChange>[]>(
    () => [
      {
        id: 'attribute',
        label: 'Column',
        width: 120,
        render: (change) => <span className={styles.mono}>{change.attribute}</span>,
        sortValue: (change) => change.attribute,
      },
      {
        id: 'old',
        label: 'Old value',
        width: 130,
        render: (change) => <span title={change.oldValue ?? undefined}>{change.oldValue ?? '—'}</span>,
        sortValue: (change) => change.oldValue,
      },
      {
        id: 'new',
        label: 'New value',
        width: 130,
        render: (change) => <span title={change.newValue ?? undefined}>{change.newValue ?? '—'}</span>,
        sortValue: (change) => change.newValue,
      },
    ],
    [styles],
  )

  const body = (
    <FormStack>
      <TablePicker />
      <FormRow>
        <Grow>
          <Field label="Record id" required>
            <Input
              value={recordId}
              placeholder="00000000-0000-0000-0000-000000000000"
              onChange={(_, data) => setRecordId(data.value)}
            />
          </Field>
        </Grow>
        {pageRecord ? (
          <Tooltip content="Use the record open on the current page" relationship="label">
            <Button
              icon={<TargetArrow20Regular />}
              disabled={recordId === pageRecord}
              aria-label="Use the record from the current page"
              onClick={() => setRecordId(pageRecord)}
            />
          </Tooltip>
        ) : null}
        <Button
          icon={<History20Regular />}
          disabled={!enabled || history.isFetching}
          onClick={() => void history.refetch()}
        >
          {history.isFetching ? 'Loading...' : 'Reload'}
        </Button>
      </FormRow>
      {!enabled ? (
        <EmptyState intent="info" title="Choose a table and paste a record id to read its audit history." />
      ) : null}
      {history.isError ? <EmptyState intent="error" title={history.error.message} /> : null}
      {history.data?.unavailable ? <EmptyState intent="error" title={history.data.unavailable} /> : null}
      {warning ? <EmptyState intent="warning" title={warning} /> : null}
      {history.data ? (
        <>
          <div className={styles.split}>
            <div className={styles.panel}>
              <Text size={300} weight="semibold">
                Events
              </Text>
              <DataTable
                items={entries}
                columns={columns}
                getRowId={(entry) => entry.id}
                maxHeight="300px"
                onRowClick={(entry) => {
                  setSelectedId(entry.id)
                  detail.mutate(entry.id)
                }}
                rowClassName={(entry) => (entry.id === selectedId ? styles.activeRow : undefined)}
                emptyMessage={history.isFetching ? 'Loading...' : 'No audit rows exist for this record'}
              />
            </div>
            <div className={styles.panel}>
              <Text size={300} weight="semibold">
                {detail.data && selectedId ? detail.data.detailType : 'Change detail'}
              </Text>
              {selectedId ? (
                detail.isPending ? (
                  <Text size={200}>Loading change detail...</Text>
                ) : detail.isError ? (
                  <EmptyState intent="error" title={detail.error.message} />
                ) : detail.data ? (
                  <>
                    {detail.data.note ? (
                      <Text size={200} className={styles.caption}>
                        {detail.data.note}
                      </Text>
                    ) : null}
                    {detail.data.changes.length > 0 ? (
                      <DataTable
                        items={detail.data.changes}
                        columns={changeColumns}
                        getRowId={(change) => change.attribute}
                        maxHeight="300px"
                      />
                    ) : null}
                  </>
                ) : null
              ) : (
                <Text size={200} className={styles.caption}>
                  Select an event to see which columns changed.
                </Text>
              )}
            </div>
          </div>
          <Text size={200} className={styles.caption}>
            {`${entries.length} event${entries.length === 1 ? '' : 's'}${history.data.truncated ? ' (truncated)' : ''} · ` +
              `${history.data.configuration.auditedColumns} of ${history.data.configuration.totalColumns} columns audited` +
              (history.data.configuration.unauditedLookups.length > 0
                ? ` · ${history.data.configuration.unauditedLookups.length} lookup column(s) are not audited`
                : '')}
          </Text>
        </>
      ) : null}
    </FormStack>
  )

  return (
    <AreaContainer>
      <InvestigateConnection />
      {gateway.mode === 'page' ? <PageRequirementGate requires="model-driven-app">{body}</PageRequirementGate> : body}
    </AreaContainer>
  )
}
