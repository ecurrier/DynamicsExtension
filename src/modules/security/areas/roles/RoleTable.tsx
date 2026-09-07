import { Input, makeStyles, type TableRowId, tokens } from '@fluentui/react-components'
import { Filter20Regular } from '@fluentui/react-icons'
import { useMemo, useState } from 'react'

import { DataTable, type DataTableColumn } from '@/shared/components'
import { type SecurityRole } from '@/shared/types'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: 0,
  },
  adding: {
    backgroundColor: tokens.colorPaletteGreenBackground1,
  },
  removing: {
    backgroundColor: tokens.colorPaletteRedBackground1,
  },
})

interface RoleTableProps {
  roles: SecurityRole[]
  assignedIds: Set<string>
  stagedIds: Set<string>
  enabled: boolean
  onStagedChange: (roleIds: string[]) => void
}

export const RoleTable = ({ roles, assignedIds, stagedIds, enabled, onStagedChange }: RoleTableProps) => {
  const styles = useStyles()
  const [filter, setFilter] = useState('')
  const filtered = useMemo(() => {
    const term = filter.trim().toLowerCase()
    return term ? roles.filter((role) => role.name.toLowerCase().includes(term)) : roles
  }, [filter, roles])

  const columns = useMemo<DataTableColumn<SecurityRole>[]>(
    () => [
      { id: 'name', label: 'Security Role', render: (role) => role.name, sortValue: (role) => role.name, width: 320 },
    ],
    [],
  )

  const onSelectionChange = (selected: Set<TableRowId>) => {
    const visibleIds = new Set(filtered.map((role) => role.id))
    const hidden = [...stagedIds].filter((id) => !visibleIds.has(id))
    onStagedChange([...hidden, ...[...selected].map(String)])
  }

  return (
    <div className={styles.root}>
      <Input
        contentBefore={<Filter20Regular />}
        placeholder="Filter roles..."
        value={filter}
        onChange={(_, data) => setFilter(data.value)}
        size="small"
      />
      <DataTable
        items={filtered}
        columns={columns}
        getRowId={(role) => role.id}
        selectionMode={enabled ? 'multiselect' : undefined}
        selectedIds={stagedIds}
        onSelectionChange={onSelectionChange}
        maxHeight="300px"
        emptyMessage="No security roles found for this business unit"
        rowClassName={(role) => {
          const assigned = assignedIds.has(role.id)
          const staged = stagedIds.has(role.id)
          if (staged && !assigned) {
            return styles.adding
          }
          if (assigned && !staged) {
            return styles.removing
          }
          return undefined
        }}
      />
    </div>
  )
}
