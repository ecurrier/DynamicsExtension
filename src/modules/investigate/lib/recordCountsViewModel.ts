import { type EntitySummary, type RecordCounts } from "@/shared/types";

export interface CountRow {
	logicalName: string;
	displayName: string;
	count: number;
}

export interface RecordCountsViewModel {
	rows: CountRow[];
	filtered: CountRow[];
	total: number;
	emptyMessage: string;
}

export const recordCountsViewModel = (tables: EntitySummary[], counts: RecordCounts | null, filter: string): RecordCountsViewModel => {
	const names = new Map(tables.map((table) => [table.logicalName, table.displayName]));
	const rows = (counts?.counts ?? []).map<CountRow>((count) => ({
		logicalName: count.entityLogicalName,
		displayName: names.get(count.entityLogicalName) ?? count.entityLogicalName,
		count: count.count,
	}));
	const term = filter.trim().toLowerCase();
	const filtered = term ? rows.filter((row) => row.logicalName.includes(term) || row.displayName.toLowerCase().includes(term)) : rows;
	return {
		rows,
		filtered,
		total: rows.reduce((sum, row) => sum + row.count, 0),
		emptyMessage: rows.length === 0 ? "Run a count to see row totals" : "No tables match that filter",
	};
};
