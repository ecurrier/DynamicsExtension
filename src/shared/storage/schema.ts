import { type CloudType, type EnvironmentAlert, type PageContext } from '@/shared/types'

export const LEGACY_SCHEMA_VERSION = 2
export const SERVICE_PRINCIPAL_SCHEMA_VERSION = 3
export const SCHEMA_VERSION = SERVICE_PRINCIPAL_SCHEMA_VERSION

export interface ServicePrincipal {
  id: string
  name: string
  tenantId: string
  clientId: string
  clientSecret: string
  notes: string
}

export type ServicePrincipals = Record<string, ServicePrincipal>

export interface Environment {
  id: string
  name: string
  environmentType: CloudType
  modelDrivenAppUrl: string
  powerPagesUrl: string
  environmentId: string
  notes: string
  servicePrincipalId: string | null
  alert: EnvironmentAlert | null
}

export type Environments = Record<string, Environment>

export interface AccessTokenEntry {
  token: string
  expiresAt: number
}

export type AccessTokens = Record<string, AccessTokenEntry>

export interface Template {
  id: string
  name: string
  fields: Record<string, unknown>
}

export type TemplatesByContext = Record<PageContext, Record<string, Template>>

export type ThemePreference = 'system' | 'light' | 'dark'

export const THEME_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark']

export interface ExtensionSettings {
  themeMode: ThemePreference
  openLastVisitedArea: boolean
  makerPortalUseCurrentEnvironment: boolean
  adminCenterUseCurrentEnvironment: boolean
  controlEditorUseDefaultSolution: boolean
  securityRequireRemovalConfirmation: boolean
  formsRequireSaveConfirmation: boolean
  environmentVariablesRequireSaveConfirmation: boolean
  pluginStepsRequireToggleConfirmation: boolean
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  themeMode: 'system',
  openLastVisitedArea: false,
  makerPortalUseCurrentEnvironment: false,
  adminCenterUseCurrentEnvironment: false,
  controlEditorUseDefaultSolution: false,
  securityRequireRemovalConfirmation: true,
  formsRequireSaveConfirmation: true,
  environmentVariablesRequireSaveConfirmation: true,
  pluginStepsRequireToggleConfirmation: true,
}

export const EMPTY_TEMPLATES: TemplatesByContext = {
  'model-driven-app': {},
  portal: {},
}
