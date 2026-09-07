export type TraceLogSetting = 0 | 1 | 2

export const TRACE_LOG_SETTINGS: readonly TraceLogSetting[] = [0, 1, 2]

export const TRACE_LOG_SETTING_LABELS: Record<TraceLogSetting, string> = { 0: 'Off', 1: 'Exception', 2: 'All' }

export type TraceTop = 100 | 500 | 1000 | 5000

export const TRACE_TOPS: readonly TraceTop[] = [100, 500, 1000, 5000]

export interface TraceQuery {
  top: TraceTop
  from: string | null
  to: string | null
  typeName: string
  messageName: string
  primaryEntity: string
  exceptionsOnly: boolean
  correlationId: string | null
}

export const DEFAULT_TRACE_QUERY: TraceQuery = {
  top: 100,
  from: null,
  to: null,
  typeName: '',
  messageName: '',
  primaryEntity: '',
  exceptionsOnly: false,
  correlationId: null,
}

export interface PluginTraceLog {
  id: string
  createdOn: string
  typeName: string
  messageName: string
  primaryEntity: string
  operationType: number
  mode: number
  depth: number
  correlationId: string | null
  requestId: string | null
  pluginStepId: string | null
  executionStart: string | null
  executionDurationMs: number | null
  constructorDurationMs: number | null
  exceptionDetails: string | null
  messageBlock: string | null
  configuration: string | null
  secureConfiguration: string | null
}

export interface TraceDeleteResult {
  deleted: number
}

export interface TraceViewerLaunch {
  tabId: number
  orgOrigin: string
  environmentName: string
  launchedAt: string
}
