import { Dropdown, Field, Option } from '@fluentui/react-components'

import { type ConnectionTarget, PAGE_CONNECTION } from '@/shared/connections'
import { type Environment } from '@/shared/storage'

import { InfoTip } from '../InfoTip'

const PAGE_OPTION = '__page__'

interface ConnectionPickerProps {
  value: ConnectionTarget
  environments: Environment[]
  disabled?: boolean
  onChange: (value: ConnectionTarget) => void
}

export const ConnectionPicker = ({ value, environments, disabled = false, onChange }: ConnectionPickerProps) => {
  const connectable = environments.filter((environment) => environment.credentials !== null)
  const selectedKey = value.kind === 'page' ? PAGE_OPTION : value.environmentId
  const selectedLabel =
    value.kind === 'page'
      ? 'Current page'
      : (connectable.find((environment) => environment.id === value.environmentId)?.name ?? 'Removed environment')

  return (
    <Field
      label={
        <>
          Connection
          <InfoTip content="Run against the page you have open, or against a saved environment that has a client id and secret configured in Settings" />
        </>
      }
    >
      <Dropdown
        value={selectedLabel}
        selectedOptions={[selectedKey]}
        disabled={disabled}
        onOptionSelect={(_, data) => {
          if (!data.optionValue) {
            return
          }
          onChange(
            data.optionValue === PAGE_OPTION
              ? PAGE_CONNECTION
              : { kind: 'environment', environmentId: data.optionValue },
          )
        }}
      >
        <Option value={PAGE_OPTION} text="Current page">
          Current page
        </Option>
        {connectable.map((environment) => (
          <Option key={environment.id} value={environment.id} text={environment.name}>
            {environment.name} (service principal)
          </Option>
        ))}
      </Dropdown>
    </Field>
  )
}
