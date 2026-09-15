export interface AttributeMatch {
	maxLength: number | null;
	minValue: number | null;
	maxValue: number | null;
	precision: number | null;
	tableLogicalName: string;
	tableDisplayName: string;
	columnLogicalName: string;
	attributeType: string;
	label: string;
	description: string;
	requiredLevel: string;
	isManaged: boolean;
	isCustomizable: boolean;
	metadataId: string;
}

export interface AttributeSearchRequest {
	logicalName: string;
	customOnly?: boolean;
}

export interface AttributeEdit {
	label?: string;
	description?: string;
	requiredLevel?: string;
	maxLength?: number;
	minValue?: number;
	maxValue?: number;
	precision?: number;
}

export interface UpdateAttributeRequest extends AttributeEdit {
	tableLogicalName: string;
	columnLogicalName: string;
	attributeType: string;
	metadataId: string;
	solutionUniqueName?: string | null;
}

export const REQUIRED_LEVELS: readonly string[] = ["None", "ApplicationRequired", "Recommended"];

export interface PolymorphicTarget {
	tableLogicalName: string;
	relationshipSchemaName: string;
	relationshipId: string;
}

export interface PolymorphicLookup {
	columnLogicalName: string;
	tableLogicalName: string;
	targets: PolymorphicTarget[];
}

export interface CreatePolymorphicLookupRequest {
	tableLogicalName: string;
	columnSchemaName: string;
	label: string;
	description?: string;
	targetTableLogicalNames: string[];
	solutionUniqueName?: string | null;
}

export interface TargetRequest {
	tableLogicalName: string;
	columnSchemaName: string;
	columnLogicalName: string;
	label: string;
	targetTableLogicalName: string;
	targetPrimaryIdAttribute: string;
	solutionUniqueName?: string | null;
}
