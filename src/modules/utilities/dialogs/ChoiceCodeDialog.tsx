import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Dropdown,
  Field,
  Option,
} from '@fluentui/react-components'
import { useMemo, useState } from 'react'

import { CodeBlock, CopyButton, FormRow, FormStack, Grow } from '@/shared/components'
import { type ChoiceMetadata } from '@/shared/types'

import { CHOICE_CODE_LANGUAGES, type ChoiceCodeLanguage, choiceLabel, generateChoiceCode } from '../lib'

interface ChoiceCodeDialogBodyProps {
  metadata: ChoiceMetadata
  onClose: () => void
}

const ChoiceCodeDialogBody = ({ metadata, onClose }: ChoiceCodeDialogBodyProps) => {
  const [selectedIndex, setSelectedIndex] = useState('')
  const [language, setLanguage] = useState<ChoiceCodeLanguage>('csharp')

  const selected = metadata.choices[Number(selectedIndex)]
  const code = useMemo(() => (selected ? generateChoiceCode(selected, language) : ''), [selected, language])
  const languageLabel = CHOICE_CODE_LANGUAGES.find((candidate) => candidate.value === language)?.label ?? ''

  return (
    <DialogBody>
      <DialogTitle>Generated Choice Code Snippets</DialogTitle>
      <DialogContent>
        <FormStack>
          <FormRow>
            <Grow>
              <Field label="Choice">
                <Dropdown
                  placeholder="Select a choice..."
                  value={selected ? choiceLabel(selected) : ''}
                  selectedOptions={selectedIndex ? [selectedIndex] : []}
                  onOptionSelect={(_, data) => data.optionValue && setSelectedIndex(data.optionValue)}
                >
                  {metadata.choices.map((choice, index) => (
                    <Option key={`${index}-${choice.name}`} value={String(index)} text={choiceLabel(choice)}>
                      {choiceLabel(choice)}
                    </Option>
                  ))}
                </Dropdown>
              </Field>
            </Grow>
            <Field label="Language">
              <Dropdown
                value={languageLabel}
                selectedOptions={[language]}
                onOptionSelect={(_, data) => data.optionValue && setLanguage(data.optionValue as ChoiceCodeLanguage)}
              >
                {CHOICE_CODE_LANGUAGES.map((candidate) => (
                  <Option key={candidate.value} value={candidate.value} text={candidate.label}>
                    {candidate.label}
                  </Option>
                ))}
              </Dropdown>
            </Field>
          </FormRow>
          <CodeBlock value={code} language={language} height="300px" placeholder="Select a choice to generate code" />
        </FormStack>
      </DialogContent>
      <DialogActions>
        <Button appearance="secondary" onClick={onClose}>
          Close
        </Button>
        <CopyButton text={code} label="Copy" successMessage="Code copied to clipboard" appearance="primary" />
      </DialogActions>
    </DialogBody>
  )
}

interface ChoiceCodeDialogProps {
  metadata: ChoiceMetadata | null
  onClose: () => void
}

export const ChoiceCodeDialog = ({ metadata, onClose }: ChoiceCodeDialogProps) => (
  <Dialog open={metadata !== null} onOpenChange={(_, data) => (data.open ? undefined : onClose())}>
    <DialogSurface style={{ maxWidth: '640px' }}>
      {metadata ? <ChoiceCodeDialogBody metadata={metadata} onClose={onClose} /> : null}
    </DialogSurface>
  </Dialog>
)
