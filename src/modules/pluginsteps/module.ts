import { PlugConnectedSettings20Regular } from '@fluentui/react-icons'

import { type ModuleDefinition } from '@/modules/types'

import { PluginStepsArea } from './areas/steps'

export const pluginStepsModule: ModuleDefinition = {
  id: 'pluginsteps',
  label: 'Plugin Steps',
  icon: PlugConnectedSettings20Regular,
  order: 10,
  areas: [
    {
      id: 'pluginsteps.steps',
      label: 'Plugin Steps',
      breadcrumb: ['Plugin Steps'],
      tooltip: 'Enable or disable plug-in steps, grouped by assembly and plug-in type',
      component: PluginStepsArea,
    },
  ],
}
