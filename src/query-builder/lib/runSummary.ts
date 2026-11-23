import { type QueryRunState } from "./queryRuns";
import { resultsStatus } from "./resultsView";

export const runStatusText = (run: QueryRunState, connectionName: string): string =>
	resultsStatus({
		status: run.status,
		loaded: run.rows.length,
		moreRecords: run.moreRecords,
		pageable: run.source?.pageable ?? false,
		paging: run.paging,
		elapsedMs: run.elapsedMs,
		connectionName,
	});

export const runCountText = (run: QueryRunState): string | null =>
	run.status === "done" ? `${run.rows.length.toLocaleString()}${run.moreRecords ? "+" : ""}` : null;

export const runTimeText = (run: QueryRunState): string | null =>
	run.status === "done" && run.elapsedMs !== null ? `${Math.round(run.elapsedMs).toLocaleString()} ms` : null;

export const runSummaryText = (run: QueryRunState): string => {
	switch (run.status) {
		case "idle":
			return "Not run";
		case "running":
			return "Running";
		case "failed":
			return "Failed";
		case "done":
			break;
	}
	const count = runCountText(run) ?? "";
	const records = `${count} ${count === "1" ? "Record" : "Records"}`;
	if (run.paging !== "idle") {
		return `${records} · loading`;
	}
	return [records, runTimeText(run)].filter((part) => part !== null).join(" · ");
};

export const canLoadAllPages = (run: QueryRunState | undefined): boolean =>
	run !== undefined && run.status === "done" && run.paging === "idle" && run.moreRecords && run.source?.pageable === true;

export const canLoadAllEverywhere = (runs: readonly (QueryRunState | undefined)[]): boolean => runs.some(canLoadAllPages);
