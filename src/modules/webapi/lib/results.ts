import { generateGuid } from "@/shared/lib";
import { type ResultsShare } from "@/shared/types";

export const MAX_SHARED_ROWS = 5000;

export type ResultRow = Record<string, unknown>;

export const columnsFromRows = (rows: ResultRow[]): string[] => {
	const columns = new Set<string>();
	for (const row of rows) {
		for (const key of Object.keys(row)) {
			if (!key.startsWith("@")) {
				columns.add(key);
			}
		}
	}
	return [...columns].sort();
};

export const cellText = (value: unknown): string => {
	if (value === null || value === undefined) {
		return "---";
	}
	if (typeof value === "object") {
		return JSON.stringify(value);
	}
	return String(value);
};

export const rowMatches = (row: ResultRow, columns: string[], filter: string): boolean => {
	const term = filter.trim().toLowerCase();
	if (!term) {
		return true;
	}
	return columns.some((column) => cellText(row[column]).toLowerCase().includes(term));
};

export const buildResultsShare = (entityName: string, rows: ResultRow[]): ResultsShare => ({
	id: generateGuid(),
	entityName,
	columns: columnsFromRows(rows),
	rows: rows.slice(0, MAX_SHARED_ROWS),
	truncated: rows.length > MAX_SHARED_ROWS,
	createdAt: new Date().toISOString(),
});

export const extractEntityName = (fetchXml: string): string | null => fetchXml.match(/<entity[^>]*name=['"]([^'"]*)['"]/)?.[1] ?? null;
