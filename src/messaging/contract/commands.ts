import {
  type AdminModeResult,
  type AttributeMetadataBundle,
  type AuditDetail,
  type AuditDetailRequest,
  type BusinessUnit,
  type ChoiceMetadata,
  type ClearEnvironmentVariableValueRequest,
  type ClearLookupRequest,
  type ColumnUsage,
  type ColumnUsageRequest,
  type ControlDetails,
  type CurrentUser,
  type EntityInfo,
  type EntitySummary,
  type EnvironmentAlertRequest,
  type EnvironmentAlertResult,
  type EnvironmentDetails,
  type EnvironmentVariable,
  type EnvironmentVariableValueResult,
  type FormDiagnostics,
  type GeneratedUrls,
  type NamedFetchXml,
  type PageContext,
  type PageTarget,
  type PluginStep,
  type PluginStepStateChange,
  type PluginStepStateResult,
  type PluginTraceLog,
  type RecordAccessReport,
  type RecordAccessRequest,
  type RecordCountRequest,
  type RecordCounts,
  type RecordHistory,
  type RecordHistoryRequest,
  type RecordSearchRequest,
  type RecordSearchResult,
  type RecordValues,
  type RestoreFormStateRequest,
  type RestoreFormStateResult,
  type RetrievePageRequest,
  type RetrievePageResult,
  type RoleChangeSet,
  type SavedView,
  type SecurityRole,
  type SessionSnapshot,
  type SetEnvironmentVariableValueRequest,
  type Solution,
  type SolutionLayerRequest,
  type SolutionLayers,
  type SystemForm,
  type SystemUser,
  type TableAutomation,
  type TableMetadata,
  type TraceDeleteResult,
  type TraceLogSetting,
  type TraceQuery,
  type TransportEntityMetadata,
  type UpdateFieldRequest,
  type UpdateFormXmlRequest,
} from '@/shared/types'

export interface CommandMap {
  'global.getPageContext': { args: void; result: PageContext | null }
  'global.getSolutions': { args: void; result: Solution[] }
  'global.showEnvironmentAlert': { args: EnvironmentAlertRequest; result: EnvironmentAlertResult }
  'global.clearEnvironmentAlert': { args: void; result: void }
  'settings.getEnvironmentDetails': { args: void; result: EnvironmentDetails }
  'utilities.refreshCommandBar': { args: void; result: void }
  'utilities.generateFetchXml': { args: void; result: NamedFetchXml[] }
  'utilities.generateUrls': { args: void; result: GeneratedUrls }
  'utilities.getWebApiUrl': { args: void; result: string }
  'utilities.toggleControlLogicalNames': { args: void; result: { mode: 'logical' | 'label' } }
  'utilities.enableAdminMode': { args: void; result: AdminModeResult }
  'utilities.restoreFormState': { args: RestoreFormStateRequest; result: RestoreFormStateResult }
  'utilities.getSessionSnapshot': { args: void; result: SessionSnapshot }
  'utilities.getPageTarget': { args: void; result: PageTarget }
  'utilities.getChoiceMetadata': { args: void; result: ChoiceMetadata }
  'utilities.getControlDetails': { args: void; result: ControlDetails }
  'templates.captureFormValues': { args: void; result: Record<string, unknown> }
  'templates.applyFormValues': {
    args: { fields: Record<string, unknown> }
    result: { applied: number; skipped: string[] }
  }
  'webapi.getAttributeMetadata': { args: void; result: AttributeMetadataBundle }
  'webapi.getRecordValues': { args: void; result: RecordValues }
  'webapi.updateField': { args: UpdateFieldRequest; result: void }
  'webapi.clearLookup': { args: ClearLookupRequest; result: void }
  'webapi.getEntityInfo': { args: { logicalName: string }; result: EntityInfo }
  'webapi.searchRecords': { args: RecordSearchRequest; result: RecordSearchResult[] }
  'webapi.executeFetchXml': { args: { fetchXml: string }; result: Record<string, unknown>[] }
  'forms.getForms': { args: void; result: SystemForm[] }
  'forms.getFormXml': { args: { formId: string }; result: string }
  'forms.updateFormXml': { args: UpdateFormXmlRequest; result: void }
  'forms.getFormDiagnostics': { args: void; result: FormDiagnostics }
  'traces.query': { args: TraceQuery; result: PluginTraceLog[] }
  'traces.delete': { args: { ids: string[] }; result: TraceDeleteResult }
  'traces.getSetting': { args: void; result: TraceLogSetting }
  'traces.setSetting': { args: { value: TraceLogSetting }; result: void }
  'security.getCurrentUser': { args: void; result: CurrentUser }
  'security.getSecurityRoles': { args: void; result: SecurityRole[] }
  'security.getBusinessUnits': { args: void; result: BusinessUnit[] }
  'security.searchSystemUsers': { args: { query: string }; result: SystemUser[] }
  'security.getUserSecurityRoles': { args: { systemUserId: string; businessUnitId: string }; result: SecurityRole[] }
  'security.getSystemUserRoles': { args: { systemUserId: string }; result: SecurityRole[] }
  'security.applySecurityRoleChanges': { args: RoleChangeSet; result: void }
  'environmentVariables.getDefinitions': { args: void; result: EnvironmentVariable[] }
  'environmentVariables.setValue': {
    args: SetEnvironmentVariableValueRequest
    result: EnvironmentVariableValueResult
  }
  'environmentVariables.clearValue': { args: ClearEnvironmentVariableValueRequest; result: void }
  'pluginSteps.getSteps': { args: void; result: PluginStep[] }
  'pluginSteps.get': { args: { id: string }; result: PluginStep | null }
  'pluginSteps.setState': { args: PluginStepStateChange; result: PluginStepStateResult }
  'transport.listEntities': { args: void; result: EntitySummary[] }
  'transport.listViews': { args: { entityLogicalName: string }; result: SavedView[] }
  'transport.getEntityMetadata': { args: { logicalName: string }; result: TransportEntityMetadata }
  'transport.retrievePage': { args: RetrievePageRequest; result: RetrievePageResult }
  'investigate.getTableAutomation': { args: { entityLogicalName: string }; result: TableAutomation }
  'investigate.getRecordAccess': { args: RecordAccessRequest; result: RecordAccessReport }
  'investigate.getRecordHistory': { args: RecordHistoryRequest; result: RecordHistory }
  'investigate.getAuditDetail': { args: AuditDetailRequest; result: AuditDetail }
  'investigate.getSolutionLayers': { args: SolutionLayerRequest; result: SolutionLayers }
  'investigate.getColumnUsage': { args: ColumnUsageRequest; result: ColumnUsage }
  'investigate.getTableMetadata': { args: { entityLogicalName: string }; result: TableMetadata }
  'investigate.getRecordCounts': { args: RecordCountRequest; result: RecordCounts }
  'investigate.listTables': { args: void; result: EntitySummary[] }
  'investigate.getTableColumns': { args: { entityLogicalName: string }; result: TransportEntityMetadata }
}

export type CommandName = keyof CommandMap
export type CommandArgs<N extends CommandName> = CommandMap[N]['args']
export type CommandResult<N extends CommandName> = CommandMap[N]['result']
