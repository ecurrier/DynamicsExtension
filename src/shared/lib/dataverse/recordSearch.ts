import { type EntityInfo, type RecordSearchResult } from "@/shared/types";

import { isGuid, normalizeGuid } from "../guid";
import { odataStringLiteral } from "../odata";

export const buildRecordSearchQuery = (info: EntityInfo, term: string, top: number, includeModifiedOn = true): string | null => {
	const columns = [info.primaryIdAttribute, info.primaryNameAttribute, includeModifiedOn ? "modifiedon" : null];
	const select = `$select=${columns.filter((column): column is string => !!column).join(",")}`;
	const trimmed = term.trim();
	if (isGuid(trimmed)) {
		return `?${select}&$filter=${info.primaryIdAttribute} eq ${normalizeGuid(trimmed)}`;
	}
	if (!trimmed) {
		const orderBy = includeModifiedOn ? "modifiedon desc" : `${info.primaryNameAttribute ?? info.primaryIdAttribute} asc`;
		return `?${select}&$orderby=${orderBy}&$top=${top}`;
	}
	if (!info.primaryNameAttribute) {
		return null;
	}
	const filter = `$filter=contains(${info.primaryNameAttribute},${odataStringLiteral(trimmed)})`;
	return `?${select}&${filter}&$orderby=${info.primaryNameAttribute} asc&$top=${top}`;
};

export const mapRecordSearchRows = (info: EntityInfo, rows: Record<string, unknown>[]): RecordSearchResult[] =>
	rows.flatMap((row) => {
		const id = row[info.primaryIdAttribute];
		if (typeof id !== "string") {
			return [];
		}
		const name = info.primaryNameAttribute ? row[info.primaryNameAttribute] : null;
		const modifiedOn = row.modifiedon;
		return [
			{
				id: normalizeGuid(id),
				name: typeof name === "string" ? name : "",
				modifiedOn: typeof modifiedOn === "string" ? modifiedOn : null,
			},
		];
	});
