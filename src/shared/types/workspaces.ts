import { type ResultsShare } from './results'
import { type TraceViewerLaunch } from './traces'
import { type TransporterLaunch } from './transport'

export type WorkspaceId = 'data-transporter' | 'plugin-traces' | 'results-viewer'

export type WorkspaceTarget = 'window' | 'tab'

export type WorkspaceLaunch =
  | { id: 'data-transporter'; launch: TransporterLaunch }
  | { id: 'plugin-traces'; launch: TraceViewerLaunch }
  | { id: 'results-viewer'; share: ResultsShare }
