import { type AttributeMatch } from "@/shared/types";

import { type AttributeProperty } from "./attributeProperties";
import { currentValue } from "./columnEditPlan";

const MAX_NAMED_TABLES = 3;
const MAX_VALUE_LENGTH = 40;

const shorten = (text: string): string => {
	if (text.length <= MAX_VALUE_LENGTH) {
		return text;
	}
	const space = text.lastIndexOf(" ", MAX_VALUE_LENGTH - 1);
	return `${text.slice(0, space > 0 ? space : MAX_VALUE_LENGTH - 1)}…`;
};

const displayValue = (value: unknown, property: AttributeProperty): string => {
	if (value === null || value === undefined) {
		return "not set";
	}
	const text = String(value);
	if (text === "") {
		return "empty";
	}
	return property === "description" ? `“${shorten(text)}”` : shorten(text);
};

const listTables = (names: string[]): string => {
	if (names.length > MAX_NAMED_TABLES) {
		return `${names.length} tables`;
	}
	if (names.length < 2) {
		return names.join("");
	}
	return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
};

export const describeCurrentValues = (matches: AttributeMatch[], property: AttributeProperty): string => {
	const groups = new Map<string, string[]>();
	for (const match of matches) {
		const value = displayValue(currentValue(match, property), property);
		groups.set(value, [...(groups.get(value) ?? []), match.tableDisplayName]);
	}
	const entries = [...groups.entries()].sort((left, right) => right[1].length - left[1].length);
	const [only] = entries;
	if (entries.length === 1 && only) {
		const [value, tables] = only;
		return tables.length === 1 ? value : `${value} on all ${tables.length}`;
	}
	return entries.map(([value, tables]) => `${value} on ${listTables(tables)}`).join(", ");
};
