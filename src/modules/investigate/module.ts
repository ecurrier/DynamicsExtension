import { Search20Regular } from '@fluentui/react-icons'

import { type ModuleDefinition } from '@/modules/types'

import { AccessArea } from './areas/access'
import { AutomationArea } from './areas/automation'
import { ColumnUsageArea } from './areas/columns'
import { RecordCountsArea } from './areas/counts'
import { FormDiagnosticsArea } from './areas/form'
import { HistoryArea } from './areas/history'

export const investigateModule: ModuleDefinition = {
  id: 'investigate',
  label: 'Investigate',
  icon: Search20Regular,
  order: 2,
  areas: [
    {
      id: 'investigate.automation',
      label: 'Table Automation',
      breadcrumb: ['Investigate', 'Table Automation'],
      tooltip: 'Every plug-in step, workflow, business rule, and cloud flow registered against a table',
      component: AutomationArea,
    },
    {
      id: 'investigate.access',
      label: 'Record Access',
      breadcrumb: ['Investigate', 'Record Access'],
      tooltip: 'Check what a specific user can do with a specific record, and why',
      component: AccessArea,
    },
    {
      id: 'investigate.history',
      label: 'Record History',
      breadcrumb: ['Investigate', 'Record History'],
      tooltip: 'Audit timeline for a record, with the auditing configuration that explains gaps',
      component: HistoryArea,
    },
    {
      id: 'investigate.columns',
      label: 'Column Usage',
      breadcrumb: ['Investigate', 'Column Usage'],
      tooltip: 'Find every component and cloud flow that depends on a column before changing it',
      component: ColumnUsageArea,
    },
    {
      id: 'investigate.counts',
      label: 'Row Counts',
      breadcrumb: ['Investigate', 'Row Counts'],
      tooltip: 'Row counts per table, so you can see what is actually big before scoping work',
      component: RecordCountsArea,
    },
    {
      id: 'investigate.form',
      label: 'Form Diagnostics',
      breadcrumb: ['Investigate', 'Form Diagnostics'],
      tooltip: 'Scripts, handlers, business rules, and control state for the open form',
      requires: 'model-driven-app',
      component: FormDiagnosticsArea,
    },
  ],
}
