export type PageContext = "model-driven-app" | "portal";

export type CloudType = "Commercial" | "GCC" | "GCCHigh" | "DOD";

export const CLOUD_TYPES: readonly CloudType[] = ["Commercial", "GCC", "GCCHigh", "DOD"];

export interface Solution {
	id: string;
	name: string;
	uniqueName: string;
	publisherPrefix: string | null;
}

export interface EnvironmentDetails {
	environmentName: string;
	environmentId: string;
	environmentType: CloudType;
	modelDrivenAppUrl: string | null;
	powerPagesUrl: string | null;
	geographicalRegion: string | null;
	organizationId: string | null;
	tenantId: string | null;
	blockedAttachments: string | null;
	baseCurrency: string | null;
}

export interface NamedFetchXml {
	name: string;
	fetchXml: string;
}

export interface GeneratedUrl {
	name: string;
	url: string;
	group?: string;
}

export interface GeneratedUrls {
	appUrl: string;
	urls: GeneratedUrl[];
}

export type ControlType = "form/edit" | "view";

export interface ControlDetails {
	entityName: string;
	controlType: ControlType;
	id: string;
}

export interface LookupTarget {
	logicalName: string;
	navigationProperty: string;
}

export interface EntityInfo {
	logicalName: string;
	displayName: string;
	entitySetName: string;
	primaryIdAttribute: string;
	primaryNameAttribute: string | null;
}

export interface RecordSearchRequest {
	entityLogicalName: string;
	query: string;
	top: number;
}

export interface RecordSearchResult {
	id: string;
	name: string;
	modifiedOn: string | null;
}

export interface LookupSelection {
	id: string;
	name: string;
	entityLogicalName: string;
	entitySetName: string;
	navigationProperty: string;
}

export type RecordValues = Record<string, unknown>;

export interface RecordSnapshot {
	entityName: string;
	recordId: string | null;
	values: RecordValues;
}

export interface FormState {
	recordId: string | null;
	isDirty: boolean;
}

export interface SaveRecordRequest {
	payload: Record<string, unknown>;
}

export interface CurrentUser {
	userId: string;
	userName: string;
	roleIds: string[];
}

export interface SecurityRole {
	id: string;
	name: string;
	businessUnitId: string | null;
	parentRootRoleId: string | null;
}

export interface SecurityRoleAssignment extends SecurityRole {
	viaTeam: string | null;
}

export interface BusinessUnit {
	id: string;
	name: string;
}

export interface SystemUser {
	id: string;
	fullName: string;
	azureAdObjectId: string | null;
	domainName: string | null;
	isDisabled: boolean;
}

export interface RoleChangeSet {
	systemUserId: string;
	associateRoleIds: string[];
	disassociateRoleIds: string[];
}

export interface SystemForm {
	id: string;
	name: string;
	type: number;
	typeLabel: string;
	isManaged: boolean;
	isCustomizable: boolean;
	isActive: boolean;
}

export interface UpdateFormXmlRequest {
	formId: string;
	formXml: string;
	publish: boolean;
}

export type PageRequirement = "bridge" | "model-driven-app" | "portal";

export interface WhoAmIResponse {
	UserId: string;
	BusinessUnitId: string;
	OrganizationId: string;
}

export type EnvironmentAlertLevel = 1 | 2 | 3 | 4;

export const ALERT_LEVEL_LABELS: Record<EnvironmentAlertLevel, string> = {
	1: "Success",
	2: "Error",
	3: "Warning",
	4: "Information",
};

export interface EnvironmentAlert {
	enabled: boolean;
	level: EnvironmentAlertLevel;
	message: string;
	showCloseButton: boolean;
}

export const ALERT_LEVELS: readonly EnvironmentAlertLevel[] = [1, 2, 3, 4];

export interface EnvironmentAlertRequest {
	environmentId: string;
	alert: EnvironmentAlert | null;
}

export type EnvironmentAlertReason = "shown" | "unchanged" | "cleared" | "disabled" | "no-app";

export interface EnvironmentAlertResult {
	shown: boolean;
	reason: EnvironmentAlertReason;
}
