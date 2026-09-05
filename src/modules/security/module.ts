import { ShieldPerson20Regular } from '@fluentui/react-icons'

import { type ModuleDefinition } from '@/modules/types'

import { RolesArea } from './areas/roles'

export const securityModule: ModuleDefinition = {
  id: 'security',
  label: 'Security',
  icon: ShieldPerson20Regular,
  order: 5,
  areas: [
    {
      id: 'security.roles',
      label: 'Security Management',
      breadcrumb: ['Security Management'],
      tooltip: 'Review and change the security roles assigned to a user',
      component: RolesArea,
    },
  ],
}
