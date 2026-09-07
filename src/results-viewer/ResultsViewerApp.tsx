import { Input, makeStyles, Text, Title3, tokens } from '@fluentui/react-components'
import { Search20Regular } from '@fluentui/react-icons'
import { useMemo, useState } from 'react'

import { cellText, rowMatches } from '@/modules/webapi/lib'
import { DataTable, type DataTableColumn, EmptyState } from '@/shared/components'
import { resultsShareItem, useStorageItem } from '@/shared/storage'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '24px',
    height: '100%',
    boxSizing: 'border-box',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  grow: {
    flex: 1,
  },
})

type Row = Record<string, unknown>

export const ResultsViewerApp = () => {
  const styles = useStyles()
  const share = useStorageItem(resultsShareItem)
  const [filter, setFilter] = useState('')

  const rows = useMemo(() => share.data?.rows ?? [], [share.data])
  const columns = useMemo(() => share.data?.columns ?? [], [share.data])
  const filtered = useMemo(() => rows.filter((row) => rowMatches(row, columns, filter)), [rows, columns, filter])
  const tableColumns = useMemo<DataTableColumn<Row>[]>(
    () =>
      columns.map((column) => ({
        id: column,
        label: column,
        render: (row) => cellText(row[column]),
        sortValue: (row) => cellText(row[column]),
      })),
    [columns],
  )

  if (share.isLoading) {
    return null
  }
  if (!share.data) {
    return (
      <EmptyState title="No results to show">
        Run a Fetch XML query from the Power Tools popup, then open the viewer.
      </EmptyState>
    )
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Title3>Results: {share.data.entityName}</Title3>
        <Text size={200}>
          {rows.length} total record{rows.length === 1 ? '' : 's'}
          {filtered.length !== rows.length ? ` (showing ${filtered.length})` : ''}
          {share.data.truncated ? ' (truncated)' : ''}
        </Text>
        <div className={styles.grow} />
        <Input
          contentBefore={<Search20Regular />}
          placeholder="Filter results..."
          value={filter}
          onChange={(_, data) => setFilter(data.value)}
          style={{ minWidth: '280px' }}
        />
      </div>
      <DataTable
        items={filtered}
        columns={tableColumns}
        pageSize={100}
        maxHeight="calc(100vh - 140px)"
        emptyMessage="No records match the filter"
      />
    </div>
  )
}
