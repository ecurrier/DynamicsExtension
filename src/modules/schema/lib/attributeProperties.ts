export type AttributeProperty = "label" | "description" | "requiredLevel" | "maxLength" | "minValue" | "maxValue" | "precision";

export const COMMON_PROPERTIES: AttributeProperty[] = ["label", "description", "requiredLevel"];

const NUMERIC_TYPES = ["Integer", "BigInt", "Decimal", "Double", "Money"];
const PRECISION_TYPES = ["Decimal", "Double", "Money"];

export const PROPERTY_LABELS: Record<AttributeProperty, string> = {
	label: "Label",
	description: "Description",
	requiredLevel: "Requirement level",
	maxLength: "Maximum length",
	minValue: "Minimum value",
	maxValue: "Maximum value",
	precision: "Decimal places",
};

export const propertiesForType = (attributeType: string): AttributeProperty[] => {
	const extra: AttributeProperty[] = [];
	if (attributeType === "String" || attributeType === "Memo") {
		extra.push("maxLength");
	}
	if (NUMERIC_TYPES.includes(attributeType)) {
		extra.push("minValue", "maxValue");
	}
	if (PRECISION_TYPES.includes(attributeType)) {
		extra.push("precision");
	}
	return [...COMMON_PROPERTIES, ...extra];
};

export const editablePropertiesFor = (attributeTypes: string[]): AttributeProperty[] => {
	const distinct = [...new Set(attributeTypes)];
	if (distinct.length === 0) {
		return [...COMMON_PROPERTIES];
	}
	const sets = distinct.map((type) => new Set(propertiesForType(type)));
	return propertiesForType(distinct[0]!).filter((property) => sets.every((set) => set.has(property)));
};

export const mixedTypeReason = (attributeTypes: string[]): string | null => {
	const distinct = [...new Set(attributeTypes)];
	if (distinct.length <= 1) {
		return null;
	}
	const shared = editablePropertiesFor(attributeTypes);
	const dropped = [...new Set(distinct.flatMap((type) => propertiesForType(type)))].filter((property) => !shared.includes(property));
	if (dropped.length === 0) {
		return null;
	}
	const names = dropped.map((property) => PROPERTY_LABELS[property].toLowerCase()).join(", ");
	return `The selected columns are ${distinct.join(" and ")}, so ${names} cannot be changed together. Select one type at a time to reach them.`;
};
