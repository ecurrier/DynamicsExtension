import { DocumentCopy20Regular } from '@fluentui/react-icons'

import { type ModuleDefinition } from '@/modules/types'

import { TemplatesArea } from './areas/templates'

export const templatesModule: ModuleDefinition = {
  id: 'templates',
  label: 'Templates',
  icon: DocumentCopy20Regular,
  order: 2,
  areas: [
    {
      id: 'templates.templates',
      label: 'Pre-populate Forms',
      breadcrumb: ['Templates', 'Pre-populate Forms'],
      tooltip: 'Save form values as templates and apply them to new records',
      requires: 'bridge',
      component: TemplatesArea,
    },
  ],
}
