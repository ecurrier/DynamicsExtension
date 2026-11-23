import { type FetchXmlDocument } from "@/shared/lib/fetchxml";
import { type QueryRow } from "@/shared/types";

import { type MatchKey, suggestComparedColumns } from "./comparison";
import { deriveResultColumns, type ResultGridColumn, type ResultTables } from "./results";

export type MatchKeyKind = "primaryKey" | "columns";

export type CompareSide = "first" | "second";

export interface CompareSetup {
	firstKey: string | null;
	secondKey: string | null;
	matchKeyKind: MatchKeyKind;
	keyColumns: readonly string[];
	comparedColumns: readonly string[] | null;
}

export const DEFAULT_COMPARE_SETUP: CompareSetup = {
	firstKey: null,
	secondKey: null,
	matchKeyKind: "primaryKey",
	keyColumns: [],
	comparedColumns: null,
};

export interface ResolvedCompareSetup {
	firstKey: string;
	secondKey: string;
	primaryKey: string;
	matchKey: MatchKey;
	keyColumns: ResultGridColumn[];
	comparedColumns: string[];
}

export type CompareAvailability = { ok: true } | { ok: false; reason: string };

const isTrue = (value: string | undefined): boolean => value !== undefined && ["true", "1"].includes(value.trim().toLowerCase());

const fetchAttribute = (query: FetchXmlDocument, name: string): string | undefined => query.root.attributes.find((attribute) => attribute.name === name)?.value;

export const compareAvailability = (query: FetchXmlDocument | null): CompareAvailability => {
	if (!query || query.root.name !== "fetch") {
		return { ok: false, reason: "The Query does not parse. Correct the Fetch XML to compare its Query Runs." };
	}
	if (isTrue(fetchAttribute(query, "aggregate"))) {
		return { ok: false, reason: 'A Comparison cannot use a Query with aggregate="true", because its rows are totals, not Records.' };
	}
	if ((fetchAttribute(query, "top")?.trim() ?? "") !== "") {
		return { ok: false, reason: "A Comparison cannot use a Query with top, because top returns only some of the Records." };
	}
	return { ok: true };
};

export const comparePair = (setup: Pick<CompareSetup, "firstKey" | "secondKey">, keys: readonly string[]): [string, string] | null => {
	const first = setup.firstKey !== null && keys.includes(setup.firstKey) ? setup.firstKey : keys[0];
	if (first === undefined) {
		return null;
	}
	const second =
		setup.secondKey !== null && setup.secondKey !== first && keys.includes(setup.secondKey) ? setup.secondKey : keys.find((key) => key !== first);
	return second === undefined ? null : [first, second];
};

export const chooseCompareSide = (setup: CompareSetup, keys: readonly string[], side: CompareSide, key: string): CompareSetup => {
	const pair = comparePair(setup, keys);
	if (!pair) {
		return setup;
	}
	const [first, second] = pair;
	if (side === "first") {
		return { ...setup, firstKey: key, secondKey: key === second ? first : second };
	}
	return { ...setup, firstKey: key === first ? second : first, secondKey: key };
};

const isRootColumn = (column: ResultGridColumn): boolean => !column.key.includes(".");

export const compareColumns = (
	query: FetchXmlDocument | null,
	first: readonly QueryRow[],
	second: readonly QueryRow[],
	tables: ResultTables
): ResultGridColumn[] => deriveResultColumns(query, second.length === 0 ? first : first.length === 0 ? second : first.concat(second), tables);

export const primaryKeyOf = (columns: readonly ResultGridColumn[], rootTable: string | null, tables: ResultTables): string | null => {
	const fromColumns = columns.find((column) => column.primaryKey && isRootColumn(column));
	if (fromColumns) {
		return fromColumns.key;
	}
	if (!rootTable) {
		return null;
	}
	return tables[rootTable.toLowerCase()]?.primaryIdAttribute ?? `${rootTable.toLowerCase()}id`;
};

export const keyColumnChoices = (columns: readonly ResultGridColumn[], primaryKey: string | null): ResultGridColumn[] =>
	columns.filter((column) => isRootColumn(column) && column.key !== primaryKey);

const matchKeyOf = (setup: CompareSetup, choices: readonly ResultGridColumn[]): MatchKey => {
	if (setup.matchKeyKind === "primaryKey") {
		return { kind: "primaryKey" };
	}
	const available = new Set(choices.map((column) => column.key));
	return { kind: "columns", columns: setup.keyColumns.filter((key) => available.has(key)) };
};

export const comparedColumnChoices = (columns: readonly ResultGridColumn[], primaryKey: string | null, matchKey: MatchKey): ResultGridColumn[] => {
	const keyColumns = new Set(matchKey.kind === "columns" ? matchKey.columns : []);
	return columns.filter((column) => column.key !== primaryKey && !keyColumns.has(column.key));
};

export const effectiveComparedColumns = (
	setup: CompareSetup,
	columns: readonly ResultGridColumn[],
	primaryKey: string | null,
	matchKey: MatchKey
): string[] => {
	const choices = comparedColumnChoices(columns, primaryKey, matchKey);
	if (setup.comparedColumns === null) {
		const allowed = new Set(choices.map((column) => column.key));
		return suggestComparedColumns(columns, primaryKey ?? "", matchKey).filter((key) => allowed.has(key));
	}
	const chosen = new Set(setup.comparedColumns);
	return choices.filter((column) => chosen.has(column.key)).map((column) => column.key);
};

export interface CompareSetupContext {
	keys: readonly string[];
	columns: readonly ResultGridColumn[];
	primaryKey: string | null;
}

export type CompareSetupResolution = { ok: true; setup: ResolvedCompareSetup } | { ok: false; reason: string };

export const resolveCompareSetup = (setup: CompareSetup, { keys, columns, primaryKey }: CompareSetupContext): CompareSetupResolution => {
	const pair = comparePair(setup, keys);
	if (!pair) {
		return { ok: false, reason: "Add a second Connection to compare." };
	}
	if (!primaryKey) {
		return { ok: false, reason: "The Query has no Table." };
	}
	const choices = keyColumnChoices(columns, primaryKey);
	const matchKey = matchKeyOf(setup, choices);
	if (matchKey.kind === "columns" && matchKey.columns.length === 0) {
		return { ok: false, reason: "Select one or more Columns for the Match Key." };
	}
	const comparedColumns = effectiveComparedColumns(setup, columns, primaryKey, matchKey);
	if (comparedColumns.length === 0) {
		return { ok: false, reason: "Select one or more Columns to compare." };
	}
	return {
		ok: true,
		setup: {
			firstKey: pair[0],
			secondKey: pair[1],
			primaryKey,
			matchKey,
			keyColumns: matchKey.kind === "columns" ? matchKey.columns.flatMap((key) => choices.filter((column) => column.key === key)) : [],
			comparedColumns,
		},
	};
};

const sameList = (left: readonly string[] | null, right: readonly string[] | null): boolean =>
	left === right || (left !== null && right !== null && left.length === right.length && left.every((value, index) => value === right[index]));

export const sameCompareSetup = (left: CompareSetup, right: CompareSetup): boolean =>
	left.firstKey === right.firstKey &&
	left.secondKey === right.secondKey &&
	left.matchKeyKind === right.matchKeyKind &&
	sameList(left.keyColumns, right.keyColumns) &&
	sameList(left.comparedColumns, right.comparedColumns);
