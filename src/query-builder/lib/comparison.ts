import { normalizeGuid } from "@/shared/lib";

import { columnLogicalName, FORMATTED_VALUE_SUFFIX, type QueryRunRecord, type ResultColumn } from "./resultColumn";

export type MatchKey = { kind: "primaryKey" } | { kind: "columns"; columns: readonly string[] };

export interface ComparisonOptions {
	columns: readonly ResultColumn[];
	primaryKey: string;
	matchKey: MatchKey;
	comparedColumns: readonly string[];
}

export interface CellValue {
	raw: unknown;
	friendly: string;
}

export interface ColumnDifference {
	column: string;
	label: string;
	first: CellValue;
	second: CellValue;
}

export interface RecordPair {
	first: QueryRunRecord;
	second: QueryRunRecord;
}

export interface DifferingPair extends RecordPair {
	differences: ColumnDifference[];
}

export interface AmbiguousGroup {
	key: string;
	first: QueryRunRecord[];
	second: QueryRunRecord[];
}

export interface NoKeyRecords {
	first: QueryRunRecord[];
	second: QueryRunRecord[];
}

export interface ComparisonCounts {
	onlyInFirst: number;
	onlyInSecond: number;
	equal: number;
	different: number;
	ambiguous: number;
	noKey: number;
}

export type KeyMatching = "guidIgnoringCaseAndBraces" | "typedWithTextTrimmedAndCaseInsensitive";

export type LookupComparison = "id" | "name";

export interface Comparison {
	onlyInFirst: QueryRunRecord[];
	onlyInSecond: QueryRunRecord[];
	equal: RecordPair[];
	different: DifferingPair[];
	ambiguous: AmbiguousGroup[];
	noKey: NoKeyRecords;
	counts: ComparisonCounts;
	keyMatching: KeyMatching;
	lookupsComparedBy: LookupComparison;
	comparedColumns: ResultColumn[];
}

const BOOKKEEPING_COLUMNS: ReadonlySet<string> = new Set(["createdon", "createdby", "createdonbehalfby", "modifiedon", "modifiedby", "modifiedonbehalfby"]);

const KEY_SEPARATOR = "\u001f";

const single = (records: readonly QueryRunRecord[]): QueryRunRecord | null => (records.length === 1 ? (records[0] ?? null) : null);

export const suggestComparedColumns = (columns: readonly ResultColumn[], primaryKey: string, matchKey: MatchKey): string[] => {
	const keyColumns = new Set(matchKey.kind === "columns" ? matchKey.columns : [primaryKey]);
	return columns
		.filter((column) => {
			if (column.key === primaryKey || keyColumns.has(column.key)) {
				return false;
			}
			const logicalName = columnLogicalName(column.key);
			if (logicalName === "versionnumber") {
				return false;
			}
			return !(matchKey.kind === "columns" && BOOKKEEPING_COLUMNS.has(logicalName));
		})
		.map((column) => column.key);
};

const isEmpty = (value: unknown): boolean => value === null || value === undefined || value === "";

const formattedValue = (record: QueryRunRecord, key: string): string | null => {
	const value = record[`${key}${FORMATTED_VALUE_SUFFIX}`];
	return typeof value === "string" ? value : null;
};

const cellValue = (record: QueryRunRecord, key: string): CellValue => {
	const raw = record[key];
	return { raw: raw ?? null, friendly: formattedValue(record, key) ?? (isEmpty(raw) ? "" : String(raw)) };
};

const normalizeChoice = (value: unknown): string =>
	String(value)
		.split(",")
		.map((part) => part.trim())
		.sort()
		.join(",");

const lookupName = (record: QueryRunRecord, key: string): string | null => {
	const name = formattedValue(record, key);
	return isEmpty(record[key]) || name === null || name === "" ? null : name;
};

const comparableValue = (record: QueryRunRecord, column: ResultColumn, lookupsBy: LookupComparison): string | null => {
	if (column.type === "lookup" && lookupsBy === "name") {
		return lookupName(record, column.key);
	}
	const raw = record[column.key];
	if (isEmpty(raw)) {
		return null;
	}
	switch (column.type) {
		case "number": {
			const value = Number(raw);
			return Number.isNaN(value) ? String(raw) : String(value);
		}
		case "choice":
			return normalizeChoice(raw);
		case "lookup":
		case "uniqueidentifier":
			return normalizeGuid(String(raw));
		default:
			return String(raw);
	}
};

const keyPart = (record: QueryRunRecord, column: ResultColumn): string | null => {
	const value = comparableValue(record, column, "name");
	if (value === null) {
		return null;
	}
	if (column.type === "text" || column.type === "lookup") {
		const text = value.trim().toLowerCase();
		return text === "" ? null : text;
	}
	return value;
};

const recordKey = (record: QueryRunRecord, keyColumns: readonly ResultColumn[] | null, primaryKey: string): string | null => {
	if (keyColumns === null) {
		const id = record[primaryKey];
		return isEmpty(id) ? null : normalizeGuid(String(id));
	}
	const parts = keyColumns.map((column) => keyPart(record, column));
	return parts.every((part) => part === null) ? null : parts.map((part) => part ?? "").join(KEY_SEPARATOR);
};

const indexRecords = (
	records: readonly QueryRunRecord[],
	keyColumns: readonly ResultColumn[] | null,
	primaryKey: string
): { index: Map<string, QueryRunRecord[]>; noKey: QueryRunRecord[] } => {
	const index = new Map<string, QueryRunRecord[]>();
	const noKey: QueryRunRecord[] = [];
	for (const record of records) {
		const key = recordKey(record, keyColumns, primaryKey);
		if (key === null) {
			noKey.push(record);
			continue;
		}
		const group = index.get(key);
		if (group) {
			group.push(record);
		} else {
			index.set(key, [record]);
		}
	}
	return { index, noKey };
};

const resolveColumn = (columnsByKey: ReadonlyMap<string, ResultColumn>, key: string): ResultColumn =>
	columnsByKey.get(key) ?? { key, label: key, type: "text" };

const differences = (first: QueryRunRecord, second: QueryRunRecord, columns: readonly ResultColumn[], lookupsBy: LookupComparison): ColumnDifference[] => {
	const found: ColumnDifference[] = [];
	for (const column of columns) {
		if (comparableValue(first, column, lookupsBy) !== comparableValue(second, column, lookupsBy)) {
			found.push({ column: column.key, label: column.label, first: cellValue(first, column.key), second: cellValue(second, column.key) });
		}
	}
	return found;
};

export const compareQueryRuns = (first: readonly QueryRunRecord[], second: readonly QueryRunRecord[], options: ComparisonOptions): Comparison => {
	const columnsByKey = new Map(options.columns.map((column) => [column.key, column]));
	const keyColumns = options.matchKey.kind === "columns" ? options.matchKey.columns.map((key) => resolveColumn(columnsByKey, key)) : null;
	const excluded = new Set(keyColumns === null ? [options.primaryKey] : keyColumns.map((column) => column.key));
	const comparedColumns = [...new Set(options.comparedColumns)].filter((key) => !excluded.has(key)).map((key) => resolveColumn(columnsByKey, key));
	const lookupsComparedBy: LookupComparison = keyColumns === null ? "id" : "name";

	const firstIndex = indexRecords(first, keyColumns, options.primaryKey);
	const secondIndex = indexRecords(second, keyColumns, options.primaryKey);

	const onlyInFirst: QueryRunRecord[] = [];
	const onlyInSecond: QueryRunRecord[] = [];
	const equal: RecordPair[] = [];
	const different: DifferingPair[] = [];
	const ambiguous: AmbiguousGroup[] = [];

	for (const [key, firstRecords] of firstIndex.index) {
		const secondRecords = secondIndex.index.get(key) ?? [];
		const firstRecord = single(firstRecords);
		const secondRecord = single(secondRecords);
		if (firstRecord === null || (secondRecords.length > 0 && secondRecord === null)) {
			ambiguous.push({ key, first: firstRecords, second: secondRecords });
		} else if (secondRecord === null) {
			onlyInFirst.push(firstRecord);
		} else {
			const found = differences(firstRecord, secondRecord, comparedColumns, lookupsComparedBy);
			if (found.length === 0) {
				equal.push({ first: firstRecord, second: secondRecord });
			} else {
				different.push({ first: firstRecord, second: secondRecord, differences: found });
			}
		}
	}

	for (const [key, secondRecords] of secondIndex.index) {
		if (firstIndex.index.has(key)) {
			continue;
		}
		const secondRecord = single(secondRecords);
		if (secondRecord === null) {
			ambiguous.push({ key, first: [], second: secondRecords });
		} else {
			onlyInSecond.push(secondRecord);
		}
	}

	const noKey = { first: firstIndex.noKey, second: secondIndex.noKey };

	return {
		onlyInFirst,
		onlyInSecond,
		equal,
		different,
		ambiguous,
		noKey,
		counts: {
			onlyInFirst: onlyInFirst.length,
			onlyInSecond: onlyInSecond.length,
			equal: equal.length,
			different: different.length,
			ambiguous: ambiguous.length,
			noKey: noKey.first.length + noKey.second.length,
		},
		keyMatching: keyColumns === null ? "guidIgnoringCaseAndBraces" : "typedWithTextTrimmedAndCaseInsensitive",
		lookupsComparedBy,
		comparedColumns,
	};
};
