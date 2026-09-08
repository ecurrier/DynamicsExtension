import { DocumentTable20Regular } from '@fluentui/react-icons'

import { type ModuleDefinition } from '@/modules/types'

import { FormXmlArea } from './areas/xml'

export const formsModule: ModuleDefinition = {
  id: 'forms',
  label: 'Forms',
  icon: DocumentTable20Regular,
  order: 6,
  areas: [
    {
      id: 'forms.xml',
      label: 'Form XML',
      breadcrumb: ['Forms', 'Form XML'],
      tooltip: 'View and edit the XML definition of the forms for the current table',
      requires: 'model-driven-app',
      component: FormXmlArea,
    },
  ],
}
