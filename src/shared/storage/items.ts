import { storage, type WxtStorageItem } from 'wxt/utils/storage'

import { type ImpersonationStates, type TraceViewerLaunch, type TransporterLaunch } from '@/shared/types'

import {
  type AccessTokens,
  DEFAULT_SETTINGS,
  EMPTY_TEMPLATES,
  type Environment,
  type Environments,
  type ExtensionSettings,
  type ResultsShare,
  type ServicePrincipals,
  type TemplatesByContext,
} from './schema'

export type StorageItem<T> = WxtStorageItem<T, Record<string, unknown>>

export const schemaVersionItem: StorageItem<number> = storage.defineItem<number, Record<string, unknown>>(
  'local:schemaVersion',
  { fallback: 0 },
)

type StoredEnvironments = Record<string, Record<string, unknown>>

const withCredentialFields = (environments: StoredEnvironments): StoredEnvironments =>
  Object.fromEntries(
    Object.entries(environments).map(([id, environment]) => [id, { notes: '', credentials: null, ...environment }]),
  )

const withPrincipalAndAlertFields = (environments: StoredEnvironments): Environments =>
  Object.fromEntries(
    Object.entries(environments).map(([id, environment]) => [
      id,
      { servicePrincipalId: null, alert: null, ...environment } as unknown as Environment,
    ]),
  )

export const environmentsItem: StorageItem<Environments> = storage.defineItem<Environments, Record<string, unknown>>(
  'local:environments',
  {
    fallback: {},
    version: 3,
    migrations: { 2: withCredentialFields, 3: withPrincipalAndAlertFields },
  },
)

export const servicePrincipalsItem: StorageItem<ServicePrincipals> = storage.defineItem<
  ServicePrincipals,
  Record<string, unknown>
>('local:servicePrincipals', {
  fallback: {},
  version: 1,
})

export const templatesItem: StorageItem<TemplatesByContext> = storage.defineItem<
  TemplatesByContext,
  Record<string, unknown>
>('local:templates', {
  fallback: EMPTY_TEMPLATES,
  version: 1,
})

export const settingsItem: StorageItem<ExtensionSettings> = storage.defineItem<
  ExtensionSettings,
  Record<string, unknown>
>('local:settings', {
  fallback: DEFAULT_SETTINGS,
  version: 1,
})

export const lastVisitedAreaItem: StorageItem<string | null> = storage.defineItem<
  string | null,
  Record<string, unknown>
>('local:lastVisitedArea', {
  fallback: null,
})

export const resultsShareItem: StorageItem<ResultsShare | null> = storage.defineItem<
  ResultsShare | null,
  Record<string, unknown>
>('session:resultsShare', { fallback: null })

export const accessTokensItem: StorageItem<AccessTokens> = storage.defineItem<AccessTokens, Record<string, unknown>>(
  'session:accessTokens',
  { fallback: {} },
)

export const impersonationItem: StorageItem<ImpersonationStates> = storage.defineItem<
  ImpersonationStates,
  Record<string, unknown>
>('session:impersonation', { fallback: {} })

export const traceViewerLaunchItem: StorageItem<TraceViewerLaunch | null> = storage.defineItem<
  TraceViewerLaunch | null,
  Record<string, unknown>
>('session:traceViewerLaunch', { fallback: null })

export const pinnedWindowsItem: StorageItem<Record<string, number>> = storage.defineItem<
  Record<string, number>,
  Record<string, unknown>
>('session:pinnedWindows', { fallback: {} })

export const transporterLaunchItem: StorageItem<TransporterLaunch | null> = storage.defineItem<
  TransporterLaunch | null,
  Record<string, unknown>
>('session:transporterLaunch', { fallback: null })
