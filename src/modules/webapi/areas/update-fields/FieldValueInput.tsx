import { Dropdown, Field, Input, Option, Textarea } from '@fluentui/react-components'

import { RecordLookup, type RecordLookupServices } from '@/shared/components'
import { type AttributeDefinition } from '@/shared/types'

import { type FieldDraft, inputKindFor } from '../../lib'

interface FieldValueInputProps {
  definition: AttributeDefinition
  draft: FieldDraft
  validationMessage: string | null
  lookupServices: RecordLookupServices
  onChange: (draft: FieldDraft) => void
}

export const FieldValueInput = ({
  definition,
  draft,
  validationMessage,
  lookupServices,
  onChange,
}: FieldValueInputProps) => {
  const disabled = draft.clear
  const set = <K extends keyof FieldDraft>(key: K, value: FieldDraft[K]) => onChange({ ...draft, [key]: value })
  const message = validationMessage ?? undefined
  const optionLabel = (value: string) =>
    definition.options.find((option) => String(option.value) === value)?.label ?? ''

  switch (inputKindFor(definition.attributeType)) {
    case 'number':
      return (
        <Field label="Enter a number" validationMessage={message}>
          <Input
            type="number"
            value={draft.number}
            disabled={disabled}
            onChange={(_, data) => set('number', data.value)}
          />
        </Field>
      )
    case 'text':
      return (
        <Field label="Enter a value" validationMessage={message}>
          <Input value={draft.text} disabled={disabled} onChange={(_, data) => set('text', data.value)} />
        </Field>
      )
    case 'memo':
      return (
        <Field label="Enter a value" validationMessage={message}>
          <Textarea value={draft.text} rows={4} disabled={disabled} onChange={(_, data) => set('text', data.value)} />
        </Field>
      )
    case 'dateTime':
      return (
        <Field
          label={definition.dateTimeFormat === 'DateOnly' ? 'Enter a date' : 'Enter a date and time'}
          validationMessage={message}
        >
          <Input
            type={definition.dateTimeFormat === 'DateOnly' ? 'date' : 'datetime-local'}
            value={draft.date}
            disabled={disabled}
            onChange={(_, data) => set('date', data.value)}
          />
        </Field>
      )
    case 'lookup':
      return (
        <Field label="Select a record" validationMessage={message}>
          <RecordLookup
            targets={definition.targets}
            value={draft.lookup}
            disabled={disabled}
            onChange={(lookup) => set('lookup', lookup)}
            search={lookupServices.search}
            getEntityInfo={lookupServices.getEntityInfo}
          />
        </Field>
      )
    case 'choice':
    case 'boolean':
      return (
        <Field label="Choice" validationMessage={message}>
          <Dropdown
            placeholder="Select a choice..."
            value={optionLabel(draft.choice)}
            selectedOptions={draft.choice ? [draft.choice] : []}
            disabled={disabled || definition.options.length <= 1}
            onOptionSelect={(_, data) => data.optionValue && set('choice', data.optionValue)}
          >
            {definition.options.map((option) => (
              <Option key={option.value} value={String(option.value)} text={option.label}>
                {option.label}
              </Option>
            ))}
          </Dropdown>
        </Field>
      )
    case 'multiChoice':
      return (
        <Field label="Choices" validationMessage={message}>
          <Dropdown
            multiselect
            placeholder="Select choices..."
            value={draft.multiChoice.map(optionLabel).join(', ')}
            selectedOptions={draft.multiChoice}
            disabled={disabled}
            onOptionSelect={(_, data) => set('multiChoice', data.selectedOptions)}
          >
            {definition.options.map((option) => (
              <Option key={option.value} value={String(option.value)} text={option.label}>
                {option.label}
              </Option>
            ))}
          </Dropdown>
        </Field>
      )
  }
}
