import { Settings20Regular } from '@fluentui/react-icons'

import { type ModuleDefinition } from '@/modules/types'

import { EnvironmentsArea } from './areas/environments'
import { ExtensionSettingsArea } from './areas/extension'

export const settingsModule: ModuleDefinition = {
  id: 'settings',
  label: 'Settings',
  icon: Settings20Regular,
  order: 8,
  areas: [
    {
      id: 'settings.environments',
      label: 'Environments',
      breadcrumb: ['Settings', 'Environments'],
      tooltip: 'Save environments to open them quickly from the Utilities module',
      component: EnvironmentsArea,
    },
    {
      id: 'settings.extension',
      label: 'Extension Settings',
      breadcrumb: ['Settings', 'Extension Settings'],
      tooltip: 'Behaviour preferences for the extension',
      component: ExtensionSettingsArea,
    },
  ],
}
