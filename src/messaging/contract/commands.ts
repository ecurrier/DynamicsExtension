import {
  type AttributeMetadataBundle,
  type BusinessUnit,
  type ChoiceMetadata,
  type ClearLookupRequest,
  type ControlDetails,
  type CurrentUser,
  type EntityInfo,
  type EnvironmentDetails,
  type GeneratedUrls,
  type NamedFetchXml,
  type PageContext,
  type PluginTraceLog,
  type RecordSearchRequest,
  type RecordSearchResult,
  type RecordValues,
  type RoleChangeSet,
  type SecurityRole,
  type Solution,
  type SystemForm,
  type SystemUser,
  type TraceDeleteResult,
  type TraceLogSetting,
  type TraceQuery,
  type UpdateFieldRequest,
  type UpdateFormXmlRequest,
} from '@/shared/types'

export interface CommandMap {
  'global.getPageContext': { args: void; result: PageContext | null }
  'global.getSolutions': { args: void; result: Solution[] }
  'settings.getEnvironmentDetails': { args: void; result: EnvironmentDetails }
  'utilities.refreshCommandBar': { args: void; result: void }
  'utilities.generateFetchXml': { args: void; result: NamedFetchXml[] }
  'utilities.generateUrls': { args: void; result: GeneratedUrls }
  'utilities.getWebApiUrl': { args: void; result: string }
  'utilities.toggleControlLogicalNames': { args: void; result: { mode: 'logical' | 'label' } }
  'utilities.enableAdminMode': { args: void; result: void }
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
}

export type CommandName = keyof CommandMap
export type CommandArgs<N extends CommandName> = CommandMap[N]['args']
export type CommandResult<N extends CommandName> = CommandMap[N]['result']
