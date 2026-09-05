import { Code20Regular, Globe20Regular, TextBulletListSquare20Regular } from '@fluentui/react-icons'
import { useState } from 'react'

import { usePageMutation } from '@/messaging/client'
import { useWebApiStore } from '@/modules/webapi/store'
import { TaskCard, TaskGrid } from '@/shared/components'
import { openUrl } from '@/shared/extension'
import { useNavigationStore } from '@/shared/stores'
import { type ChoiceMetadata, type NamedFetchXml } from '@/shared/types'

import { ChoiceCodeDialog, FetchXmlDialog } from '../../dialogs'

export const DeveloperArea = () => {
  const navigate = useNavigationStore((state) => state.navigate)
  const setFetchXml = useWebApiStore((state) => state.setFetchXml)
  const [queries, setQueries] = useState<NamedFetchXml[] | null>(null)
  const [choices, setChoices] = useState<ChoiceMetadata | null>(null)

  const generateFetchXml = usePageMutation('utilities.generateFetchXml', { onSuccess: (result) => setQueries(result) })
  const webApiUrl = usePageMutation('utilities.getWebApiUrl', { onSuccess: (url) => openUrl(url) })
  const choiceMetadata = usePageMutation('utilities.getChoiceMetadata', { onSuccess: (result) => setChoices(result) })

  const retrieveRecords = (fetchXml: string) => {
    setFetchXml(fetchXml)
    setQueries(null)
    navigate('webapi.retrieve-records')
  }

  return (
    <>
      <TaskGrid>
        <TaskCard
          title="Generate Fetch XML"
          description="Generate Fetch XML for the current record, its subgrids, or the saved queries of the current view."
          icon={Code20Regular}
          loading={generateFetchXml.isPending}
          onAction={() => generateFetchXml.mutate(undefined)}
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
    </>
  )
}
