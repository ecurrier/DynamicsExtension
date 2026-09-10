import { type CodegenColumn, type ColumnRequiredLevel } from "@/shared/types";

export const REQUIRED_LABELS: Record<ColumnRequiredLevel, string> = {
	None: "Optional",
	SystemRequired: "System required",
	ApplicationRequired: "Required",
	Recommended: "Recommended",
};

export const columnMatches = (column: CodegenColumn, query: string): boolean => {
	const term = query.trim().toLowerCase();
	if (!term) {
		return true;
	}
	return [column.displayName, column.logicalName, column.schemaName].some((name) => name.toLowerCase().includes(term));
};

export const filterColumns = (columns: CodegenColumn[], query: string): CodegenColumn[] =>
	columns
		.filter((column) => columnMatches(column, query))
		.sort((left, right) => left.displayName.localeCompare(right.displayName) || left.logicalName.localeCompare(right.logicalName));

export const columnTypeLabel = (column: CodegenColumn): string =>
	column.attributeType === "Virtual" ? column.typeName.replace(/Type$/, "") || "Virtual" : column.attributeType;

export const columnExtra = (column: CodegenColumn): string => {
	const parts: string[] = [];
	if (column.maxLength !== null) {
		parts.push(`Max ${column.maxLength}`);
	}
	if (column.precision !== null) {
		parts.push(`Precision ${column.precision}`);
	}
	if (column.targets.length > 0) {
		parts.push(column.targets.map((target) => target.logicalName).join(", "));
	}
	if (column.optionSet) {
		parts.push(column.optionSet.isGlobal ? `${column.optionSet.name} (global)` : column.optionSet.name);
	}
	if (column.dateTimeBehavior) {
		parts.push(column.dateTimeBehavior);
	}
	if (column.attributeOf) {
		parts.push(`Helper for ${column.attributeOf}`);
	}
	return parts.join(" · ");
};
