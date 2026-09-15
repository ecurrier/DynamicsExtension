export interface AttributeMatch {
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
}

export interface UpdateAttributeRequest extends AttributeEdit {
	tableLogicalName: string;
	columnLogicalName: string;
	attributeType: string;
	metadataId: string;
	solutionUniqueName?: string | null;
}

export const REQUIRED_LEVELS: readonly string[] = ["None", "ApplicationRequired", "Recommended"];
