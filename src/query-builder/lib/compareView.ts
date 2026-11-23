import { type QueryRow } from "@/shared/types";

import { type ComparedSide, type StoredComparison } from "./compareFlow";
import { type CellValue, type ComparisonCounts, type MatchKey } from "./comparison";
import { FORMATTED_VALUE_SUFFIX, type QueryRunRecord, type ResultColumn } from "./resultColumn";
import { cellText, cellValueText, type ResultGridColumn } from "./results";
import { type DisplayWindow } from "./resultsView";

export type ComparisonBucket = "onlyInFirst" | "onlyInSecond" | "different" | "equal" | "ambiguous" | "noKey";

export const COMPARISON_BUCKETS: readonly ComparisonBucket[] = ["onlyInFirst", "onlyInSecond", "different", "equal", "ambiguous", "noKey"];

const DEFAULT_ORDER: readonly ComparisonBucket[] = ["different", "onlyInFirst", "onlyInSecond", "equal", "ambiguous", "noKey"];

export const defaultBucket = (counts: ComparisonCounts): ComparisonBucket => DEFAULT_ORDER.find((bucket) => counts[bucket] > 0) ?? "equal";

export const bucketLabel = (bucket: ComparisonBucket, firstName: string, secondName: string): string => {
	switch (bucket) {
		case "onlyInFirst":
			return `Only in ${firstName}`;
		case "onlyInSecond":
			return `Only in ${secondName}`;
		case "different":
			return "Different";
		case "equal":
			return "Same";
		case "ambiguous":
			return "Ambiguous";
		case "noKey":
			return "No key";
	}
};

export const unreliableBuckets = (first: ComparedSide, second: ComparedSide): ReadonlySet<ComparisonBucket> =>
	new Set<ComparisonBucket>([...(second.partial ? (["onlyInFirst"] as const) : []), ...(first.partial ? (["onlyInSecond"] as const) : [])]);

export const UNRELIABLE_TEXT = "Not reliable. Some Records were not loaded.";

const count = (value: number): string => value.toLocaleString();

export const partialText = (first: ComparedSide, second: ComparedSide): string | null => {
	if (first.partial && second.partial && first.loaded === second.loaded) {
		return `Partial. Compared the first ${count(first.loaded)} Records of each Connection.`;
	}
	const parts = [first, second].filter((side) => side.partial).map((side) => `Compared the first ${count(side.loaded)} Records of ${side.name}.`);
	return parts.length === 0 ? null : ["Partial.", ...parts].join(" ");
};

const hasLookup = (columns: readonly ResultColumn[]): boolean => columns.some((column) => column.type === "lookup");

export const matchingText = (stored: Pick<StoredComparison, "comparison" | "keyColumns">): string => {
	const { comparison, keyColumns } = stored;
	const lookups = hasLookup(comparison.comparedColumns) ? `Compared lookups by ${comparison.lookupsComparedBy}.` : null;
	if (comparison.keyMatching === "guidIgnoringCaseAndBraces") {
		return ["Matched on the primary key.", "Ignored case and braces.", lookups].filter((part) => part !== null).join(" ");
	}
	const trimmed = keyColumns.some((column) => column.type === "text" || column.type === "lookup") ? "Ignored case and outer spaces." : null;
	return [`Matched on ${keyColumns.map((column) => column.label).join(", ")}.`, trimmed, lookups].filter((part) => part !== null).join(" ");
};

export const noPairsHint = (stored: Pick<StoredComparison, "comparison" | "first" | "second">): string | null => {
	const { comparison, first, second } = stored;
	const paired = comparison.counts.equal + comparison.counts.different + comparison.counts.ambiguous;
	if (comparison.keyMatching !== "guidIgnoringCaseAndBraces" || paired > 0 || first.loaded === 0 || second.loaded === 0) {
		return null;
	}
	return "No Records share a primary key. If the Environments do not share GUIDs, use Columns for the Match Key.";
};

export const SET_ASIDE_TEXT: Readonly<Record<"ambiguous" | "noKey", string>> = {
	ambiguous: "These Match Key values occur more than once in a Connection, so the Records are not compared.",
	noKey: "These Records have no Match Key value, so they are not compared.",
};

export const matchKeyText = (record: QueryRunRecord, matchKey: MatchKey, primaryKey: string): string => {
	if (matchKey.kind === "primaryKey") {
		return cellText(record[primaryKey]);
	}
	return matchKey.columns.map((key) => cellValueText(record, key, "friendly") || "(empty)").join(" · ");
};

export const matchKeyLabel = ({ matchKey, primaryKey, keyColumns }: Pick<StoredComparison, "matchKey" | "primaryKey" | "keyColumns">): string =>
	matchKey.kind === "primaryKey" ? primaryKey : keyColumns.map((column) => column.label).join(" · ");

export const pairLabelColumn = (columns: readonly ResultGridColumn[], matchKey: MatchKey, primaryKey: string): ResultGridColumn | null => {
	if (matchKey.kind === "columns") {
		return null;
	}
	return columns.find((column) => !column.key.includes(".") && column.key !== primaryKey && column.type === "text") ?? null;
};

export const columnCountText = (value: number): string => (value === 1 ? "1 Column" : `${count(value)} Columns`);

export const rangeCaption = (window: DisplayWindow, total: number, noun: string): string =>
	total === 0 ? `No ${noun}` : `${noun} ${count(window.start + 1)}-${count(window.end)} of ${count(total)}`;

export const EMPTY_VALUE = "(empty)";

export const showsRaw = (value: CellValue): boolean => {
	const raw = cellText(value.raw);
	return raw !== "" && raw !== value.friendly;
};

const pairText = (first: string, second: string): string => `${first || EMPTY_VALUE} → ${second || EMPTY_VALUE}`;

export const MATCH_KEY_CELL = "__matchKey";

export interface DifferingColumnsGrid {
	columns: ResultGridColumn[];
	rows: QueryRow[];
}

export const LABEL_CELL = "__label";

export const differingColumnsGrid = (
	stored: Pick<StoredComparison, "comparison" | "matchKey" | "primaryKey" | "keyColumns">,
	labelColumn: ResultGridColumn | null
): DifferingColumnsGrid => {
	const { comparison, matchKey, primaryKey } = stored;
	const counts = new Map<string, number>();
	for (const pair of comparison.different) {
		for (const difference of pair.differences) {
			counts.set(difference.column, (counts.get(difference.column) ?? 0) + 1);
		}
	}
	const differing = comparison.comparedColumns.filter((column) => counts.has(column.key));
	const rows = comparison.different.map((pair) => {
		const row: Record<string, unknown> = { [MATCH_KEY_CELL]: matchKeyText(pair.first, matchKey, primaryKey) };
		if (labelColumn) {
			row[LABEL_CELL] = cellValueText(pair.first, labelColumn.key, "friendly");
		}
		for (const difference of pair.differences) {
			row[difference.column] = pairText(cellText(difference.first.raw), cellText(difference.second.raw));
			row[`${difference.column}${FORMATTED_VALUE_SUFFIX}`] = pairText(difference.first.friendly, difference.second.friendly);
		}
		return row;
	});
	const column = (key: string, label: string, type: ResultGridColumn["type"] = "text"): ResultGridColumn => ({
		key,
		label,
		type,
		table: null,
		column: null,
		primaryKey: false,
	});
	return {
		columns: [
			column(MATCH_KEY_CELL, matchKeyLabel(stored), matchKey.kind === "primaryKey" ? "uniqueidentifier" : "text"),
			...(labelColumn ? [column(LABEL_CELL, labelColumn.label)] : []),
			...differing.map((entry) => column(entry.key, `${entry.label} (${count(counts.get(entry.key) ?? 0)})`)),
		],
		rows,
	};
};
