import { Wrench20Regular } from '@fluentui/react-icons'

import { type ModuleDefinition } from '@/modules/types'

import { AdminArea } from './areas/admin'
import { DeveloperArea } from './areas/developer'

export const utilitiesModule: ModuleDefinition = {
  id: 'utilities',
  label: 'Utilities',
  icon: Wrench20Regular,
  order: 1,
  areas: [
    {
      id: 'utilities.admin',
      label: 'Admin',
      breadcrumb: ['Utilities', 'Admin'],
      tooltip: 'Administrative shortcuts for the current environment and record',
      requires: 'model-driven-app',
      component: AdminArea,
    },
    {
      id: 'utilities.developer',
      label: 'Developer',
      breadcrumb: ['Utilities', 'Developer'],
      tooltip: 'Developer helpers such as Fetch XML, URLs, and choice code snippets',
      requires: 'model-driven-app',
      component: DeveloperArea,
    },
  ],
}
