import { type ConnectionTarget } from "@/shared/connections";
import { normalizeGuid, recordUrl } from "@/shared/lib";
import { type QueryRow } from "@/shared/types";

import { LOOKUP_LOGICAL_NAME_SUFFIX } from "./resultColumn";
import { type ResultGridColumn } from "./results";

const GUID_PATTERN = /^\{?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}?$/i;

export const recordAppUrl = (url: string | null | undefined): string | null => {
	const trimmed = url?.trim() ?? "";
	if (trimmed.length === 0) {
		return null;
	}
	try {
		const parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
		const appId = parsed.searchParams.get("appid");
		return `${parsed.origin}/main.aspx?${appId ? `appid=${encodeURIComponent(appId)}` : "forceUCI=1"}`;
	} catch {
		return null;
	}
};

export interface RecordLinkSources {
	environmentUrl: string | null;
	tabUrl: string | null;
}

export const connectionRecordAppUrl = (connection: ConnectionTarget, { environmentUrl, tabUrl }: RecordLinkSources): string | null =>
	recordAppUrl(connection.kind === "page" ? tabUrl : environmentUrl);

const recordId = (value: unknown): string | null => (typeof value === "string" && GUID_PATTERN.test(value) ? normalizeGuid(value) : null);

export const recordLink = (row: QueryRow, column: ResultGridColumn, appUrl: string | null): string | null => {
	const id = recordId(row[column.key]);
	if (!appUrl || !id) {
		return null;
	}
	const lookupTable = row[`${column.key}${LOOKUP_LOGICAL_NAME_SUFFIX}`];
	if (typeof lookupTable === "string" && lookupTable.length > 0) {
		return recordUrl(appUrl, lookupTable, id);
	}
	return column.primaryKey && column.table ? recordUrl(appUrl, column.table, id) : null;
};
