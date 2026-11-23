import { type ComparedSide, type StoredComparison } from "./compareFlow";
import { type CompareSide } from "./compareSetup";
import { type ComparisonBucket, EMPTY_VALUE, matchKeyLabel, matchKeyText } from "./compareView";
import { type ColumnDifference, type MatchKey } from "./comparison";
import { recordLink } from "./recordLinks";
import { type QueryRunRecord } from "./resultColumn";
import { cellText, cellValueText, type ResultGridColumn } from "./results";
import { type DisplayWindow } from "./resultsView";

export interface CompareGridRow {
	id: string;
	first: QueryRunRecord | null;
	second: QueryRunRecord | null;
	differences: ReadonlyMap<string, ColumnDifference> | null;
}

export type CompareGridColumn =
	| { kind: "open"; id: string; label: string; side: CompareSide }
	| { kind: "label"; id: string; label: string; column: string | null }
	| { kind: "guid"; id: string; label: string; column: string }
	| { kind: "differs"; id: string; label: string }
	| { kind: "difference"; id: string; label: string; name: string; column: string; count: number }
	| { kind: "value"; id: string; label: string; column: ResultGridColumn };

export interface CompareCell {
	text: string;
	href: string | null;
}

export interface CompareGridContext {
	stored: Pick<StoredComparison, "comparison" | "first" | "second" | "matchKey" | "primaryKey" | "keyColumns">;
	columns: readonly ResultGridColumn[];
	primaryName: string | null;
}

export interface CompareCellContext {
	matchKey: MatchKey;
	primaryKey: string;
	primaryKeyColumn: ResultGridColumn | null;
	appUrls: Readonly<Record<CompareSide, string | null>>;
}

export const OPEN_TEXT = "Open";

const isRoot = (column: ResultGridColumn): boolean => !column.key.includes(".");

export const recordLabelColumn = (
	columns: readonly ResultGridColumn[],
	matchKey: MatchKey,
	primaryKey: string,
	primaryName: string | null
): ResultGridColumn | null => {
	if (matchKey.kind === "columns") {
		return null;
	}
	const named = primaryName ? columns.find((column) => isRoot(column) && column.key === primaryName) : undefined;
	return named ?? columns.find((column) => isRoot(column) && column.key !== primaryKey && column.type === "text") ?? null;
};

const sidesOf = (bucket: ComparisonBucket): readonly CompareSide[] => {
	switch (bucket) {
		case "onlyInFirst":
			return ["first"];
		case "onlyInSecond":
			return ["second"];
		default:
			return ["first", "second"];
	}
};

const differenceCounts = (stored: CompareGridContext["stored"]): Map<string, number> => {
	const counts = new Map<string, number>();
	for (const pair of stored.comparison.different) {
		for (const difference of pair.differences) {
			counts.set(difference.column, (counts.get(difference.column) ?? 0) + 1);
		}
	}
	return counts;
};

const count = (value: number): string => value.toLocaleString();

export const compareGridColumns = (bucket: ComparisonBucket, { stored, columns, primaryName }: CompareGridContext): CompareGridColumn[] => {
	const { comparison, matchKey, primaryKey } = stored;
	const names: Readonly<Record<CompareSide, ComparedSide>> = { first: stored.first, second: stored.second };
	const open: CompareGridColumn[] = sidesOf(bucket).map((side) => ({ kind: "open", id: `open-${side}`, label: names[side].name, side }));
	const labelColumn = recordLabelColumn(columns, matchKey, primaryKey, primaryName);
	const label: CompareGridColumn[] =
		matchKey.kind === "columns"
			? [{ kind: "label", id: "label", label: matchKeyLabel(stored), column: null }]
			: labelColumn
				? [{ kind: "label", id: "label", label: labelColumn.label, column: labelColumn.key }]
				: [];
	const paired = bucket === "different" || bucket === "equal";
	const showsGuid = matchKey.kind === "primaryKey" || !paired;
	const guid: CompareGridColumn[] = showsGuid ? [{ kind: "guid", id: "guid", label: primaryKey, column: primaryKey }] : [];
	const lead = [...open, ...label, ...guid];
	const used = new Set<string>([primaryKey, ...(labelColumn ? [labelColumn.key] : []), ...(matchKey.kind === "columns" ? matchKey.columns : [])]);

	if (bucket === "different") {
		const counts = differenceCounts(stored);
		const differing: CompareGridColumn[] = comparison.comparedColumns
			.filter((column) => counts.has(column.key))
			.map((column) => {
				const value = counts.get(column.key) ?? 0;
				return {
					kind: "difference",
					id: `difference-${column.key}`,
					label: `${column.label} (${count(value)})`,
					name: column.label,
					column: column.key,
					count: value,
				};
			});
		return [...lead, { kind: "differs", id: "differs", label: "Differs" }, ...differing];
	}
	const byKey = new Map(columns.map((column) => [column.key, column]));
	const valueColumns =
		bucket === "equal"
			? comparison.comparedColumns.map((column) => byKey.get(column.key)).filter((column): column is ResultGridColumn => column !== undefined)
			: [...columns];
	return [
		...lead,
		...valueColumns
			.filter((column) => !used.has(column.key))
			.map((column): CompareGridColumn => ({ kind: "value", id: `value-${column.key}`, label: column.label, column })),
	];
};

const single = (side: CompareSide, record: QueryRunRecord, id: string): CompareGridRow => ({
	id,
	first: side === "first" ? record : null,
	second: side === "second" ? record : null,
	differences: null,
});

export const compareGridRows = (bucket: ComparisonBucket, comparison: StoredComparison["comparison"]): CompareGridRow[] => {
	switch (bucket) {
		case "onlyInFirst":
			return comparison.onlyInFirst.map((record, index) => single("first", record, `first-${index}`));
		case "onlyInSecond":
			return comparison.onlyInSecond.map((record, index) => single("second", record, `second-${index}`));
		case "equal":
			return comparison.equal.map((pair, index) => ({ id: `equal-${index}`, first: pair.first, second: pair.second, differences: null }));
		case "different":
			return comparison.different.map((pair, index) => ({
				id: `different-${index}`,
				first: pair.first,
				second: pair.second,
				differences: new Map(pair.differences.map((difference) => [difference.column, difference])),
			}));
		case "ambiguous":
			return comparison.ambiguous.flatMap((group, groupIndex) => [
				...group.first.map((record, index) => single("first", record, `ambiguous-${groupIndex}-first-${index}`)),
				...group.second.map((record, index) => single("second", record, `ambiguous-${groupIndex}-second-${index}`)),
			]);
		case "noKey":
			return [
				...comparison.noKey.first.map((record, index) => single("first", record, `noKey-first-${index}`)),
				...comparison.noKey.second.map((record, index) => single("second", record, `noKey-second-${index}`)),
			];
	}
};

const recordOf = (row: CompareGridRow): { record: QueryRunRecord; side: CompareSide } | null =>
	row.first ? { record: row.first, side: "first" } : row.second ? { record: row.second, side: "second" } : null;

const EMPTY_CELL: CompareCell = { text: "", href: null };

export const differenceText = (difference: ColumnDifference): string =>
	`${difference.first.friendly || EMPTY_VALUE} → ${difference.second.friendly || EMPTY_VALUE}`;

export const compareGridCell = (row: CompareGridRow, column: CompareGridColumn, context: CompareCellContext): CompareCell => {
	const source = recordOf(row);
	switch (column.kind) {
		case "open": {
			const record = row[column.side];
			const href = record && context.primaryKeyColumn ? recordLink(record, context.primaryKeyColumn, context.appUrls[column.side]) : null;
			return href ? { text: OPEN_TEXT, href } : EMPTY_CELL;
		}
		case "label":
			if (!source) {
				return EMPTY_CELL;
			}
			return {
				text: column.column
					? cellValueText(source.record, column.column, "friendly")
					: matchKeyText(source.record, context.matchKey, context.primaryKey),
				href: null,
			};
		case "guid":
			return source ? { text: cellText(source.record[column.column]), href: null } : EMPTY_CELL;
		case "differs":
			return { text: count(row.differences?.size ?? 0), href: null };
		case "difference": {
			const difference = row.differences?.get(column.column);
			return difference ? { text: differenceText(difference), href: null } : EMPTY_CELL;
		}
		case "value":
			if (!source) {
				return EMPTY_CELL;
			}
			return {
				text: cellValueText(source.record, column.column.key, "friendly"),
				href: column.column.primaryKey ? null : recordLink(source.record, column.column, context.appUrls[source.side]),
			};
	}
};

export const filterByDifference = (rows: readonly CompareGridRow[], column: string | null): readonly CompareGridRow[] =>
	column === null ? rows : rows.filter((row) => row.differences?.has(column) ?? false);

export const gridCaption = (window: DisplayWindow, total: number, noun: string, filter: string | null = null): string => {
	const range = total === 0 ? `No ${noun}` : `${noun} ${count(window.start + 1)}-${count(window.end)} of ${count(total)}`;
	return filter === null ? range : `${range}. Filter: ${filter}.`;
};

export const truncateMiddle = (value: string, head = 8, tail = 4): string =>
	value.length <= head + tail + 1 ? value : `${value.slice(0, head)}…${value.slice(value.length - tail)}`;

export const TOGGLE_WIDTH = 28;

const WIDTHS: Readonly<Record<CompareGridColumn["kind"], number>> = { open: 96, label: 220, guid: 150, differs: 64, difference: 220, value: 160 };

export const compareColumnWidth = (column: CompareGridColumn): number =>
	column.kind === "value" && column.column.type === "lookup" ? 200 : WIDTHS[column.kind];

export const isPinned = (column: CompareGridColumn): boolean => column.kind === "open" || column.kind === "label";

export interface CompareColumnLayout {
	width: number;
	left: number | null;
}

export const compareColumnLayout = (columns: readonly CompareGridColumn[], leading: number): CompareColumnLayout[] => {
	let left = leading;
	return columns.map((column) => {
		const width = compareColumnWidth(column);
		const pinned = isPinned(column) ? left : null;
		if (pinned !== null) {
			left += width;
		}
		return { width, left: pinned };
	});
};

export const arrowText = (firstName: string, secondName: string): string => `Each cell shows ${firstName} → ${secondName}.`;

export const bucketNoun = (bucket: ComparisonBucket): string => (bucket === "different" || bucket === "equal" ? "Pairs" : "Records");

export const differenceColumnName = (columns: readonly CompareGridColumn[], filter: string | null): string | null =>
	columns.flatMap((column) => (column.kind === "difference" && column.column === filter ? [column.name] : []))[0] ?? null;

export const pagerLabel = (direction: "Previous" | "Next", noun: string, caption: string): string =>
	`${direction} ${noun.toLowerCase()}. ${caption.endsWith(".") ? caption : `${caption}.`}`;
