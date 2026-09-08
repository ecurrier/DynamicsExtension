import { PersonSwap20Regular } from '@fluentui/react-icons'

import { type ModuleDefinition } from '@/modules/types'

import { ImpersonationArea } from './areas/user'

export const impersonationModule: ModuleDefinition = {
  id: 'impersonation',
  label: 'Impersonation',
  icon: PersonSwap20Regular,
  order: 8,
  areas: [
    {
      id: 'impersonation.user',
      label: 'Impersonate User',
      breadcrumb: ['Impersonate User'],
      tooltip: 'Run this tab as another user by adding the Dataverse impersonation header to its Web API requests',
      requires: 'model-driven-app',
      component: ImpersonationArea,
    },
  ],
}
