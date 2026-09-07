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
  makeStyles,
  Option,
  OptionGroup,
  Text,
  Textarea,
  tokens,
} from '@fluentui/react-components'
import { useMemo, useState } from 'react'

import { CopyButton, ExternalLinkButton, FormStack } from '@/shared/components'
import { type GeneratedUrls } from '@/shared/types'

import { groupUrls, recordUrl } from '../lib'

const MANUAL_ENTRY = '__manual__'

const useStyles = makeStyles({
  caption: {
    color: tokens.colorNeutralForeground3,
  },
})

interface UrlDialogBodyProps {
  urls: GeneratedUrls
  onClose: () => void
}

const UrlDialogBody = ({ urls, onClose }: UrlDialogBodyProps) => {
  const styles = useStyles()
  const [selectedIndex, setSelectedIndex] = useState(urls.urls.length ? '0' : MANUAL_ENTRY)
  const [entityName, setEntityName] = useState('')
  const [recordId, setRecordId] = useState('')

  const groups = useMemo(() => groupUrls(urls.urls), [urls.urls])
  const manual = selectedIndex === MANUAL_ENTRY
  const selectedUrl = manual
    ? recordUrl(urls.appUrl, entityName.trim(), recordId.trim())
    : (urls.urls[Number(selectedIndex)]?.url ?? '')
  const selectedLabel = manual ? 'Manual Entry' : (urls.urls[Number(selectedIndex)]?.name ?? '')
  const ready = manual ? entityName.trim() !== '' && recordId.trim() !== '' : selectedUrl !== ''
  const allUrls = urls.urls.map((url) => `${url.name}\n${url.url}`).join('\n\n')

  return (
    <DialogBody>
      <DialogTitle>Links &amp; Debug Flags</DialogTitle>
      <DialogContent>
        <FormStack>
          <Field label="URL">
            <Dropdown
              value={selectedLabel}
              selectedOptions={[selectedIndex]}
              onOptionSelect={(_, data) => data.optionValue && setSelectedIndex(data.optionValue)}
            >
              {groups.map((group) => (
                <OptionGroup key={group.name} label={group.name}>
                  {group.urls.map((entry) => (
                    <Option key={entry.index} value={String(entry.index)} text={entry.url.name}>
                      {entry.url.name}
                    </Option>
                  ))}
                </OptionGroup>
              ))}
              <OptionGroup label="Other">
                <Option value={MANUAL_ENTRY} text="Manual Entry">
                  Manual Entry
                </Option>
              </OptionGroup>
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
            <Textarea value={selectedUrl} readOnly resize="vertical" rows={3} />
          </Field>
          <Text size={200} className={styles.caption}>
            Debug links open the same record with platform diagnostics query parameter(s) added.
          </Text>
        </FormStack>
      </DialogContent>
      <DialogActions>
        <Button appearance="secondary" onClick={onClose}>
          Close
        </Button>
        <CopyButton text={allUrls} label="Copy all" successMessage="All links copied to clipboard" />
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
    <DialogSurface style={{ maxWidth: '640px' }}>
      {urls ? <UrlDialogBody urls={urls} onClose={onClose} /> : null}
    </DialogSurface>
  </Dialog>
)
