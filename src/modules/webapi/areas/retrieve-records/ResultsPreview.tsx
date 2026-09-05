import { Button, makeStyles, Text } from '@fluentui/react-components'
import { Open20Regular } from '@fluentui/react-icons'
import { useMemo } from 'react'

import { DataTable, type DataTableColumn, useAppToast } from '@/shared/components'
import { openExtensionPage } from '@/shared/extension'
import { resultsShareItem } from '@/shared/storage'

import { buildResultsShare, cellText, columnsFromRows, type ResultRow } from '../../lib'

const useStyles = makeStyles({
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
})

interface ResultsPreviewProps {
  entityName: string
  rows: ResultRow[]
}

export const ResultsPreview = ({ entityName, rows }: ResultsPreviewProps) => {
  const styles = useStyles()
  const toast = useAppToast()
  const columns = useMemo(() => columnsFromRows(rows), [rows])
  const tableColumns = useMemo<DataTableColumn<ResultRow>[]>(
    () =>
      columns.map((column) => ({
        id: column,
        label: column,
        render: (row) => cellText(row[column]),
        sortValue: (row) => cellText(row[column]),
      })),
    [columns],
  )

  const openViewer = async () => {
    try {
      const share = buildResultsShare(entityName, rows)
      await resultsShareItem.setValue(share)
      await openExtensionPage('/results-viewer.html')
      if (share.truncated) {
        toast.info('Results truncated', `The viewer shows the first ${share.rows.length} records.`)
      }
    } catch (error) {
      toast.error('Could not open the results viewer', error)
    }
  }

  return (
    <>
      <DataTable items={rows} columns={tableColumns} pageSize={50} maxHeight="260px" />
      <div className={styles.footer}>
        <Text size={200}>
          {rows.length} record{rows.length === 1 ? '' : 's'} retrieved
        </Text>
        <Button size="small" icon={<Open20Regular />} disabled={rows.length === 0} onClick={() => void openViewer()}>
          Open in viewer
        </Button>
      </div>
    </>
  )
}
