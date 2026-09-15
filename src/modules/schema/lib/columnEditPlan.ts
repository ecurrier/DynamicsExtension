import { type AttributeEdit, type AttributeMatch, type BulkRunPlan } from "@/shared/types";

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

const unchanged = (match: AttributeMatch, edit: AttributeEdit): boolean =>
	(edit.label === undefined || edit.label === match.label) &&
	(edit.description === undefined || edit.description === match.description) &&
	(edit.requiredLevel === undefined || edit.requiredLevel === match.requiredLevel);

export const columnEditPlan = (matches: AttributeMatch[], edit: AttributeEdit): BulkRunPlan<ColumnEditArgs> => ({
	title: "Update column metadata",
	action: "Update",
	items: matches
		.filter((match) => match.isCustomizable && !unchanged(match, edit))
		.map((match) => ({
			id: `${match.tableLogicalName}:${match.columnLogicalName}`,
			label: match.tableDisplayName,
			detail: [
				edit.label !== undefined && edit.label !== match.label ? `Label "${match.label}" to "${edit.label}"` : null,
				edit.description !== undefined && edit.description !== match.description ? "Description changes" : null,
				edit.requiredLevel !== undefined && edit.requiredLevel !== match.requiredLevel ? `${match.requiredLevel} to ${edit.requiredLevel}` : null,
			]
				.filter(Boolean)
				.join(", "),
			args: {
				tableLogicalName: match.tableLogicalName,
				columnLogicalName: match.columnLogicalName,
				attributeType: match.attributeType,
				metadataId: match.metadataId,
				...edit,
			},
		})),
});

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
