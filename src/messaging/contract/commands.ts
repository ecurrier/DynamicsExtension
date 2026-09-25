import {
	type AdminModeResult,
	type AttributeMatch,
	type AttributeSearchRequest,
	type AuditDetail,
	type AuditDetailRequest,
	type BusinessUnit,
	type ClearEnvironmentVariableValueRequest,
	type CodegenChoice,
	type CodegenTable,
	type ColumnUsage,
	type ColumnUsageRequest,
	type ControlDetails,
	type CreatePolymorphicLookupRequest,
	type CurrentUser,
	type DirtyColumnsResult,
	type EntityInfo,
	type EntitySummary,
	type EnvironmentAlertRequest,
	type EnvironmentAlertResult,
	type EnvironmentDetails,
	type EnvironmentVariable,
	type EnvironmentVariableValueResult,
	type FormAttributeInfo,
	type FormColumnDetails,
	type FormDiagnostics,
	type FormState,
	type GeneratedUrls,
	type NamedFetchXml,
	type PageContext,
	type PageTarget,
	type PluginPackage,
	type PluginPackageUpdate,
	type PluginPackageUpdateResult,
	type PluginStep,
	type PluginStepStateChange,
	type PluginStepStateResult,
	type PluginTraceLog,
	type PolymorphicLookup,
	type PrivilegeDepth,
	type RecordAccessReport,
	type RecordAccessRequest,
	type RecordCountRequest,
	type RecordCounts,
	type RecordHistory,
	type RecordHistoryRequest,
	type RecordPayloadSource,
	type RecordSearchRequest,
	type RecordSearchResult,
	type RecordSnapshot,
	type RestoreFormStateRequest,
	type RestoreFormStateResult,
	type RetrievePageRequest,
	type RetrievePageResult,
	type RevealFormColumnRequest,
	type RoleChangeSet,
	type RolePrivilege,
	type SavedView,
	type SaveRecordRequest,
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
	type TargetRequest,
	type TraceDeleteResult,
	type TraceLogSetting,
	type TraceQuery,
	type TransportEntityMetadata,
	type UpdateAttributeRequest,
	type UpdateFormXmlRequest,
} from "@/shared/types";

export interface CommandMap {
	"global.getPageContext": { args: void; result: PageContext | null; kind: "query" };
	"global.getSolutions": { args: void; result: Solution[]; kind: "query" };
	"global.showEnvironmentAlert": { args: EnvironmentAlertRequest; result: EnvironmentAlertResult; kind: "mutation" };
	"global.clearEnvironmentAlert": { args: void; result: void; kind: "mutation" };
	"settings.getEnvironmentDetails": { args: void; result: EnvironmentDetails; kind: "query" };
	"utilities.refreshCommandBar": { args: void; result: void; kind: "mutation" };
	"utilities.generateFetchXml": { args: void; result: NamedFetchXml[]; kind: "query" };
	"utilities.generateUrls": { args: void; result: GeneratedUrls; kind: "query" };
	"utilities.getWebApiUrl": { args: void; result: string; kind: "query" };
	"utilities.toggleControlLogicalNames": { args: void; result: { mode: "logical" | "label" }; kind: "mutation" };
	"utilities.enableAdminMode": { args: void; result: AdminModeResult; kind: "mutation" };
	"utilities.restoreFormState": { args: RestoreFormStateRequest; result: RestoreFormStateResult; kind: "mutation" };
	"utilities.getSessionSnapshot": { args: void; result: SessionSnapshot; kind: "query" };
	"utilities.navigateToRecord": { args: { entityLogicalName: string; recordId: string }; result: void; kind: "mutation" };
	"utilities.getPageTarget": { args: void; result: PageTarget; kind: "query" };
	"utilities.getControlDetails": { args: void; result: ControlDetails; kind: "query" };
	"utilities.getFormAttributes": { args: void; result: FormAttributeInfo[]; kind: "query" };
	"utilities.getDirtyColumns": { args: void; result: DirtyColumnsResult; kind: "query" };
	"utilities.revealFormColumn": { args: RevealFormColumnRequest; result: FormColumnDetails; kind: "mutation" };
	"utilities.getRecordPayloadSource": { args: void; result: RecordPayloadSource; kind: "query" };
	"formPresets.captureFormValues": { args: void; result: Record<string, unknown>; kind: "query" };
	"formPresets.applyFormValues": {
		args: { fields: Record<string, unknown> };
		result: { applied: number; skipped: string[] };
		kind: "mutation";
	};
	"webapi.getRecordValues": { args: void; result: RecordSnapshot; kind: "query" };
	"webapi.getFormState": { args: void; result: FormState; kind: "query" };
	"webapi.saveRecord": { args: SaveRecordRequest; result: void; kind: "mutation" };
	"webapi.refreshForm": { args: void; result: void; kind: "mutation" };
	"webapi.getEntityInfo": { args: { logicalName: string }; result: EntityInfo; kind: "query" };
	"webapi.searchRecords": { args: RecordSearchRequest; result: RecordSearchResult[]; kind: "query" };
	"webapi.executeFetchXml": { args: { fetchXml: string }; result: Record<string, unknown>[]; kind: "query" };
	"forms.getForms": { args: void; result: SystemForm[]; kind: "query" };
	"forms.getFormXml": { args: { formId: string }; result: string; kind: "query" };
	"forms.updateFormXml": { args: UpdateFormXmlRequest; result: void; kind: "mutation" };
	"forms.getFormDiagnostics": { args: void; result: FormDiagnostics; kind: "query" };
	"traces.query": { args: TraceQuery; result: PluginTraceLog[]; kind: "query" };
	"traces.delete": { args: { ids: string[] }; result: TraceDeleteResult; kind: "mutation" };
	"traces.getSetting": { args: void; result: TraceLogSetting; kind: "query" };
	"traces.setSetting": { args: { value: TraceLogSetting }; result: void; kind: "mutation" };
	"security.getCurrentUser": { args: void; result: CurrentUser; kind: "query" };
	"security.getSecurityRoles": { args: void; result: SecurityRole[]; kind: "query" };
	"security.getBusinessUnits": { args: void; result: BusinessUnit[]; kind: "query" };
	"security.searchSystemUsers": { args: { query: string }; result: SystemUser[]; kind: "query" };
	"security.listSystemUsers": { args: void; result: SystemUser[]; kind: "query" };
	"security.getUserSecurityRoles": {
		args: { systemUserId: string; businessUnitId: string };
		result: SecurityRole[];
		kind: "query";
	};
	"security.getSystemUserRoles": { args: { systemUserId: string }; result: SecurityRole[]; kind: "query" };
	"schema.findAttributeAcrossTables": { args: AttributeSearchRequest; result: AttributeMatch[]; kind: "query" };
	"schema.updateAttribute": { args: UpdateAttributeRequest; result: void; kind: "mutation" };
	"schema.listPolymorphicLookups": { args: { tableLogicalName: string }; result: PolymorphicLookup[]; kind: "query" };
	"schema.createPolymorphicLookup": { args: CreatePolymorphicLookupRequest; result: void; kind: "mutation" };
	"schema.addPolymorphicTarget": { args: TargetRequest; result: void; kind: "mutation" };
	"schema.removePolymorphicTarget": { args: { relationshipId: string }; result: void; kind: "mutation" };
	"schema.publishTables": { args: { logicalNames: string[] }; result: void; kind: "mutation" };
	"security.getRolePrivileges": { args: { roleIds: string[] }; result: RolePrivilege[]; kind: "query" };
	"security.addPrivilegesRole": { args: { roleId: string; privileges: { privilegeId: string; depth: PrivilegeDepth }[] }; result: void; kind: "mutation" };
	"security.applySecurityRoleChanges": { args: RoleChangeSet; result: void; kind: "mutation" };
	"environmentVariables.getDefinitions": { args: void; result: EnvironmentVariable[]; kind: "query" };
	"environmentVariables.setValue": {
		args: SetEnvironmentVariableValueRequest;
		result: EnvironmentVariableValueResult;
		kind: "mutation";
	};
	"environmentVariables.clearValue": { args: ClearEnvironmentVariableValueRequest; result: void; kind: "mutation" };
	"pluginSteps.getSteps": { args: void; result: PluginStep[]; kind: "query" };
	"pluginSteps.get": { args: { id: string }; result: PluginStep | null; kind: "query" };
	"pluginSteps.setState": { args: PluginStepStateChange; result: PluginStepStateResult; kind: "mutation" };
	"pluginPackages.list": { args: void; result: PluginPackage[]; kind: "query" };
	"pluginPackages.get": { args: { id: string }; result: PluginPackage | null; kind: "query" };
	"pluginPackages.update": { args: PluginPackageUpdate; result: PluginPackageUpdateResult; kind: "mutation" };
	"pluginPackages.getLayers": { args: { id: string }; result: SolutionLayers; kind: "query" };
	"transport.listEntities": { args: void; result: EntitySummary[]; kind: "query" };
	"transport.listViews": { args: { entityLogicalName: string }; result: SavedView[]; kind: "query" };
	"transport.getEntityMetadata": { args: { logicalName: string }; result: TransportEntityMetadata; kind: "query" };
	"transport.retrievePage": { args: RetrievePageRequest; result: RetrievePageResult; kind: "query" };
	"investigate.getTableAutomation": { args: { entityLogicalName: string }; result: TableAutomation; kind: "query" };
	"investigate.getRecordAccess": { args: RecordAccessRequest; result: RecordAccessReport; kind: "query" };
	"investigate.getRecordHistory": { args: RecordHistoryRequest; result: RecordHistory; kind: "query" };
	"investigate.getAuditDetail": { args: AuditDetailRequest; result: AuditDetail; kind: "query" };
	"investigate.getSolutionLayers": { args: SolutionLayerRequest; result: SolutionLayers; kind: "query" };
	"investigate.getColumnUsage": { args: ColumnUsageRequest; result: ColumnUsage; kind: "query" };
	"investigate.getTableMetadata": { args: { entityLogicalName: string }; result: TableMetadata; kind: "query" };
	"investigate.getRecordCounts": { args: RecordCountRequest; result: RecordCounts; kind: "query" };
	"investigate.listTables": { args: void; result: EntitySummary[]; kind: "query" };
	"codegen.getTableModel": { args: { entityLogicalName: string }; result: CodegenTable; kind: "query" };
	"codegen.getGlobalChoices": { args: void; result: CodegenChoice[]; kind: "query" };
	"investigate.getTableColumns": { args: { entityLogicalName: string }; result: TransportEntityMetadata; kind: "query" };
}

export type CommandName = keyof CommandMap;
export type CommandArgs<N extends CommandName> = CommandMap[N]["args"];
export type CommandResult<N extends CommandName> = CommandMap[N]["result"];

export type QueryCommandName = { [N in CommandName]: CommandMap[N]["kind"] extends "query" ? N : never }[CommandName];
export type MutationCommandName = Exclude<CommandName, QueryCommandName>;
