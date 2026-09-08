import { DocumentCopy20Regular } from '@fluentui/react-icons'

import { type ModuleDefinition } from '@/modules/types'

import { FormPresetsArea } from './areas/presets'

export const formPresetsModule: ModuleDefinition = {
  id: 'formpresets',
  label: 'Form Presets',
  icon: DocumentCopy20Regular,
  order: 3,
  areas: [
    {
      id: 'formpresets.presets',
      label: 'Pre-populate Forms',
      breadcrumb: ['Form Presets', 'Pre-populate Forms'],
      tooltip: 'Save form values as a preset and apply it to new records',
      requires: 'bridge',
      component: FormPresetsArea,
    },
  ],
}
