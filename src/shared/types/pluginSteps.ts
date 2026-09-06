export const PLUGIN_STEP_STAGE_LABELS: Record<number, string> = {
  10: 'PreValidation',
  20: 'PreOperation',
  40: 'PostOperation',
}

export const PLUGIN_STEP_MODE_LABELS: Record<number, string> = {
  0: 'Sync',
  1: 'Async',
}

export interface PluginStep {
  id: string
  name: string
  stage: number
  mode: number
  rank: number
  enabled: boolean
  isManaged: boolean
  filteringAttributes: string | null
  description: string | null
  asyncAutoDelete: boolean
  messageName: string
  primaryEntity: string | null
  pluginTypeId: string | null
  pluginTypeName: string
  pluginTypeFriendlyName: string | null
  assemblyId: string | null
  assemblyName: string
  assemblyVersion: string | null
}

export interface PluginStepStateChange {
  ids: string[]
  enabled: boolean
}

export interface PluginStepFailure {
  id: string
  message: string
}

export interface PluginStepStateResult {
  updated: number
  failed: PluginStepFailure[]
}
