import { columnKind } from "@/modules/codegen/lib";
import { type CodegenColumn, type CodegenLookupTarget, type CodegenTable, type ColumnRequiredLevel, type RecordValues } from "@/shared/types";

export type EditorKind = "text" | "memo" | "number" | "date" | "dateTime" | "choice" | "boolean" | "multiChoice" | "lookup";

export type ReadOnlyReason = "primaryKey" | "notUpdatable" | "unsupported";

export type DateMode = "dateOnly" | "localDate" | "localDateTime" | "floatingDate" | "floatingDateTime";

export interface LoadedLookup {
	id: string;
	name: string;
	entityLogicalName: string;
	entitySetName: string;
	navigationProperty: string;
}

export interface RecordColumn {
	logicalName: string;
	displayName: string;
	column: CodegenColumn;
	editor: EditorKind | null;
	readOnlyReason: ReadOnlyReason | null;
	displayValue: string | null;
	rawValue: string | null;
	lookup: LoadedLookup | null;
	onForm: boolean | null;
	isCustom: boolean;
	requiredLevel: ColumnRequiredLevel;
}

export type RecordColumnFilter = "changed" | "hasValue" | "notOnForm" | "editable" | "custom";

export type RecordColumnSort = "displayName" | "logicalName";

const FORMATTED_VALUE = "@OData.Community.Display.V1.FormattedValue";
const LOOKUP_LOGICAL_NAME = "@Microsoft.Dynamics.CRM.lookuplogicalname";

const EDITORS: Partial<Record<ReturnType<typeof columnKind>, EditorKind>> = {
	string: "text",
	memo: "memo",
	integer: "number",
	bigint: "number",
	decimal: "number",
	double: "number",
	money: "number",
	dateOnly: "date",
	dateTime: "dateTime",
	choice: "choice",
	boolean: "boolean",
	multiChoice: "multiChoice",
	lookup: "lookup",
};

const asText = (value: unknown): string | null =>
	value === null || value === undefined || value === "" ? null : typeof value === "object" ? JSON.stringify(value) : String(value);

export const lookupValueKey = (logicalName: string): string => `_${logicalName}_value`;

export const valueKey = (column: CodegenColumn): string => (columnKind(column) === "lookup" ? lookupValueKey(column.logicalName) : column.logicalName);

export const dateMode = (column: CodegenColumn): DateMode => {
	if (column.dateTimeBehavior === "DateOnly") {
		return "dateOnly";
	}
	const dateOnlyFormat = column.dateTimeFormat === "DateOnly";
	if (column.dateTimeBehavior === "TimeZoneIndependent") {
		return dateOnlyFormat ? "floatingDate" : "floatingDateTime";
	}
	return dateOnlyFormat ? "localDate" : "localDateTime";
};

const editorFor = (column: CodegenColumn): EditorKind | null => {
	const editor = EDITORS[columnKind(column)] ?? null;
	if (editor === "dateTime" && column.dateTimeFormat === "DateOnly") {
		return "date";
	}
	if (editor === "lookup" && column.targets.length === 0) {
		return null;
	}
	return editor;
};

const readOnlyReason = (column: CodegenColumn, editor: EditorKind | null): ReadOnlyReason | null => {
	if (column.isPrimaryId) {
		return "primaryKey";
	}
	if (editor === null) {
		return "unsupported";
	}
	return column.isValidForUpdate ? null : "notUpdatable";
};

const loadedTarget = (column: CodegenColumn, values: RecordValues): CodegenLookupTarget | null => {
	const logicalName = asText(values[`${lookupValueKey(column.logicalName)}${LOOKUP_LOGICAL_NAME}`]);
	return column.targets.find((target) => target.logicalName === logicalName) ?? column.targets[0] ?? null;
};

const loadedLookup = (column: CodegenColumn, values: RecordValues): LoadedLookup | null => {
	const key = lookupValueKey(column.logicalName);
	const id = asText(values[key]);
	const target = loadedTarget(column, values);
	if (!id || !target) {
		return null;
	}
	return {
		id,
		name: asText(values[`${key}${FORMATTED_VALUE}`]) ?? id,
		entityLogicalName: asText(values[`${key}${LOOKUP_LOGICAL_NAME}`]) ?? target.logicalName,
		entitySetName: target.entitySetName ?? "",
		navigationProperty: target.navigationProperty,
	};
};

const displayValue = (column: CodegenColumn, values: RecordValues): string | null => {
	const key = valueKey(column);
	const raw = values[key];
	if (raw === null || raw === undefined || raw === "") {
		return null;
	}
	const kind = columnKind(column);
	if (kind === "image") {
		return "Image";
	}
	return asText(values[`${key}${FORMATTED_VALUE}`]) ?? (kind === "file" ? "File" : asText(raw));
};

const rawValue = (column: CodegenColumn, values: RecordValues): string | null => (columnKind(column) === "image" ? null : asText(values[valueKey(column)]));

const isShown = (column: CodegenColumn): boolean => column.attributeOf === null && column.isValidForRead;

export const buildRecordColumns = (table: CodegenTable, values: RecordValues, formAttributes: ReadonlySet<string> | null): RecordColumn[] =>
	table.columns.filter(isShown).map((column) => {
		const editor = editorFor(column);
		const reason = readOnlyReason(column, editor);
		return {
			logicalName: column.logicalName,
			displayName: column.displayName,
			column,
			editor: reason === null ? editor : null,
			readOnlyReason: reason,
			displayValue: displayValue(column, values),
			rawValue: rawValue(column, values),
			lookup: editor === "lookup" ? loadedLookup(column, values) : null,
			onForm: formAttributes ? formAttributes.has(column.logicalName) : null,
			isCustom: column.isCustom,
			requiredLevel: column.requiredLevel,
		};
	});

export const recordColumnSearchFields = (row: RecordColumn): (string | null)[] => [
	row.displayName,
	row.logicalName,
	row.displayValue,
	row.rawValue,
	row.lookup?.entityLogicalName ?? null,
];

export const copyText = (row: RecordColumn): string | null => row.lookup?.id ?? row.displayValue;

export const matchesRecordColumnFilters = (row: RecordColumn, filters: ReadonlySet<RecordColumnFilter>, changed: ReadonlySet<string>): boolean => {
	for (const filter of filters) {
		const matches =
			filter === "changed"
				? changed.has(row.logicalName)
				: filter === "hasValue"
					? row.rawValue !== null || row.displayValue !== null
					: filter === "notOnForm"
						? row.onForm === false
						: filter === "editable"
							? row.editor !== null
							: row.isCustom;
		if (!matches) {
			return false;
		}
	}
	return true;
};

export const sortRecordColumns = (rows: RecordColumn[], sort: RecordColumnSort): RecordColumn[] =>
	[...rows].sort((left, right) =>
		sort === "logicalName"
			? left.logicalName.localeCompare(right.logicalName)
			: left.displayName.localeCompare(right.displayName, undefined, { sensitivity: "base" }) || left.logicalName.localeCompare(right.logicalName)
	);

export const readOnlyLabel = (reason: ReadOnlyReason): string =>
	reason === "primaryKey" ? "Primary key" : reason === "notUpdatable" ? "Not valid for update" : "This column type cannot be edited here";
