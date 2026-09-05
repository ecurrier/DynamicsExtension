import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Button,
  makeStyles,
  Text,
} from '@fluentui/react-components'
import { useState } from 'react'

import { usePageMutation } from '@/messaging/client'
import { CodeEditor, useAppToast } from '@/shared/components'

import { ResultsPreview } from './ResultsPreview'
import { extractEntityName, type ResultRow } from '../../lib'
import { useWebApiStore } from '../../store'

const useStyles = makeStyles({
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    paddingBottom: '12px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
})

type Section = 'editor' | 'results'

export const RetrieveRecordsArea = () => {
  const styles = useStyles()
  const toast = useAppToast()
  const fetchXml = useWebApiStore((state) => state.fetchXml)
  const setFetchXml = useWebApiStore((state) => state.setFetchXml)
  const [openItems, setOpenItems] = useState<Section[]>(['editor'])
  const [results, setResults] = useState<{ entityName: string; rows: ResultRow[] } | null>(null)

  const execute = usePageMutation('webapi.executeFetchXml', {
    onSuccess: (rows, args) => {
      setResults({ entityName: extractEntityName(args.fetchXml) ?? 'record', rows })
      setOpenItems(['results'])
      toast.success(`Retrieved ${rows.length} record${rows.length === 1 ? '' : 's'}`)
    },
  })

  return (
    <Accordion
      multiple
      collapsible
      openItems={openItems}
      onToggle={(_, data) => setOpenItems(data.openItems as Section[])}
    >
      <AccordionItem value="editor">
        <AccordionHeader>Fetch XML Editor</AccordionHeader>
        <AccordionPanel>
          <div className={styles.panel}>
            <CodeEditor
              value={fetchXml}
              language="xml"
              height="260px"
              placeholder="Enter Fetch XML..."
              onChange={setFetchXml}
            />
            <div className={styles.actions}>
              <Button
                appearance="primary"
                disabled={!fetchXml.trim() || execute.isPending}
                onClick={() => execute.mutate({ fetchXml })}
              >
                {execute.isPending ? 'Executing...' : 'Execute'}
              </Button>
            </div>
          </div>
        </AccordionPanel>
      </AccordionItem>
      <AccordionItem value="results">
        <AccordionHeader>View Results</AccordionHeader>
        <AccordionPanel>
          <div className={styles.panel}>
            {results ? (
              <ResultsPreview entityName={results.entityName} rows={results.rows} />
            ) : (
              <Text size={200}>Execute a Fetch XML query to view records.</Text>
            )}
          </div>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  )
}
