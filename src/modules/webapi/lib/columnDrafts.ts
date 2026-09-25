import { type LookupSelection } from "@/shared/types";

import { dateMode, type DateMode, type RecordColumn } from "./recordColumns";

export type DraftValue =
	| { kind: "text"; text: string }
	| { kind: "option"; value: number | null }
	| { kind: "options"; values: number[] }
	| { kind: "lookup"; value: LookupSelection | null };

export type Drafts = Readonly<Record<string, DraftValue>>;

export type DraftCheck = { ok: true; payload: Record<string, unknown>; cleared: boolean } | { ok: false; message: string };

export interface InvalidDraft {
	logicalName: string;
	message: string;
}

export interface SavePayload {
	payload: Record<string, unknown>;
	count: number;
	invalid: InvalidDraft[];
}

const INTEGER_TYPES = ["Integer", "BigInt"];
const REQUIRED_LEVELS = ["ApplicationRequired", "SystemRequired"];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

const pad = (value: number): string => String(value).padStart(2, "0");

const localDate = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const localDateTime = (date: Date): string => `${localDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

export const toDateInput = (mode: DateMode, raw: string | null): string => {
	if (!raw) {
		return "";
	}
	if (mode === "dateOnly" || mode === "floatingDate") {
		return raw.slice(0, 10);
	}
	if (mode === "floatingDateTime") {
		return raw.slice(0, 16);
	}
	const parsed = new Date(raw);
	if (Number.isNaN(parsed.getTime())) {
		return "";
	}
	return mode === "localDate" ? localDate(parsed) : localDateTime(parsed);
};

export const fromDateInput = (mode: DateMode, text: string): string | null => {
	const value = text.trim();
	const dateOnly = mode === "dateOnly" || mode === "localDate" || mode === "floatingDate";
	if (!(dateOnly ? DATE_PATTERN : DATE_TIME_PATTERN).test(value)) {
		return null;
	}
	if (mode === "dateOnly") {
		return value;
	}
	if (mode === "floatingDate") {
		return `${value}T00:00:00Z`;
	}
	if (mode === "floatingDateTime") {
		return value.length === 16 ? `${value}:00Z` : `${value}Z`;
	}
	const parsed = new Date(mode === "localDate" ? `${value}T00:00` : value);
	return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

export const loadedDraft = (row: RecordColumn): DraftValue | null => {
	const raw = row.rawValue;
	switch (row.editor) {
		case "text":
		case "memo":
		case "number":
			return { kind: "text", text: raw ?? "" };
		case "date":
		case "dateTime":
			return { kind: "text", text: toDateInput(dateMode(row.column), raw) };
		case "choice":
			return { kind: "option", value: raw === null ? null : Number(raw) };
		case "boolean":
			return { kind: "option", value: raw === "true" ? 1 : raw === "false" ? 0 : null };
		case "multiChoice":
			return { kind: "options", values: raw ? raw.split(",").map((value) => Number(value.trim())) : [] };
		case "lookup":
			return { kind: "lookup", value: row.lookup ? { ...row.lookup } : null };
		case null:
			return null;
	}
};

const sameNumbers = (left: number[], right: number[]): boolean => {
	if (left.length !== right.length) {
		return false;
	}
	const sorted = [...right].sort((a, b) => a - b);
	return [...left].sort((a, b) => a - b).every((value, index) => value === sorted[index]);
};

const sameText = (row: RecordColumn, left: string, right: string): boolean => {
	if (row.editor === "number" && left.trim() !== "" && right.trim() !== "") {
		const leftNumber = Number(left.trim());
		const rightNumber = Number(right.trim());
		if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) {
			return leftNumber === rightNumber;
		}
	}
	return row.editor === "text" || row.editor === "memo" ? left === right : left.trim() === right.trim();
};

export const draftsEqual = (row: RecordColumn, left: DraftValue, right: DraftValue): boolean => {
	if (left.kind === "text" && right.kind === "text") {
		return sameText(row, left.text, right.text);
	}
	if (left.kind === "option" && right.kind === "option") {
		return left.value === right.value;
	}
	if (left.kind === "options" && right.kind === "options") {
		return sameNumbers(left.values, right.values);
	}
	if (left.kind === "lookup" && right.kind === "lookup") {
		return left.value?.id.toLowerCase() === right.value?.id.toLowerCase() && left.value?.entityLogicalName === right.value?.entityLogicalName;
	}
	return false;
};

export const isDraftChanged = (row: RecordColumn, draft: DraftValue): boolean => {
	const loaded = loadedDraft(row);
	return loaded !== null && !draftsEqual(row, draft, loaded);
};

export const removeDraft = (drafts: Drafts, logicalName: string): Drafts => {
	const { [logicalName]: _removed, ...rest } = drafts;
	return rest;
};

export const applyDraft = (drafts: Drafts, row: RecordColumn, draft: DraftValue): Drafts =>
	isDraftChanged(row, draft) ? { ...drafts, [row.logicalName]: draft } : removeDraft(drafts, row.logicalName);

export const reconcileDrafts = (drafts: Drafts, rows: RecordColumn[]): Drafts => {
	const byName = new Map(rows.map((row) => [row.logicalName, row]));
	return Object.fromEntries(
		Object.entries(drafts).filter(([logicalName, draft]) => {
			const row = byName.get(logicalName);
			return row !== undefined && row.editor !== null && isDraftChanged(row, draft);
		})
	);
};

export const isDraftCleared = (draft: DraftValue): boolean => {
	switch (draft.kind) {
		case "text":
			return draft.text.trim() === "";
		case "option":
			return draft.value === null;
		case "options":
			return draft.values.length === 0;
		case "lookup":
			return draft.value === null;
	}
};

export const isRequiredCleared = (row: RecordColumn, draft: DraftValue): boolean => isDraftCleared(draft) && REQUIRED_LEVELS.includes(row.requiredLevel);

const clearPayload = (row: RecordColumn): Record<string, unknown> => {
	if (row.editor !== "lookup") {
		return { [row.logicalName]: null };
	}
	const navigationProperty = row.lookup?.navigationProperty ?? row.column.targets[0]?.navigationProperty ?? row.logicalName;
	return { [`${navigationProperty}@odata.bind`]: null };
};

const fail = (message: string): DraftCheck => ({ ok: false, message });

const pass = (payload: Record<string, unknown>): DraftCheck => ({ ok: true, payload, cleared: false });

const checkText = (row: RecordColumn, text: string): DraftCheck => {
	switch (row.editor) {
		case "number": {
			const parsed = Number(text.trim());
			if (Number.isNaN(parsed)) {
				return fail("Enter a number");
			}
			if (INTEGER_TYPES.includes(row.column.attributeType) && !Number.isInteger(parsed)) {
				return fail("Enter a whole number");
			}
			return pass({ [row.logicalName]: parsed });
		}
		case "date":
		case "dateTime": {
			const value = fromDateInput(dateMode(row.column), text);
			return value === null ? fail(row.editor === "date" ? "Enter a valid date" : "Enter a valid date and time") : pass({ [row.logicalName]: value });
		}
		default: {
			const maxLength = row.column.maxLength;
			return maxLength !== null && text.length > maxLength ? fail(`Enter at most ${maxLength} characters`) : pass({ [row.logicalName]: text });
		}
	}
};

export const checkDraft = (row: RecordColumn, draft: DraftValue): DraftCheck => {
	if (isDraftCleared(draft)) {
		return { ok: true, payload: clearPayload(row), cleared: true };
	}
	switch (draft.kind) {
		case "text":
			return checkText(row, draft.text);
		case "option":
			return pass({ [row.logicalName]: row.editor === "boolean" ? draft.value === 1 : draft.value });
		case "options":
			return pass({ [row.logicalName]: draft.values.join(",") });
		case "lookup": {
			const value = draft.value;
			if (!value?.entitySetName) {
				return fail("The selected record's table could not be resolved");
			}
			return pass({ [`${value.navigationProperty}@odata.bind`]: `/${value.entitySetName}(${value.id})` });
		}
	}
};

export const buildSavePayload = (rows: RecordColumn[], drafts: Drafts): SavePayload => {
	const payload: Record<string, unknown> = {};
	const invalid: InvalidDraft[] = [];
	let count = 0;
	for (const row of rows) {
		const draft = drafts[row.logicalName];
		if (!draft || row.editor === null) {
			continue;
		}
		const result = checkDraft(row, draft);
		if (result.ok) {
			Object.assign(payload, result.payload);
			count += 1;
		} else {
			invalid.push({ logicalName: row.logicalName, message: result.message });
		}
	}
	return { payload, count, invalid };
};

const optionLabel = (row: RecordColumn, value: number): string =>
	row.column.optionSet?.options.find((option) => option.value === value)?.label ?? String(value);

export const describeDraft = (row: RecordColumn, draft: DraftValue): string | null => {
	if (isDraftCleared(draft)) {
		return null;
	}
	switch (draft.kind) {
		case "text":
			return draft.text;
		case "option":
			return draft.value === null ? null : optionLabel(row, draft.value);
		case "options":
			return draft.values.map((value) => optionLabel(row, value)).join("; ");
		case "lookup":
			return draft.value?.name ?? null;
	}
};
