import { Input, makeStyles, Text, Title3, tokens } from '@fluentui/react-components'
import { Search20Regular } from '@fluentui/react-icons'
import { useMemo, useState } from 'react'

import { cellText, rowMatches } from '@/modules/webapi/lib'
import { DataTable, type DataTableColumn } from '@/shared/components'
import { type ResultsShare } from '@/shared/types'

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

interface ResultsViewerProps {
  share: ResultsShare
}

export const ResultsViewer = ({ share }: ResultsViewerProps) => {
  const styles = useStyles()
  const [filter, setFilter] = useState('')

  const { rows, columns } = share
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

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Title3>Results: {share.entityName}</Title3>
        <Text size={200}>
          {rows.length} total record{rows.length === 1 ? '' : 's'}
          {filtered.length !== rows.length ? ` (showing ${filtered.length})` : ''}
          {share.truncated ? ' (truncated)' : ''}
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
        fill
        emptyMessage="No records match the filter"
      />
    </div>
  )
}
