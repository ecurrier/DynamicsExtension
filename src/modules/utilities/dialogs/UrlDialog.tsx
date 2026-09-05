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
  Input,
  Option,
} from '@fluentui/react-components'
import { useState } from 'react'

import { CopyButton, ExternalLinkButton, FormStack } from '@/shared/components'
import { type GeneratedUrls } from '@/shared/types'

import { recordUrl } from '../lib'

const MANUAL_ENTRY = '__manual__'

interface UrlDialogBodyProps {
  urls: GeneratedUrls
  onClose: () => void
}

const UrlDialogBody = ({ urls, onClose }: UrlDialogBodyProps) => {
  const [selectedIndex, setSelectedIndex] = useState(urls.urls.length ? '0' : MANUAL_ENTRY)
  const [entityName, setEntityName] = useState('')
  const [recordId, setRecordId] = useState('')

  const manual = selectedIndex === MANUAL_ENTRY
  const selectedUrl = manual
    ? recordUrl(urls.appUrl, entityName.trim(), recordId.trim())
    : (urls.urls[Number(selectedIndex)]?.url ?? '')
  const selectedLabel = manual ? 'Manual Entry' : (urls.urls[Number(selectedIndex)]?.name ?? '')
  const ready = manual ? entityName.trim() !== '' && recordId.trim() !== '' : selectedUrl !== ''

  return (
    <DialogBody>
      <DialogTitle>Generated URLs</DialogTitle>
      <DialogContent>
        <FormStack>
          <Field label="URL">
            <Dropdown
              value={selectedLabel}
              selectedOptions={[selectedIndex]}
              onOptionSelect={(_, data) => data.optionValue && setSelectedIndex(data.optionValue)}
            >
              {urls.urls.map((url, index) => (
                <Option key={`${index}-${url.url}`} value={String(index)} text={url.name}>
                  {url.name}
                </Option>
              ))}
              <Option value={MANUAL_ENTRY} text="Manual Entry">
                Manual Entry
              </Option>
            </Dropdown>
          </Field>
          {manual ? (
            <>
              <Field label="Record Logical Name" required>
                <Input value={entityName} placeholder="account" onChange={(_, data) => setEntityName(data.value)} />
              </Field>
              <Field label="Record Id" required>
                <Input
                  value={recordId}
                  placeholder="00000000-0000-0000-0000-000000000000"
                  onChange={(_, data) => setRecordId(data.value)}
                />
              </Field>
            </>
          ) : null}
          <Field label="Record URL">
            <Input value={selectedUrl} readOnly />
          </Field>
        </FormStack>
      </DialogContent>
      <DialogActions>
        <Button appearance="secondary" onClick={onClose}>
          Close
        </Button>
        <CopyButton text={ready ? selectedUrl : null} label="Copy" successMessage="URL copied to clipboard" />
        <ExternalLinkButton url={ready ? selectedUrl : null} appearance="primary">
          Open in new tab
        </ExternalLinkButton>
      </DialogActions>
    </DialogBody>
  )
}

interface UrlDialogProps {
  urls: GeneratedUrls | null
  onClose: () => void
}

export const UrlDialog = ({ urls, onClose }: UrlDialogProps) => (
  <Dialog open={urls !== null} onOpenChange={(_, data) => (data.open ? undefined : onClose())}>
    <DialogSurface>{urls ? <UrlDialogBody urls={urls} onClose={onClose} /> : null}</DialogSurface>
  </Dialog>
)
