export interface PageTarget {
	kind: string;
	entityLogicalName: string | null;
	recordId: string | null;
	formId: string | null;
	formName: string | null;
	viewId: string | null;
}

export type AutomationKind = "plugin" | "workflow" | "businessrule" | "bpf" | "action" | "flow" | "other";

export const AUTOMATION_KIND_LABELS: Record<AutomationKind, string> = {
	plugin: "Plug-in step",
	workflow: "Workflow",
	businessrule: "Business rule",
	bpf: "Business process flow",
	action: "Action",
	flow: "Cloud flow",
	other: "Process",
};

export interface AutomationItem {
	id: string;
	name: string;
	kind: AutomationKind;
	messages: string[];
	stage: number | null;
	stageLabel: string | null;
	mode: "sync" | "async" | null;
	rank: number | null;
	enabled: boolean;
	isManaged: boolean;
	filteringAttributes: string[];
	owner: string | null;
	description: string | null;
}

export interface TriggerRegistration {
	id: string;
	name: string | null;
	entityName: string | null;
	message: string | null;
	filteringAttributes: string | null;
}

export interface AutomationRun {
	id: string;
	name: string;
	statusLabel: string;
	failed: boolean;
	message: string | null;
	startedOn: string | null;
	completedOn: string | null;
}

export interface TableAutomation {
	entityLogicalName: string;
	items: AutomationItem[];
	registrations: TriggerRegistration[];
	registrationsUnavailable: string | null;
	recentRuns: AutomationRun[];
	runsUnavailable: string | null;
}

export interface RecordAccessRequest {
	entityLogicalName: string;
	recordId: string;
	systemUserId: string;
}

export interface AccessRole {
	id: string;
	name: string;
	businessUnitName: string | null;
	viaTeam: string | null;
}

export interface AccessTeam {
	id: string;
	name: string;
	teamTypeLabel: string;
	isDefault: boolean;
}

export interface AccessPrivilege {
	name: string;
	depthLabel: string;
	inheritedFromTeam: boolean;
}

export interface AccessShare {
	principalId: string;
	principalName: string;
	principalType: string;
	rights: string[];
}

export interface RecordAccessReport {
	entityLogicalName: string;
	recordId: string;
	systemUserId: string;
	userName: string;
	userBusinessUnitName: string | null;
	rights: string[];
	ownerId: string | null;
	ownerName: string | null;
	ownerType: string | null;
	ownerIsCurrentUser: boolean;
	recordBusinessUnitName: string | null;
	roles: AccessRole[];
	teams: AccessTeam[];
	privileges: AccessPrivilege[];
	shares: AccessShare[];
	sharesUnavailable: string | null;
	privilegesUnavailable: string | null;
}

export interface RecordHistoryRequest {
	entityLogicalName: string;
	recordId: string;
	top?: number;
}

export interface AuditEntry {
	id: string;
	createdOn: string;
	userId: string | null;
	userName: string | null;
	actionLabel: string;
	operationLabel: string;
}

export interface AuditConfiguration {
	organizationEnabled: boolean;
	tableEnabled: boolean;
	auditedColumns: number;
	totalColumns: number;
	unauditedLookups: string[];
}

export interface RecordHistory {
	entityLogicalName: string;
	recordId: string;
	entries: AuditEntry[];
	truncated: boolean;
	configuration: AuditConfiguration;
	unavailable: string | null;
}

export interface AuditChange {
	attribute: string;
	oldValue: string | null;
	newValue: string | null;
}

export interface AuditDetailRequest {
	auditId: string;
}

export interface AuditDetail {
	auditId: string;
	detailType: string;
	changes: AuditChange[];
	note: string | null;
}

export interface SolutionLayerRequest {
	componentId: string;
	solutionComponentName: string;
}

export interface SolutionLayer {
	order: number;
	solutionName: string;
	publisherName: string | null;
	isManaged: boolean;
	version: string | null;
	changedOn: string | null;
}

export interface SolutionLayers {
	componentId: string;
	solutionComponentName: string;
	componentName: string | null;
	layers: SolutionLayer[];
	hasUnmanagedLayer: boolean;
	unavailable: string | null;
}

export interface ColumnUsageRequest {
	entityLogicalName: string;
	attributeLogicalName: string;
	scanFlows: boolean;
}

export interface DependentComponent {
	id: string;
	componentType: number;
	componentTypeLabel: string;
	name: string | null;
	parentName: string | null;
}

export interface FlowReference {
	id: string;
	name: string;
	enabled: boolean;
	isManaged: boolean;
}

export interface StepReference {
	id: string;
	name: string;
	messageName: string;
	filteringAttributes: string;
}

export interface ColumnUsage {
	entityLogicalName: string;
	attributeLogicalName: string;
	attributeDisplayName: string | null;
	dependents: DependentComponent[];
	dependentsUnavailable: string | null;
	flows: FlowReference[];
	flowsScanned: number;
	flowsUnavailable: string | null;
	steps: StepReference[];
	stepsUnavailable: string | null;
}

export interface TableRelationship {
	schemaName: string;
	kind: "1:N" | "N:1" | "N:N";
	relatedEntity: string;
	navigationProperty: string | null;
	referencingAttribute: string | null;
	intersectEntity: string | null;
}

export interface TableKey {
	logicalName: string;
	displayName: string | null;
	attributes: string[];
	statusLabel: string;
}

export interface TableMetadata {
	logicalName: string;
	schemaName: string;
	displayName: string;
	collectionDisplayName: string | null;
	entitySetName: string;
	primaryIdAttribute: string;
	primaryNameAttribute: string | null;
	objectTypeCode: number | null;
	ownershipType: string | null;
	isManaged: boolean;
	isCustomEntity: boolean;
	isAuditEnabled: boolean;
	changeTrackingEnabled: boolean;
	isActivity: boolean;
	isQuickCreateEnabled: boolean;
	isValidForAdvancedFind: boolean;
	hasNotes: boolean;
	hasActivities: boolean;
	attributeCount: number | null;
	keys: TableKey[];
	relationships: TableRelationship[];
}

export interface RecordCountRequest {
	entityLogicalNames: string[];
}

export interface RecordCount {
	entityLogicalName: string;
	count: number;
}

export interface RecordCounts {
	counts: RecordCount[];
	missing: string[];
}

export interface FormLibrary {
	name: string;
	order: number;
	webResourceId: string | null;
}

export interface FormEventHandler {
	event: string;
	target: string | null;
	library: string;
	functionName: string;
	enabled: boolean;
	passExecutionContext: boolean;
	parameters: string | null;
	order: number;
}

export interface FormControlDiagnostic {
	name: string;
	label: string;
	controlType: string;
	tab: string | null;
	section: string | null;
	visible: boolean;
	disabled: boolean;
	requiredLevel: string;
	hasValue: boolean;
}

export interface FormBusinessRule {
	id: string;
	name: string;
	enabled: boolean;
	scopeLabel: string;
}

export interface FormDiagnostics {
	formId: string;
	formName: string;
	entityLogicalName: string;
	libraries: FormLibrary[];
	handlers: FormEventHandler[];
	controls: FormControlDiagnostic[];
	businessRules: FormBusinessRule[];
	businessRulesUnavailable: string | null;
	formXmlUnavailable: string | null;
}

export interface CapturedControlState {
	name: string;
	label: string;
	visible: boolean;
	disabled: boolean;
	requiredLevel: string;
}

declare const formStateSnapshotBrand: unique symbol;

export interface FormStateSnapshot {
	readonly [formStateSnapshotBrand]?: "FormStateSnapshot";
	entityLogicalName: string;
	formId: string | null;
	controls: CapturedControlState[];
}

export interface AdminModeResult {
	total: number;
	hidden: CapturedControlState[];
	disabled: CapturedControlState[];
	required: CapturedControlState[];
	snapshot: FormStateSnapshot;
}

export interface RestoreFormStateRequest {
	snapshot: FormStateSnapshot;
}

export interface RestoreFormStateResult {
	restored: number;
}

export interface SessionUser {
	id: string;
	name: string;
	businessUnitId: string | null;
	businessUnitName: string | null;
	roles: string[];
	teams: string[];
}

export interface SessionOrganization {
	version: string | null;
	isAuditEnabled: boolean | null;
	pluginTraceLogSetting: string | null;
	isDuplicateDetectionEnabled: boolean | null;
	backgroundProcessingDisabled: boolean | null;
}

export interface SessionApp {
	id: string | null;
	name: string | null;
	uniqueName: string | null;
}

export interface SessionPage {
	kind: string;
	entityLogicalName: string | null;
	recordId: string | null;
	formId: string | null;
	formName: string | null;
}

export interface SessionClient {
	client: string | null;
	formFactor: string | null;
	languageId: number | null;
	timeZone: string | null;
	baseCurrency: string | null;
}

export interface SessionSnapshot {
	user: SessionUser;
	organization: SessionOrganization;
	app: SessionApp;
	page: SessionPage;
	client: SessionClient;
	warnings: string[];
}
