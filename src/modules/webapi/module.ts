import { Database20Regular } from '@fluentui/react-icons'

import { type ModuleDefinition } from '@/modules/types'

import { RetrieveRecordsArea } from './areas/retrieve-records'
import { UpdateFieldsArea } from './areas/update-fields'

export const webApiModule: ModuleDefinition = {
  id: 'webapi',
  label: 'Web API',
  icon: Database20Regular,
  order: 4,
  areas: [
    {
      id: 'webapi.update-fields',
      label: 'Update Fields',
      breadcrumb: ['Web API', 'Update Fields'],
      tooltip: 'Update a single field on the current record through the Web API',
      requires: 'model-driven-app',
      component: UpdateFieldsArea,
    },
    {
      id: 'webapi.retrieve-records',
      label: 'Retrieve Records',
      breadcrumb: ['Web API', 'Retrieve Records'],
      tooltip: 'Execute Fetch XML against the current environment and view the results',
      requires: 'model-driven-app',
      component: RetrieveRecordsArea,
    },
  ],
}
