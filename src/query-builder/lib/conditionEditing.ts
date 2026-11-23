import {
	attributeValue,
	createElement,
	type FetchXmlDocument,
	insertChild,
	type NodePath,
	OPERATORS,
	type OperatorDefinition,
	operatorDefinition,
	type OperatorValueCount,
	operatorsFor,
	type QueryMetadata,
	removeAttribute,
	removeNode,
	setAttribute,
	valueOfColumns,
	type XmlElement,
} from "@/shared/lib/fetchxml";
import { type QueryColumn } from "@/shared/types";

import { attributeSteps, editAt, type EditStep, elementAtPath } from "./attributeEdits";
import { type PickerOption } from "./pickerSearch";
import { type NamesLead } from "./rowSummary";
import { type ChangeResult } from "./treeEdits";

export type ValueEditorKind = "none" | "choice" | "yesNo" | "date" | "number" | "integer" | "lookup" | "text";

export interface ValueEditor {
	readonly kind: ValueEditorKind;
	readonly count: OperatorValueCount;
}

export interface LookupValue {
	readonly id: string;
	readonly name: string;
	readonly table: string;
}

const NO_VALUE: ValueEditor = { kind: "none", count: "none" };

const OPERATOR_KEYS: Readonly<Record<string, readonly string[]>> = {
	eq: ["equals", "is", "="],
	ne: ["not equals", "is not", "!=", "<>"],
	gt: [">", "greater than", "after"],
	ge: [">=", "at least"],
	lt: ["<", "less than", "before"],
	le: ["<=", "at most"],
	null: ["empty", "blank", "is null"],
	"not-null": ["not empty", "contains data", "has a value"],
	like: ["contains", "pattern", "wildcard"],
	"not-like": ["does not contain"],
	in: ["one of", "any of"],
	"not-in": ["none of"],
	between: ["range"],
};

const GUID = /^\{?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}?$/i;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const conditionOperators = (column: QueryColumn | undefined): readonly OperatorDefinition[] => {
	const type = column?.columnType ?? null;
	const candidates = type === null ? OPERATORS : operatorsFor(type);
	return candidates.filter((operator) => !operator.deprecated && !(operator.requiresTime && column?.dateOnly === true));
};

export const operatorOptions = (column: QueryColumn | undefined): PickerOption[] =>
	conditionOperators(column).map((operator) => ({
		value: operator.name,
		text: operator.name,
		secondary: operator.meaning,
		keys: OPERATOR_KEYS[operator.name],
	}));

export const valueEditorFor = (column: QueryColumn | undefined, operatorName: string | undefined): ValueEditor => {
	const operator = operatorDefinition((operatorName ?? "").trim());
	const count = operator?.values ?? "one";
	if (count === "none") {
		return NO_VALUE;
	}
	if (operator?.valueKind === "integer") {
		return { kind: "integer", count };
	}
	switch (column?.columnType ?? null) {
		case "choice":
		case "multiChoice":
		case "stateOrStatus":
			return { kind: "choice", count };
		case "yesNo":
			return { kind: "yesNo", count };
		case "dateTime":
			return { kind: "date", count };
		case "wholeNumber":
		case "decimalOrMoney":
			return { kind: "number", count };
		case "lookup":
		case "owner":
			return { kind: count === "one" ? "lookup" : "text", count };
		case "uniqueIdentifier":
			return { kind: count === "one" && column?.isPrimaryId === true ? "lookup" : "text", count };
		default:
			return { kind: "text", count };
	}
};

const valueTextOf = (element: XmlElement): string => element.children.map((child) => (child.kind === "text" ? child.value : "")).join("");

const valueChildren = (element: XmlElement): number[] =>
	element.children.flatMap((child, index) => (child.kind === "element" && child.name === "value" ? [index] : []));

export const conditionValues = (element: XmlElement): readonly string[] => {
	const listed = element.children.flatMap((child) => (child.kind === "element" && child.name === "value" && !child.excluded ? [valueTextOf(child)] : []));
	if (listed.length > 0) {
		return listed;
	}
	const single = attributeValue(element, "value");
	return single === undefined ? [] : [single];
};

export const normalizeYesNo = (value: string): string => {
	const lower = value.trim().toLowerCase();
	return lower === "true" ? "1" : lower === "false" ? "0" : value.trim();
};

export const valueFits = (value: string, kind: ValueEditorKind, column: QueryColumn | undefined): boolean => {
	const trimmed = value.trim();
	if (trimmed === "") {
		return false;
	}
	switch (kind) {
		case "none":
			return false;
		case "choice":
			return column === undefined || column.options.length === 0 || column.options.some((option) => String(option.value) === trimmed);
		case "yesNo":
			return ["0", "1"].includes(normalizeYesNo(trimmed));
		case "date":
			return !Number.isNaN(Date.parse(trimmed));
		case "number":
			return Number.isFinite(Number(trimmed));
		case "integer":
			return /^-?\d+$/.test(trimmed);
		case "lookup":
			return GUID.test(trimmed);
		case "text":
			return true;
	}
};

export const fitValues = (values: readonly string[], editor: ValueEditor, column: QueryColumn | undefined): string[] => {
	const kept = values.filter((value) => valueFits(value, editor.kind, column));
	switch (editor.count) {
		case "none":
			return [];
		case "one":
			return kept.slice(0, 1);
		case "two":
			return kept.slice(0, 2);
		case "list":
			return kept;
	}
};

export const isDateInputValue = (value: string): boolean => value === "" || DATE.test(value.trim());

export const parseListValues = (text: string): string[] =>
	text
		.split(text.includes("\n") ? /\r?\n/ : ",")
		.map((part) => part.trim())
		.filter((part) => part !== "");

const valueSteps = (path: NodePath, element: XmlElement, values: readonly string[], count: OperatorValueCount): EditStep[] => {
	const removals: EditStep[] = valueChildren(element)
		.reverse()
		.map((index) => (document) => removeNode(document, [...path, index]));
	const clearAttribute: EditStep = (document) => removeAttribute(document, path, "value");
	const remaining = element.children.length - valueChildren(element).length;
	if (count === "one") {
		const first = values[0];
		return [...removals, first === undefined ? clearAttribute : (document) => setAttribute(document, path, "value", first)];
	}
	const inserts: EditStep[] =
		count === "none"
			? []
			: values.map(
					(value, offset) => (document) => insertChild(document, path, remaining + offset, createElement("value", [], [{ kind: "text", value }]))
				);
	return [...removals, clearAttribute, ...inserts];
};

const sameValues = (left: readonly string[], right: readonly string[]): boolean =>
	left.length === right.length && left.every((value, index) => value === right[index]);

interface ConditionTarget {
	readonly columnName: string;
	readonly operator: string;
	readonly column: QueryColumn | undefined;
}

const retarget = (document: FetchXmlDocument, path: NodePath, target: ConditionTarget): ChangeResult => {
	const element = elementAtPath(document, path);
	if (!element) {
		return { ok: false, reason: "There is no element at that path" };
	}
	const editor = valueEditorFor(target.column, target.operator);
	const before = conditionValues(element);
	const values = fitValues(before, editor, target.column);
	const keepLookup = editor.kind === "lookup" && sameValues(before, values) && (attributeValue(element, "attribute") ?? "") === target.columnName;
	const keepValueOf = editor.count === "one" && attributeValue(element, "valueof") !== undefined;
	const steps: EditStep[] = [
		...attributeSteps(path, { attribute: target.columnName, operator: target.operator }),
		...(keepValueOf ? [] : valueSteps(path, element, values, editor.count)),
		...attributeSteps(path, {
			...(keepLookup ? {} : { uiname: null, uitype: null }),
			...(keepValueOf ? {} : { valueof: null }),
		}),
	];
	return editAt(document, path, steps);
};

export const changeConditionColumn = (document: FetchXmlDocument, path: NodePath, columnName: string, column: QueryColumn | undefined): ChangeResult => {
	const element = elementAtPath(document, path);
	if (!element) {
		return { ok: false, reason: "There is no element at that path" };
	}
	const current = (attributeValue(element, "operator") ?? "").trim();
	const offered = conditionOperators(column);
	const operator = column === undefined || offered.some((each) => each.name === current) ? current : (offered[0]?.name ?? current);
	return retarget(document, path, { columnName, operator, column });
};

export const changeConditionOperator = (document: FetchXmlDocument, path: NodePath, operator: string, column: QueryColumn | undefined): ChangeResult => {
	const element = elementAtPath(document, path);
	if (!element) {
		return { ok: false, reason: "There is no element at that path" };
	}
	return retarget(document, path, { columnName: attributeValue(element, "attribute") ?? "", operator, column });
};

export const setConditionValues = (document: FetchXmlDocument, path: NodePath, values: readonly string[], editor: ValueEditor): ChangeResult => {
	const element = elementAtPath(document, path);
	if (!element) {
		return { ok: false, reason: "There is no element at that path" };
	}
	const cleaned = values.map((value) => value.trim());
	const kept = editor.count === "two" ? cleaned : cleaned.filter((value) => value !== "");
	if (sameValues(conditionValues(element), kept) && !(editor.count === "one" && valueChildren(element).length > 0)) {
		return { ok: false, reason: "Nothing changed" };
	}
	return editAt(document, path, [...valueSteps(path, element, kept, editor.count), ...attributeSteps(path, { uiname: null, uitype: null })]);
};

export const conditionLookup = (element: XmlElement, fallbackTable: string): LookupValue | null => {
	const id = attributeValue(element, "value")?.trim();
	if (id === undefined || id === "") {
		return null;
	}
	return { id, name: attributeValue(element, "uiname")?.trim() || id, table: attributeValue(element, "uitype")?.trim() || fallbackTable };
};

export const setConditionLookup = (document: FetchXmlDocument, path: NodePath, lookup: LookupValue | null): ChangeResult => {
	const element = elementAtPath(document, path);
	if (!element) {
		return { ok: false, reason: "There is no element at that path" };
	}
	return editAt(document, path, [
		...valueSteps(path, element, lookup ? [lookup.id] : [], "one"),
		...attributeSteps(path, lookup ? { uiname: lookup.name, uitype: lookup.table } : { uiname: null, uitype: null }),
	]);
};

export const valueOfOptions = (document: FetchXmlDocument, path: NodePath, metadata: QueryMetadata, lead: NamesLead): PickerOption[] =>
	valueOfColumns(document, path, metadata)
		.filter((entry) => entry.column.attributeOf === null)
		.map((entry) => {
			const prefix = entry.reference.slice(0, entry.reference.length - entry.column.logicalName.length);
			const display = entry.column.displayName.trim() === "" ? entry.column.logicalName : entry.column.displayName;
			return lead === "display"
				? { value: entry.reference, text: `${prefix}${display}`, secondary: entry.reference, keys: [entry.reference] }
				: { value: entry.reference, text: entry.reference, secondary: display, keys: [display] };
		});

export const defaultValueOf = (document: FetchXmlDocument, path: NodePath, metadata: QueryMetadata, column: QueryColumn | undefined): string => {
	const own = (column?.logicalName ?? "").toLowerCase();
	const candidates = valueOfColumns(document, path, metadata).filter((entry) => entry.column.attributeOf === null && entry.reference.toLowerCase() !== own);
	const sameType = candidates.find((entry) => column?.columnType != null && entry.column.columnType === column.columnType);
	return (sameType ?? candidates[0])?.reference ?? "";
};

export const setConditionValueOf = (document: FetchXmlDocument, path: NodePath, reference: string | null): ChangeResult => {
	const element = elementAtPath(document, path);
	if (!element) {
		return { ok: false, reason: "There is no element at that path" };
	}
	if (reference === null) {
		return editAt(document, path, attributeSteps(path, { valueof: null }));
	}
	return editAt(document, path, [...valueSteps(path, element, [], "one"), ...attributeSteps(path, { uiname: null, uitype: null, valueof: reference })]);
};
