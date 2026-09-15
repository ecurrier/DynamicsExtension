import { type AttributeEdit, type AttributeMatch, type BulkRunPlan } from "@/shared/types";

import { type AttributeProperty, editablePropertiesFor, PROPERTY_LABELS } from "./attributeProperties";

export interface ColumnEditArgs extends AttributeEdit {
	tableLogicalName: string;
	columnLogicalName: string;
	attributeType: string;
	metadataId: string;
}

export const majorityType = (matches: AttributeMatch[]): string | null => {
	const counts = new Map<string, number>();
	for (const match of matches) {
		counts.set(match.attributeType, (counts.get(match.attributeType) ?? 0) + 1);
	}
	let best: string | null = null;
	let bestCount = 0;
	for (const [type, count] of counts) {
		if (count > bestCount) {
			best = type;
			bestCount = count;
		}
	}
	return best;
};

export const typeMismatches = (matches: AttributeMatch[]): Set<string> => {
	const majority = majorityType(matches);
	return new Set(matches.filter((match) => match.attributeType !== majority).map((match) => match.tableLogicalName));
};

export const customisableReason = (match: AttributeMatch): string | null =>
	match.isCustomizable ? null : "This column is locked by its managed solution and cannot be customised.";

const CURRENT: Record<AttributeProperty, (match: AttributeMatch) => unknown> = {
	label: (match) => match.label,
	description: (match) => match.description,
	requiredLevel: (match) => match.requiredLevel,
	maxLength: (match) => match.maxLength,
	minValue: (match) => match.minValue,
	maxValue: (match) => match.maxValue,
	precision: (match) => match.precision,
};

export const allowedEdit = (edit: AttributeEdit, matches: AttributeMatch[]): AttributeEdit => {
	const allowed = new Set<string>(editablePropertiesFor(matches.map((match) => match.attributeType)));
	return Object.fromEntries(Object.entries(edit).filter(([key]) => allowed.has(key)));
};

const changes = (match: AttributeMatch, edit: AttributeEdit): AttributeProperty[] =>
	(Object.keys(edit) as AttributeProperty[]).filter((key) => edit[key] !== undefined && edit[key] !== CURRENT[key](match));

const unchanged = (match: AttributeMatch, edit: AttributeEdit): boolean => changes(match, edit).length === 0;

export const columnEditPlan = (matches: AttributeMatch[], requested: AttributeEdit): BulkRunPlan<ColumnEditArgs> => {
	const edit = allowedEdit(requested, matches);
	return {
		title: "Update column metadata",
		action: "Update",
		items: matches
			.filter((match) => match.isCustomizable && !unchanged(match, edit))
			.map((match) => ({
				id: `${match.tableLogicalName}:${match.columnLogicalName}`,
				label: match.tableDisplayName,
				detail: changes(match, edit)
					.map((key) =>
						key === "label"
							? `Label "${match.label}" to "${String(edit.label)}"`
							: key === "description"
								? "Description changes"
								: `${PROPERTY_LABELS[key]} ${String(CURRENT[key](match) ?? "unset")} to ${String(edit[key])}`
					)
					.join(", "),
				args: {
					tableLogicalName: match.tableLogicalName,
					columnLogicalName: match.columnLogicalName,
					attributeType: match.attributeType,
					metadataId: match.metadataId,
					...edit,
				},
			})),
	};
};

export const tablesToPublish = (succeededIds: string[]): string[] => [...new Set(succeededIds.map((id) => id.split(":")[0] ?? "").filter(Boolean))];

export const columnEditSummary = (matches: AttributeMatch[], edit: AttributeEdit): string => {
	if (matches.length === 0) {
		return "Search for a column to begin.";
	}
	const locked = matches.filter((match) => !match.isCustomizable).length;
	const changing = columnEditPlan(matches, edit).items.length;
	const parts = [changing === 1 ? "1 table will change" : `${changing} tables will change`];
	if (locked > 0) {
		parts.push(`${locked} locked by a managed solution`);
	}
	const same = matches.length - changing - locked;
	if (same > 0) {
		parts.push(`${same} already match`);
	}
	return `${parts.join(", ")}.`;
};
