import { type EnvironmentDetails } from '@/shared/types'

export interface DetailRow {
  label: string
  value: string
}

const LABELS: Record<keyof EnvironmentDetails, string> = {
  environmentName: 'Environment Name',
  environmentId: 'Environment Id',
  environmentType: 'Environment Type',
  modelDrivenAppUrl: 'Model-Driven App URL',
  powerPagesUrl: 'Power Pages URL',
  geographicalRegion: 'Geographical Region',
  organizationId: 'Organization Id',
  tenantId: 'Tenant Id',
  blockedAttachments: 'Blocked Attachments',
  baseCurrency: 'Base Currency',
}

export const formatEnvironmentDetails = (details: EnvironmentDetails): DetailRow[] =>
  (Object.keys(LABELS) as (keyof EnvironmentDetails)[]).map((key) => ({
    label: LABELS[key],
    value: details[key] || '—',
  }))
