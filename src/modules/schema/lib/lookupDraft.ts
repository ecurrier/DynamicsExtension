import { relationshipSchemaName } from "@/shared/lib";

export interface LookupCreatePreview {
	columnSchemaName: string;
	columnLogicalName: string;
	relationshipSchemaNames: string[];
}

export const schemaNameFromLabel = (label: string): string =>
	label
		.split(/[^A-Za-z0-9]+/)
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join("");

export const schemaNameProblem = (name: string): string | null => {
	if (name === "") {
		return null;
	}
	if (!/^[A-Za-z]/.test(name)) {
		return "Start the schema name with a letter.";
	}
	return /^[A-Za-z0-9_]+$/.test(name) ? null : "Use only letters, numbers, and underscores.";
};

export const lookupCreatePreview = (tableLogicalName: string, prefix: string, schemaName: string, targets: string[]): LookupCreatePreview => {
	const columnSchemaName = `${prefix}_${schemaName}`;
	return {
		columnSchemaName,
		columnLogicalName: columnSchemaName.toLowerCase(),
		relationshipSchemaNames: targets.map((target) => relationshipSchemaName(target, tableLogicalName, columnSchemaName)),
	};
};
