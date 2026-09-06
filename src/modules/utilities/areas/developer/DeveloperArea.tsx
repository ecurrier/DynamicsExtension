import {
  Code20Regular,
  DatabaseSearch20Regular,
  Globe20Regular,
  TextBulletListSquare20Regular,
} from '@fluentui/react-icons'
import { useState } from 'react'

import { usePageFetcher, usePageMutation } from '@/messaging/client'
import { useWebApiStore } from '@/modules/webapi/store'
import { TaskCard, TaskGrid } from '@/shared/components'
import { openUrl } from '@/shared/extension'
import { useAsyncAction } from '@/shared/hooks'
import { useNavigationStore } from '@/shared/stores'
import { type ChoiceMetadata, type NamedFetchXml, type TableMetadata } from '@/shared/types'

import { ChoiceCodeDialog, FetchXmlDialog, TableMetadataDialog } from '../../dialogs'

export const DeveloperArea = () => {
  const navigate = useNavigationStore((state) => state.navigate)
  const setFetchXml = useWebApiStore((state) => state.setFetchXml)
  const fetchPage = usePageFetcher()
  const [queries, setQueries] = useState<NamedFetchXml[] | null>(null)
  const [choices, setChoices] = useState<ChoiceMetadata | null>(null)
  const [metadata, setMetadata] = useState<TableMetadata | null>(null)

  const generateFetchXml = usePageMutation('utilities.generateFetchXml', { onSuccess: (result) => setQueries(result) })
  const webApiUrl = usePageMutation('utilities.getWebApiUrl', { onSuccess: (url) => openUrl(url) })
  const choiceMetadata = usePageMutation('utilities.getChoiceMetadata', { onSuccess: (result) => setChoices(result) })
  const tableMetadata = useAsyncAction('Could not read the table metadata')

  const retrieveRecords = (fetchXml: string) => {
    setFetchXml(fetchXml)
    setQueries(null)
    navigate('webapi.retrieve-records')
  }

  const showTableMetadata = () =>
    tableMetadata.run(async () => {
      const target = await fetchPage('utilities.getPageTarget', undefined, { fresh: true })
      if (!target.entityLogicalName) {
        throw new Error('Open a record form or a view so the table can be identified')
      }
      setMetadata(
        await fetchPage(
          'investigate.getTableMetadata',
          { entityLogicalName: target.entityLogicalName },
          { fresh: true },
        ),
      )
    })

  return (
    <>
      <TaskGrid>
        <TaskCard
          title="Generate Query"
          description="Fetch XML for the current record, its subgrids, or the view as displayed — plus Web API and JavaScript equivalents."
          icon={Code20Regular}
          loading={generateFetchXml.isPending}
          onAction={() => generateFetchXml.mutate(undefined)}
        />
        <TaskCard
          title="Table Metadata"
          description="Schema names, entity set, primary columns, alternate keys, and every relationship with its navigation property."
          icon={DatabaseSearch20Regular}
          actionLabel="Show"
          loading={tableMetadata.running}
          onAction={() => void showTableMetadata()}
        />
        <TaskCard
          title="Open Web API URL"
          description="Open the current environment's Web API root in a new tab."
          icon={Globe20Regular}
          actionLabel="Open"
          loading={webApiUrl.isPending}
          onAction={() => webApiUrl.mutate(undefined)}
        />
        <TaskCard
          title="Generate Choice Code Snippet"
          description="Generate C# enums or JavaScript objects for global and local choices."
          icon={TextBulletListSquare20Regular}
          loading={choiceMetadata.isPending}
          onAction={() => choiceMetadata.mutate(undefined)}
        />
      </TaskGrid>
      <FetchXmlDialog queries={queries} onClose={() => setQueries(null)} onRetrieveRecords={retrieveRecords} />
      <ChoiceCodeDialog metadata={choices} onClose={() => setChoices(null)} />
      <TableMetadataDialog metadata={metadata} onClose={() => setMetadata(null)} />
    </>
  )
}
