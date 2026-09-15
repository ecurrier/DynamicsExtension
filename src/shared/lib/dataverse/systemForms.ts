export const FORM_TYPES: readonly number[] = [2, 5, 6, 7, 11, 12];

const FORM_TYPE_LABELS: Record<number, string> = {
	2: "Main",
	5: "Mobile",
	6: "Quick View",
	7: "Quick Create",
	11: "Card",
	12: "Main Interactive",
};

export const formTypeLabel = (type: number): string => FORM_TYPE_LABELS[type] ?? `Type ${type}`;

export const formTypeFilter = (): string => FORM_TYPES.map((type) => `type eq ${type}`).join(" or ");

export const buildPublishXml = (entityLogicalNames: string | string[]): string | null => {
	const names = [...new Set((Array.isArray(entityLogicalNames) ? entityLogicalNames : [entityLogicalNames]).filter((name) => name.trim() !== ""))];
	if (names.length === 0) {
		return null;
	}
	return `<importexportxml><entities>${names.map((name) => `<entity>${name}</entity>`).join("")}</entities></importexportxml>`;
};
