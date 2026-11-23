import { type ConnectionTarget } from "@/shared/connections";
import { type QueryHistoryConnection, type QueryRunOutcome } from "@/shared/storage";
import { type QueryRunResult } from "@/shared/types";

export const hostOf = (url: string | null): string | null => {
	if (url === null) {
		return null;
	}
	try {
		return new URL(url).host || null;
	} catch {
		return null;
	}
};

export const historyConnection = (connection: ConnectionTarget, tabUrl: string | null): QueryHistoryConnection =>
	connection.kind === "environment" ? { kind: "environment", environmentId: connection.environmentId } : { kind: "page", host: hostOf(tabUrl) ?? "" };

export const historyConnectionLabel = (connection: QueryHistoryConnection, connectionName: string): string =>
	connection.kind === "page" && connection.host !== "" ? connection.host : connectionName;

export const recordsOutcome = (result: Pick<QueryRunResult, "rows" | "moreRecords">): QueryRunOutcome => ({
	kind: "records",
	count: result.rows.length,
	moreRecords: result.moreRecords,
});

export const errorOutcome = (message: string): QueryRunOutcome => ({ kind: "error", message });
