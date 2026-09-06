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
  makeStyles,
  Option,
  Switch,
  Tab,
  TabList,
  Text,
  tokens,
} from '@fluentui/react-components'
import { useMemo, useState } from 'react'

import { CodeBlock, CopyButton, FormRow, FormStack, Grow } from '@/shared/components'
import { formatXml, toggleQuotes } from '@/shared/lib'
import { type NamedFetchXml } from '@/shared/types'

import { fetchXmlToOData, webApiSnippet } from '../lib'

type OutputFormat = 'fetchxml' | 'odata' | 'javascript'

const useStyles = makeStyles({
  caption: {
    color: tokens.colorNeutralForeground3,
  },
})

interface FetchXmlDialogBodyProps {
  queries: NamedFetchXml[]
  onClose: () => void
  onRetrieveRecords: (fetchXml: string) => void
}

const FetchXmlDialogBody = ({ queries, onClose, onRetrieveRecords }: FetchXmlDialogBodyProps) => {
  const styles = useStyles()
  const [selectedIndex, setSelectedIndex] = useState('0')
  const [doubleQuotes, setDoubleQuotes] = useState(true)
  const [format, setFormat] = useState<OutputFormat>('fetchxml')

  const formatted = useMemo(
    () => queries.map((query) => ({ name: query.name, fetchXml: formatXml(query.fetchXml) })),
    [queries],
  )
  const selected = formatted[Number(selectedIndex)]
  const fetchXml = selected ? toggleQuotes(selected.fetchXml, doubleQuotes) : ''

  const odata = useMemo(() => (selected ? fetchXmlToOData(selected.fetchXml) : null), [selected])

  const content = useMemo(() => {
    if (!selected) {
      return ''
    }
    if (format === 'javascript') {
      return webApiSnippet(selected.fetchXml)
    }
    if (format === 'odata') {
      return odata?.ok ? odata.query : `?fetchXml=${encodeURIComponent(selected.fetchXml.replace(/\s+/g, ' ').trim())}`
    }
    return fetchXml
  }, [format, selected, odata, fetchXml])

  const language = format === 'fetchxml' ? 'xml' : format === 'javascript' ? 'javascript' : 'json'

  return (
    <DialogBody>
      <DialogTitle>Generated Query</DialogTitle>
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
            {format === 'fetchxml' ? (
              <Switch
                label="Double quotes"
                checked={doubleQuotes}
                onChange={(_, data) => setDoubleQuotes(data.checked)}
              />
            ) : null}
          </FormRow>
          <TabList selectedValue={format} onTabSelect={(_, data) => setFormat(data.value as OutputFormat)} size="small">
            <Tab value="fetchxml">Fetch XML</Tab>
            <Tab value="odata">Web API query</Tab>
            <Tab value="javascript">JavaScript</Tab>
          </TabList>
          <CodeBlock value={content} language={language} height="280px" />
          {format === 'odata' && odata && !odata.ok ? (
            <Text size={200} className={styles.caption}>
              {`Could not translate to $select/$filter because ${odata.reason}. The fetchXml parameter above is the exact equivalent and is always safe to use.`}
            </Text>
          ) : null}
          {format === 'odata' && odata?.ok ? (
            <Text size={200} className={styles.caption}>
              Append this to the entity set, for example
              {` /api/data/v9.2/accounts${odata.query}`}
            </Text>
          ) : null}
        </FormStack>
      </DialogContent>
      <DialogActions>
        <Button appearance="secondary" onClick={onClose}>
          Close
        </Button>
        <CopyButton text={content} label="Copy" successMessage="Copied to clipboard" />
        <Button appearance="primary" disabled={!fetchXml} onClick={() => onRetrieveRecords(fetchXml)}>
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
    <DialogSurface style={{ maxWidth: '680px' }}>
      {queries ? (
        <FetchXmlDialogBody queries={queries} onClose={onClose} onRetrieveRecords={onRetrieveRecords} />
      ) : null}
    </DialogSurface>
  </Dialog>
)
