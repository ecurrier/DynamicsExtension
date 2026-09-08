import { Button, Combobox, Field, makeStyles, Option, tokens } from '@fluentui/react-components'
import { Dismiss16Regular } from '@fluentui/react-icons'

const useStyles = makeStyles({
  root: {
    minWidth: 0,
  },
  input: {
    minWidth: 0,
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
    width: '100%',
    minWidth: 0,
  },
  text: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
})

interface SettingComboboxProps {
  label: string
  value: string
  history: string[]
  onChange: (value: string) => void
  onCommit: (value: string) => void
  onForget: (value: string) => void
}

export const SettingCombobox = ({ label, value, history, onChange, onCommit, onForget }: SettingComboboxProps) => {
  const styles = useStyles()
  return (
    <Field label={label}>
      <Combobox
        freeform
        className={styles.root}
        input={{ className: styles.input }}
        value={value}
        selectedOptions={history.includes(value) ? [value] : []}
        placeholder={history.length > 0 ? 'Type or pick a value' : 'Type a value'}
        onChange={(event) => onChange(event.target.value)}
        onOptionSelect={(_, data) => {
          if (data.optionValue !== undefined) {
            onChange(data.optionValue)
            onCommit(data.optionValue)
          }
        }}
        onBlur={() => onCommit(value)}
      >
        {history.map((entry) => (
          <Option key={entry} value={entry} text={entry}>
            <span className={styles.option}>
              <span className={styles.text}>{entry}</span>
              <Button
                appearance="subtle"
                size="small"
                icon={<Dismiss16Regular />}
                aria-label={`Remove ${entry} from the list`}
                title="Remove from the list"
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  onForget(entry)
                }}
              />
            </span>
          </Option>
        ))}
      </Combobox>
    </Field>
  )
}
