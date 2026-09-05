import { type Environment } from '@/shared/storage'
import { type CloudType, type EnvironmentDetails } from '@/shared/types'

export interface EnvironmentDraft {
  name: string
  environmentType: CloudType
  modelDrivenAppUrl: string
  powerPagesUrl: string
  environmentId: string
  tenantId: string
  clientId: string
  clientSecret: string
  notes: string
}

export type DraftField = 'name' | 'modelDrivenAppUrl' | 'credentials'

export interface DraftValidation {
  field: DraftField
  message: string
}

export const EMPTY_DRAFT: EnvironmentDraft = {
  name: '',
  environmentType: 'Commercial',
  modelDrivenAppUrl: '',
  powerPagesUrl: '',
  environmentId: '',
  tenantId: '',
  clientId: '',
  clientSecret: '',
  notes: '',
}

export const CLOUD_TYPE_LABELS: Record<CloudType, string> = {
  Commercial: 'Commercial',
  GCC: 'GCC',
  GCCHigh: 'GCC High',
  DOD: 'DoD',
}

export const hasCredentialInput = (draft: EnvironmentDraft): boolean =>
  !!(draft.tenantId.trim() || draft.clientId.trim() || draft.clientSecret.trim())

const isHttpsUrl = (value: string): boolean => {
  try {
    return new URL(value.trim()).protocol === 'https:'
  } catch {
    return false
  }
}

export const draftFromEnvironment = (environment: Environment): EnvironmentDraft => ({
  name: environment.name,
  environmentType: environment.environmentType,
  modelDrivenAppUrl: environment.modelDrivenAppUrl,
  powerPagesUrl: environment.powerPagesUrl,
  environmentId: environment.environmentId,
  tenantId: environment.credentials?.tenantId ?? '',
  clientId: environment.credentials?.clientId ?? '',
  clientSecret: environment.credentials?.clientSecret ?? '',
  notes: environment.notes,
})

export const draftFromDetails = (details: EnvironmentDetails | null | undefined): EnvironmentDraft => ({
  ...EMPTY_DRAFT,
  name: details?.environmentName ?? '',
  environmentType: details?.environmentType ?? 'Commercial',
  modelDrivenAppUrl: details?.modelDrivenAppUrl ?? '',
  powerPagesUrl: details?.powerPagesUrl ?? '',
  environmentId: details?.environmentId ?? '',
  tenantId: details?.tenantId ?? '',
})

export const validateDraft = (draft: EnvironmentDraft): DraftValidation | null => {
  if (!draft.name.trim()) {
    return { field: 'name', message: 'Enter an environment name' }
  }
  if (hasCredentialInput(draft)) {
    if (!isHttpsUrl(draft.modelDrivenAppUrl)) {
      return { field: 'modelDrivenAppUrl', message: 'Enter the https URL of the environment to use client credentials' }
    }
    if (!draft.tenantId.trim() || !draft.clientId.trim() || !draft.clientSecret.trim()) {
      return { field: 'credentials', message: 'Enter the tenant id, client id, and client secret together' }
    }
  }
  return null
}

export const toEnvironment = (id: string, draft: EnvironmentDraft): Environment => ({
  id,
  name: draft.name.trim(),
  environmentType: draft.environmentType,
  modelDrivenAppUrl: draft.modelDrivenAppUrl.trim(),
  powerPagesUrl: draft.powerPagesUrl.trim(),
  environmentId: draft.environmentId.trim(),
  notes: draft.notes.trim(),
  credentials: hasCredentialInput(draft)
    ? { tenantId: draft.tenantId.trim(), clientId: draft.clientId.trim(), clientSecret: draft.clientSecret.trim() }
    : null,
})

export const sortEnvironments = (environments: Environment[]): Environment[] =>
  [...environments].sort((left, right) => left.name.localeCompare(right.name))
