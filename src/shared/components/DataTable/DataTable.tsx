import {
  Button,
  createTableColumn,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  makeStyles,
  type SortDirection,
  type TableColumnDefinition,
  type TableRowId,
  Text,
  tokens,
} from '@fluentui/react-components'
import { ChevronLeft20Regular, ChevronRight20Regular } from '@fluentui/react-icons'
import { type ReactNode, useMemo, useState } from 'react'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minHeight: 0,
  },
  scroller: {
    overflow: 'auto',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  cell: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '260px',
  },
  pager: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '8px',
  },
})

export interface DataTableColumn<T> {
  id: string
  label: string
  render: (item: T) => ReactNode
  sortValue?: (item: T) => string | number | null | undefined
  width?: number
}

export interface DataTableProps<T> {
  items: T[]
  columns: DataTableColumn<T>[]
  getRowId?: (item: T) => TableRowId
  sortable?: boolean
  pageSize?: number
  maxHeight?: string
  autoFitColumns?: boolean
  selectionMode?: 'single' | 'multiselect'
  selectedIds?: Set<TableRowId>
  onSelectionChange?: (selected: Set<TableRowId>) => void
  emptyMessage?: string
  rowClassName?: (item: T) => string | undefined
  onRowClick?: (item: T) => void
}

interface IndexedRow<T> {
  id: TableRowId
  item: T
}

interface SortState {
  sortColumn: string | undefined
  sortDirection: SortDirection
}

const compareValues = (left: unknown, right: unknown): number => {
  if (left === right) {
    return 0
  }
  if (left === null || left === undefined) {
    return 1
  }
  if (right === null || right === undefined) {
    return -1
  }
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right
  }
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' })
}

export const DataTable = <T,>({
  items,
  columns,
  getRowId,
  sortable = true,
  pageSize,
  maxHeight = '320px',
  autoFitColumns = true,
  selectionMode,
  selectedIds,
  onSelectionChange,
  emptyMessage = 'No records',
  rowClassName,
  onRowClick,
}: DataTableProps<T>) => {
  const styles = useStyles()
  const [page, setPage] = useState(0)
  const [sortState, setSortState] = useState<SortState>({ sortColumn: undefined, sortDirection: 'ascending' })

  const indexed = useMemo<IndexedRow<T>[]>(
    () => items.map((item, index) => ({ id: getRowId ? getRowId(item) : index, item })),
    [items, getRowId],
  )

  const sorted = useMemo(() => {
    const column = columns.find((candidate) => candidate.id === sortState.sortColumn)
    if (!column) {
      return indexed
    }
    const direction = sortState.sortDirection === 'ascending' ? 1 : -1
    return [...indexed].sort(
      (left, right) => direction * compareValues(column.sortValue?.(left.item), column.sortValue?.(right.item)),
    )
  }, [columns, indexed, sortState])

  const pageCount = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1
  const currentPage = Math.min(page, pageCount - 1)
  const pageRows = useMemo(
    () => (pageSize ? sorted.slice(currentPage * pageSize, (currentPage + 1) * pageSize) : sorted),
    [currentPage, pageSize, sorted],
  )

  const gridColumns = useMemo<TableColumnDefinition<IndexedRow<T>>[]>(
    () =>
      columns.map((column) =>
        createTableColumn<IndexedRow<T>>({
          columnId: column.id,
          compare: () => 0,
          renderHeaderCell: () => column.label,
          renderCell: (row) => column.render(row.item),
        }),
      ),
    [columns],
  )

  const sizing = useMemo(
    () =>
      Object.fromEntries(
        columns.map((column) => [
          column.id,
          { minWidth: 80, defaultWidth: column.width ?? 160, idealWidth: column.width ?? 160 },
        ]),
      ),
    [columns],
  )

  if (items.length === 0) {
    return <Text size={200}>{emptyMessage}</Text>
  }

  return (
    <div className={styles.root}>
      <div className={styles.scroller} style={{ maxHeight }}>
        <DataGrid
          items={pageRows}
          columns={gridColumns}
          sortable={sortable}
          sortState={sortState}
          onSortChange={(_, next) =>
            setSortState({ sortColumn: next.sortColumn as string | undefined, sortDirection: next.sortDirection })
          }
          getRowId={(row) => row.id}
          resizableColumns
          columnSizingOptions={sizing}
          resizableColumnsOptions={{ autoFitColumns }}
          selectionMode={selectionMode}
          selectedItems={selectedIds}
          onSelectionChange={(_, data) => onSelectionChange?.(data.selectedItems)}
          size="small"
          focusMode="composite"
        >
          <DataGridHeader className={styles.header}>
            <DataGridRow
              selectionCell={
                selectionMode === 'multiselect' ? { checkboxIndicator: { 'aria-label': 'Select all rows' } } : undefined
              }
            >
              {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<IndexedRow<T>>>
            {({ item, rowId }) => (
              <DataGridRow<IndexedRow<T>>
                key={rowId}
                className={rowClassName?.(item.item)}
                style={onRowClick ? { cursor: 'pointer' } : undefined}
                selectionCell={selectionMode ? { checkboxIndicator: { 'aria-label': 'Select row' } } : undefined}
                onClick={onRowClick ? () => onRowClick(item.item) : undefined}
              >
                {({ renderCell }) => <DataGridCell className={styles.cell}>{renderCell(item)}</DataGridCell>}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      </div>
      {pageSize && pageCount > 1 ? (
        <div className={styles.pager}>
          <Text size={200}>
            Page {currentPage + 1} of {pageCount}
          </Text>
          <Button
            size="small"
            icon={<ChevronLeft20Regular />}
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
            aria-label="Previous page"
          />
          <Button
            size="small"
            icon={<ChevronRight20Regular />}
            disabled={currentPage >= pageCount - 1}
            onClick={() => setPage(currentPage + 1)}
            aria-label="Next page"
          />
        </div>
      ) : null}
    </div>
  )
}
