import { type ComparedSide, type StoredComparison } from "./compareFlow";
import { type CellValue, type ComparisonCounts, type MatchKey } from "./comparison";
import { type QueryRunRecord, type ResultColumn } from "./resultColumn";
import { cellText, cellValueText } from "./results";

export type ComparisonBucket = "onlyInFirst" | "onlyInSecond" | "different" | "equal" | "ambiguous" | "noKey";

export const COMPARISON_BUCKETS: readonly ComparisonBucket[] = ["different", "onlyInFirst", "onlyInSecond", "equal", "ambiguous", "noKey"];

export const defaultBucket = (counts: ComparisonCounts): ComparisonBucket => COMPARISON_BUCKETS.find((bucket) => counts[bucket] > 0) ?? "equal";

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

export const EMPTY_VALUE = "(empty)";

export const showsRaw = (value: CellValue): boolean => {
	const raw = cellText(value.raw);
	return raw !== "" && raw !== value.friendly;
};
