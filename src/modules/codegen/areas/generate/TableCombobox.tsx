import { Button, Combobox, Field, Option, Tooltip } from '@fluentui/react-components'
import { TargetArrow20Regular } from '@fluentui/react-icons'
import { useMemo, useState } from 'react'

import { usePageQuery } from '@/messaging/client'
import { FormRow, Grow } from '@/shared/components'
import { type EntitySummary } from '@/shared/types'

const MAX_OPTIONS = 60

interface TableComboboxProps {
  value: string | null
  pageTable: string | null
  onChange: (logicalName: string) => void
}

export const TableCombobox = ({ value, pageTable, onChange }: TableComboboxProps) => {
  const tables = usePageQuery('investigate.listTables', undefined)
  const [query, setQuery] = useState('')

  const options = useMemo<EntitySummary[]>(() => {
    const rows = tables.data ?? []
    const term = query.trim().toLowerCase()
    const matches = term
      ? rows.filter((row) => row.logicalName.includes(term) || row.displayName.toLowerCase().includes(term))
      : rows
    return matches.slice(0, MAX_OPTIONS)
  }, [tables.data, query])

  const pick = (logicalName: string) => {
    onChange(logicalName)
    setQuery('')
  }

  return (
    <FormRow>
      <Grow>
        <Field label="Table">
          <Combobox
            freeform
            value={query || (value ?? '')}
            selectedOptions={value ? [value] : []}
            placeholder={tables.isLoading ? 'Loading tables...' : 'account'}
            onOptionSelect={(_, data) => data.optionValue && pick(data.optionValue)}
            onChange={(event) => setQuery(event.target.value)}
            onBlur={() => {
              const typed = query.trim().toLowerCase()
              if (typed) {
                pick(typed)
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
            disabled={value === pageTable}
            aria-label="Use the table from the current page"
            onClick={() => pick(pageTable)}
          />
        </Tooltip>
      ) : null}
    </FormRow>
  )
}
