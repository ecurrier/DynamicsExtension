import { Combobox, Field, Option } from '@fluentui/react-components'
import { useMemo, useState } from 'react'

import { type AttributeDefinition } from '@/shared/types'

interface AttributePickerProps {
  attributes: AttributeDefinition[]
  selected: AttributeDefinition | null
  disabled?: boolean
  onSelect: (attribute: AttributeDefinition | null) => void
}

const optionText = (attribute: AttributeDefinition): string => `${attribute.displayName} (${attribute.logicalName})`

export const AttributePicker = ({ attributes, selected, disabled, onSelect }: AttributePickerProps) => {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return term ? attributes.filter((attribute) => optionText(attribute).toLowerCase().includes(term)) : attributes
  }, [attributes, query])

  return (
    <Field label="Field">
      <Combobox
        placeholder="Select a field to update..."
        disabled={disabled}
        value={selected ? optionText(selected) : query}
        selectedOptions={selected ? [selected.logicalName] : []}
        onInput={(event) => {
          setQuery((event.target as HTMLInputElement).value)
          if (selected) {
            onSelect(null)
          }
        }}
        onOptionSelect={(_, data) => {
          const attribute = attributes.find((candidate) => candidate.logicalName === data.optionValue) ?? null
          setQuery('')
          onSelect(attribute)
        }}
        onOpenChange={(_, data) => {
          if (!data.open && !selected) {
            setQuery('')
          }
        }}
      >
        {filtered.slice(0, 200).map((attribute) => (
          <Option key={attribute.logicalName} value={attribute.logicalName} text={optionText(attribute)}>
            {optionText(attribute)}
          </Option>
        ))}
      </Combobox>
    </Field>
  )
}
