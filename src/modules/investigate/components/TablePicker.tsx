import { Button, Combobox, Field, Option, Tooltip } from '@fluentui/react-components'
import { TargetArrow20Regular } from '@fluentui/react-icons'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { FormRow, Grow } from '@/shared/components'
import { type EntitySummary } from '@/shared/types'

import { useInvestigateGateway, usePageTarget } from '../hooks'
import { useInvestigateStore } from '../store'

const MAX_OPTIONS = 60

interface TablePickerProps {
  label?: string
}

export const TablePicker = ({ label = 'Table' }: TablePickerProps) => {
  const connection = useInvestigateStore((state) => state.connection)
  const table = useInvestigateStore((state) => state.table)
  const setTable = useInvestigateStore((state) => state.setTable)
  const gateway = useInvestigateGateway(connection)
  const pageTarget = usePageTarget()
  const [query, setQuery] = useState('')

  const tables = useQuery({
    queryKey: gateway.key('listTables'),
    queryFn: () => gateway.ops.listTables(),
    enabled: gateway.ready,
    staleTime: 300_000,
    retry: false,
  })

  const options = useMemo<EntitySummary[]>(() => {
    const rows = tables.data ?? []
    const term = query.trim().toLowerCase()
    const matches = term
      ? rows.filter((row) => row.logicalName.includes(term) || row.displayName.toLowerCase().includes(term))
      : rows
    return matches.slice(0, MAX_OPTIONS)
  }, [tables.data, query])

  const pageTable = pageTarget.data?.entityLogicalName ?? null

  return (
    <FormRow>
      <Grow>
        <Field label={label}>
          <Combobox
            freeform
            value={query || table}
            selectedOptions={table ? [table] : []}
            placeholder={tables.isLoading ? 'Loading tables...' : 'account'}
            onOptionSelect={(_, data) => {
              if (data.optionValue) {
                setTable(data.optionValue)
                setQuery('')
              }
            }}
            onChange={(event) => setQuery(event.target.value)}
            onBlur={() => {
              const typed = query.trim().toLowerCase()
              if (typed) {
                setTable(typed)
                setQuery('')
              }
            }}
          >
            {options.map((option) => (
              <Option key={option.logicalName} value={option.logicalName} text={option.logicalName}>
                {`${option.displayName} (${option.logicalName})`}
              </Option>
            ))}
          </Combobox>
        </Field>
      </Grow>
      {pageTable ? (
        <Tooltip content={`Use the table on the current page (${pageTable})`} relationship="label">
          <Button
            icon={<TargetArrow20Regular />}
            disabled={table === pageTable}
            aria-label="Use the table from the current page"
            onClick={() => {
              setTable(pageTable)
              setQuery('')
            }}
          />
        </Tooltip>
      ) : null}
    </FormRow>
  )
}
