import { type QueryHistory, type QueryHistoryConnection, type QueryHistoryEntry, type QueryRunOutcome } from "@/shared/storage";

import { fetchXmlTableName, filterTerm, includesText, normalizeFetchXml } from "./fetchXmlKey";

export const QUERY_HISTORY_LIMIT = 100;

export interface QueryHistorySummary {
	tableName: string | null;
	title: string;
	outcome: string;
	failed: boolean;
}

export const sameConnection = (left: QueryHistoryConnection, right: QueryHistoryConnection): boolean => {
	if (left.kind === "page" && right.kind === "page") {
		return left.host.toLowerCase() === right.host.toLowerCase();
	}
	if (left.kind === "environment" && right.kind === "environment") {
		return left.environmentId === right.environmentId;
	}
	return false;
};

export const firstLine = (message: string): string => message.trim().split(/\r?\n/, 1)[0]?.trim() ?? "";

const tidyOutcome = (outcome: QueryRunOutcome): QueryRunOutcome =>
	outcome.kind === "error" ? { kind: "error", message: firstLine(outcome.message) } : { ...outcome };

export const recordRun = (history: QueryHistory, entry: QueryHistoryEntry): QueryHistory => {
	const key = normalizeFetchXml(entry.fetchXml);
	const rest = history.filter((existing) => !(sameConnection(existing.connection, entry.connection) && normalizeFetchXml(existing.fetchXml) === key));
	const recorded: QueryHistoryEntry = { ...entry, connection: { ...entry.connection }, outcome: tidyOutcome(entry.outcome) };
	return [recorded, ...rest].slice(0, QUERY_HISTORY_LIMIT);
};

export const clearHistory = (): QueryHistory => [];

export const filterHistory = (history: QueryHistory, text: string): QueryHistory => {
	const term = filterTerm(text);
	if (term === "") {
		return history;
	}
	return history.filter(
		(entry) => includesText(entry.fetchXml, term) || includesText(entry.connectionLabel, term) || includesText(fetchXmlTableName(entry.fetchXml), term)
	);
};

export const outcomeText = (outcome: QueryRunOutcome): string => {
	if (outcome.kind === "error") {
		return outcome.message;
	}
	const count = outcome.count.toLocaleString("en-US");
	const plus = outcome.moreRecords ? "+" : "";
	return outcome.count === 1 && !outcome.moreRecords ? "1 Record" : `${count}${plus} Records`;
};

export const summarizeHistoryEntry = (entry: QueryHistoryEntry): QueryHistorySummary => {
	const tableName = fetchXmlTableName(entry.fetchXml);
	return {
		tableName,
		title: tableName ?? "No Table",
		outcome: outcomeText(entry.outcome),
		failed: entry.outcome.kind === "error",
	};
};
