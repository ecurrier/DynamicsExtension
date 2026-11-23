import { type ConnectionTarget } from "@/shared/connections";
import { type FetchXmlDocument } from "@/shared/lib/fetchxml";
import { type QueryRow, type QueryRunResult } from "@/shared/types";

import { connectionKey } from "./connectionList";
import { type ResultsPaging } from "./resultsView";

export type QueryRunStatus = "idle" | "running" | "done" | "failed";

export interface QueryRunSource {
	query: FetchXmlDocument;
	entitySetName: string;
	pageable: boolean;
}

export interface QueryRunPage {
	rows: QueryRow[];
	annotations: Record<string, unknown>;
}

export interface QueryRunState {
	id: number;
	status: QueryRunStatus;
	connection: ConnectionTarget | null;
	source: QueryRunSource | null;
	rows: QueryRow[];
	pages: QueryRunPage[];
	pageNumber: number;
	moreRecords: boolean;
	pagingCookie: string | null;
	totalRecordCount: number | null;
	elapsedMs: number | null;
	error: string | null;
	paging: ResultsPaging;
	pageError: string | null;
	stopRequested: boolean;
	pastLimitConfirmed: boolean;
	awaitingLimitConfirmation: boolean;
}

export type QueryRuns = Readonly<Record<string, QueryRunState>>;

export interface ConnectionRunEntry {
	key: string;
	connection: ConnectionTarget;
	name: string;
	run: QueryRunState;
}

export type PagingOutcome = { kind: "finished" } | { kind: "confirm" } | { kind: "failed"; message: string };

export type LoadPagesOutcome = "complete" | "stopped" | "confirm" | "failed" | "unavailable";

export const idleRun = (id: number, connection: ConnectionTarget | null = null): QueryRunState => ({
	id,
	status: "idle",
	connection,
	source: null,
	rows: [],
	pages: [],
	pageNumber: 0,
	moreRecords: false,
	pagingCookie: null,
	totalRecordCount: null,
	elapsedMs: null,
	error: null,
	paging: "idle",
	pageError: null,
	stopRequested: false,
	pastLimitConfirmed: false,
	awaitingLimitConfirmation: false,
});

export const isRunBusy = (run: QueryRunState | undefined): boolean => run !== undefined && (run.status === "running" || run.paging !== "idle");

export const runsFor = (connections: readonly ConnectionTarget[], runs: QueryRuns, nextId: () => number): QueryRuns => {
	const keys = connections.map(connectionKey);
	const unchanged = keys.length === Object.keys(runs).length && keys.every((key) => runs[key] !== undefined);
	if (unchanged) {
		return runs;
	}
	return Object.fromEntries(
		connections.map((connection) => {
			const key = connectionKey(connection);
			return [key, runs[key] ?? idleRun(nextId(), connection)];
		})
	);
};

export const startedRuns = (connections: readonly ConnectionTarget[], nextId: () => number): QueryRuns =>
	Object.fromEntries(connections.map((connection) => [connectionKey(connection), { ...idleRun(nextId(), connection), status: "running" as const }]));

export const resetRuns = (runs: QueryRuns, nextId: () => number): QueryRuns =>
	Object.fromEntries(Object.entries(runs).map(([key, run]) => [key, run.status === "running" ? run : idleRun(nextId(), run.connection)]));

export const updateRun = (runs: QueryRuns, key: string, id: number, update: (run: QueryRunState) => Partial<QueryRunState>): QueryRuns => {
	const run = runs[key];
	return run && run.id === id ? { ...runs, [key]: { ...run, ...update(run) } } : runs;
};

export const finishRun = (runs: QueryRuns, key: string, id: number, result: QueryRunResult, source: QueryRunSource | null): QueryRuns =>
	updateRun(runs, key, id, () => ({
		status: "done",
		source,
		rows: result.rows,
		pages: [{ rows: result.rows, annotations: result.annotations }],
		pageNumber: 1,
		moreRecords: result.moreRecords,
		pagingCookie: result.pagingCookie,
		totalRecordCount: result.totalRecordCount,
		elapsedMs: result.elapsedMs,
	}));

export const failRun = (runs: QueryRuns, key: string, id: number, message: string): QueryRuns =>
	updateRun(runs, key, id, () => ({ status: "failed", error: message }));

export const canPage = (run: QueryRunState | undefined, id: number): run is QueryRunState =>
	run !== undefined && run.id === id && run.status === "done" && run.paging === "idle" && run.moreRecords && run.source?.pageable === true;

export const startPaging = (
	runs: QueryRuns,
	key: string,
	id: number,
	paging: Exclude<ResultsPaging, "idle">,
	pastLimitConfirmed: boolean
): QueryRuns | null => {
	const run = runs[key];
	if (!canPage(run, id)) {
		return null;
	}
	return {
		...runs,
		[key]: {
			...run,
			paging,
			pageError: null,
			stopRequested: false,
			awaitingLimitConfirmation: false,
			pastLimitConfirmed: run.pastLimitConfirmed || pastLimitConfirmed,
		},
	};
};

export const appendPage = (runs: QueryRuns, key: string, id: number, result: QueryRunResult): QueryRuns =>
	updateRun(runs, key, id, (run) => ({
		rows: run.rows.concat(result.rows),
		pages: [...run.pages, { rows: result.rows, annotations: result.annotations }],
		pageNumber: run.pageNumber + 1,
		moreRecords: result.moreRecords,
		pagingCookie: result.pagingCookie,
		elapsedMs: result.elapsedMs,
	}));

export const finishPaging = (runs: QueryRuns, key: string, id: number, outcome: PagingOutcome): QueryRuns =>
	updateRun(runs, key, id, () => ({
		paging: "idle",
		stopRequested: false,
		awaitingLimitConfirmation: outcome.kind === "confirm",
		pageError: outcome.kind === "failed" ? outcome.message : null,
	}));

export const requestStop = (runs: QueryRuns, key: string, id: number): QueryRuns =>
	updateRun(runs, key, id, (run) => (run.paging === "idle" ? { awaitingLimitConfirmation: false } : { stopRequested: true }));
