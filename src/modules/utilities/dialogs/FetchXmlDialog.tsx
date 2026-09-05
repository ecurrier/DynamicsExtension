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
  Switch,
} from '@fluentui/react-components'
import { useMemo, useState } from 'react'

import { CodeBlock, CopyButton, FormRow, FormStack, Grow } from '@/shared/components'
import { formatXml, toggleQuotes } from '@/shared/lib'
import { type NamedFetchXml } from '@/shared/types'

interface FetchXmlDialogBodyProps {
  queries: NamedFetchXml[]
  onClose: () => void
  onRetrieveRecords: (fetchXml: string) => void
}

const FetchXmlDialogBody = ({ queries, onClose, onRetrieveRecords }: FetchXmlDialogBodyProps) => {
  const [selectedIndex, setSelectedIndex] = useState('0')
  const [doubleQuotes, setDoubleQuotes] = useState(true)

  const formatted = useMemo(
    () => queries.map((query) => ({ name: query.name, fetchXml: formatXml(query.fetchXml) })),
    [queries],
  )
  const selected = formatted[Number(selectedIndex)]
  const content = selected ? toggleQuotes(selected.fetchXml, doubleQuotes) : ''

  return (
    <DialogBody>
      <DialogTitle>Generated Fetch XML</DialogTitle>
      <DialogContent>
        <FormStack>
          <FormRow>
            <Grow>
              <Field label="Query">
                <Dropdown
                  value={selected?.name ?? ''}
                  selectedOptions={[selectedIndex]}
                  onOptionSelect={(_, data) => data.optionValue && setSelectedIndex(data.optionValue)}
                >
                  {formatted.map((query, index) => (
                    <Option key={`${index}-${query.name}`} value={String(index)} text={query.name}>
                      {query.name}
                    </Option>
                  ))}
                </Dropdown>
              </Field>
            </Grow>
            <Switch
              label="Double quotes"
              checked={doubleQuotes}
              onChange={(_, data) => setDoubleQuotes(data.checked)}
            />
          </FormRow>
          <CodeBlock value={content} language="xml" height="300px" />
        </FormStack>
      </DialogContent>
      <DialogActions>
        <Button appearance="secondary" onClick={onClose}>
          Close
        </Button>
        <CopyButton text={content} label="Copy" successMessage="Fetch XML copied to clipboard" />
        <Button appearance="primary" disabled={!content} onClick={() => onRetrieveRecords(content)}>
          Retrieve Records
        </Button>
      </DialogActions>
    </DialogBody>
  )
}

interface FetchXmlDialogProps {
  queries: NamedFetchXml[] | null
  onClose: () => void
  onRetrieveRecords: (fetchXml: string) => void
}

export const FetchXmlDialog = ({ queries, onClose, onRetrieveRecords }: FetchXmlDialogProps) => (
  <Dialog open={queries !== null} onOpenChange={(_, data) => (data.open ? undefined : onClose())}>
    <DialogSurface style={{ maxWidth: '640px' }}>
      {queries ? (
        <FetchXmlDialogBody queries={queries} onClose={onClose} onRetrieveRecords={onRetrieveRecords} />
      ) : null}
    </DialogSurface>
  </Dialog>
)
