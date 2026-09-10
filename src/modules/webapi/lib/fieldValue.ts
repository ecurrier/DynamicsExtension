import { type AttributeDefinition, type AttributeType, type FieldValue, type LookupSelection, type LookupTarget, type RecordValues } from "@/shared/types";

export type InputKind = "number" | "text" | "dateTime" | "memo" | "lookup" | "choice" | "boolean" | "multiChoice";

const INPUT_KINDS: Record<AttributeType, InputKind> = {
	BigInt: "number",
	Decimal: "number",
	Double: "number",
	Integer: "number",
	Money: "number",
	String: "text",
	DateTime: "dateTime",
	Memo: "memo",
	Lookup: "lookup",
	Owner: "lookup",
	Customer: "lookup",
	Picklist: "choice",
	State: "choice",
	Status: "choice",
	Boolean: "boolean",
	Virtual: "multiChoice",
};

export const inputKindFor = (attributeType: AttributeType): InputKind => INPUT_KINDS[attributeType];

export const isLookupAttribute = (definition: AttributeDefinition): boolean => inputKindFor(definition.attributeType) === "lookup";

export const attributeTypeLabel = (attributeType: AttributeType): string => (attributeType === "Virtual" ? "MultiSelectPicklist" : attributeType);

export interface FieldDraft {
	clear: boolean;
	text: string;
	number: string;
	date: string;
	lookup: LookupSelection | null;
	choice: string;
	multiChoice: string[];
}

export const EMPTY_DRAFT: FieldDraft = {
	clear: false,
	text: "",
	number: "",
	date: "",
	lookup: null,
	choice: "",
	multiChoice: [],
};

export const initialDraft = (definition: AttributeDefinition): FieldDraft => ({
	...EMPTY_DRAFT,
	choice: definition.options.length === 1 ? String(definition.options[0]?.value) : "",
});

const INTEGER_TYPES: readonly AttributeType[] = ["Integer", "BigInt"];

export type DraftResult = { ok: true; value: FieldValue } | { ok: false; message: string };

export const draftToFieldValue = (definition: AttributeDefinition, draft: FieldDraft): DraftResult => {
	if (draft.clear) {
		return { ok: true, value: { kind: "clear" } };
	}
	switch (inputKindFor(definition.attributeType)) {
		case "number": {
			const parsed = Number(draft.number.trim());
			if (draft.number.trim() === "" || Number.isNaN(parsed)) {
				return { ok: false, message: "Enter a number" };
			}
			if (INTEGER_TYPES.includes(definition.attributeType) && !Number.isInteger(parsed)) {
				return { ok: false, message: "Enter a whole number" };
			}
			return { ok: true, value: { kind: "number", value: parsed } };
		}
		case "text":
		case "memo":
			return draft.text === "" ? { ok: false, message: "Enter a value" } : { ok: true, value: { kind: "text", value: draft.text } };
		case "dateTime": {
			if (!draft.date) {
				return { ok: false, message: "Enter a date" };
			}
			if (definition.dateTimeFormat === "DateOnly") {
				return { ok: true, value: { kind: "dateTime", value: draft.date } };
			}
			const parsed = new Date(draft.date);
			return Number.isNaN(parsed.getTime())
				? { ok: false, message: "Enter a valid date" }
				: { ok: true, value: { kind: "dateTime", value: parsed.toISOString() } };
		}
		case "lookup":
			return draft.lookup
				? {
						ok: true,
						value: {
							kind: "lookup",
							navigationProperty: draft.lookup.navigationProperty,
							entitySetName: draft.lookup.entitySetName,
							id: draft.lookup.id,
						},
					}
				: { ok: false, message: "Select a record" };
		case "choice":
			return draft.choice === "" ? { ok: false, message: "Select a choice" } : { ok: true, value: { kind: "choice", value: Number(draft.choice) } };
		case "boolean":
			return draft.choice === "" ? { ok: false, message: "Select a value" } : { ok: true, value: { kind: "boolean", value: draft.choice === "1" } };
		case "multiChoice":
			return draft.multiChoice.length === 0
				? { ok: false, message: "Select at least one choice" }
				: { ok: true, value: { kind: "multiChoice", values: draft.multiChoice.map(Number) } };
	}
};

export const buildUpdatePayload = (definition: AttributeDefinition, value: FieldValue): Record<string, unknown> => {
	const name = definition.logicalName;
	switch (value.kind) {
		case "clear":
			return { [name]: null };
		case "lookup":
			return { [`${value.navigationProperty}@odata.bind`]: `/${value.entitySetName}(${value.id})` };
		case "multiChoice":
			return { [name]: value.values.join(",") };
		case "number":
		case "text":
		case "dateTime":
		case "choice":
		case "boolean":
			return { [name]: value.value };
	}
};

const FORMATTED_VALUE = "@OData.Community.Display.V1.FormattedValue";
const LOOKUP_LOGICAL_NAME = "@Microsoft.Dynamics.CRM.lookuplogicalname";

const asText = (value: unknown): string | null =>
	value === null || value === undefined ? null : typeof value === "object" ? JSON.stringify(value) : String(value);

export const currentLookupTarget = (definition: AttributeDefinition, values: RecordValues): LookupTarget | null => {
	const key = `_${definition.logicalName}_value`;
	if (values[key] === null || values[key] === undefined) {
		return null;
	}
	const logicalName = asText(values[`${key}${LOOKUP_LOGICAL_NAME}`]);
	return definition.targets.find((target) => target.logicalName === logicalName) ?? definition.targets[0] ?? null;
};

export const displayRecordValue = (definition: AttributeDefinition, values: RecordValues): string | null => {
	const name = definition.logicalName;
	switch (inputKindFor(definition.attributeType)) {
		case "lookup": {
			const key = `_${name}_value`;
			const id = asText(values[key]);
			if (id === null) {
				return null;
			}
			const label = asText(values[`${key}${FORMATTED_VALUE}`]) ?? id;
			const logicalName = asText(values[`${key}${LOOKUP_LOGICAL_NAME}`]);
			return logicalName ? `${label} (${logicalName})` : label;
		}
		case "choice":
		case "boolean":
		case "multiChoice":
			return asText(values[`${name}${FORMATTED_VALUE}`]) ?? asText(values[name]);
		default:
			return asText(values[`${name}${FORMATTED_VALUE}`]) ?? asText(values[name]);
	}
};
