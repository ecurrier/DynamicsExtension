import { describe, expect, it } from "vitest";

import { type ConnectionTarget, PAGE_CONNECTION } from "@/shared/connections";
import { parseFetchXml } from "@/shared/lib/fetchxml";
import { type QueryRunResult } from "@/shared/types";

import {
	appendPage,
	failRun,
	finishPaging,
	finishRun,
	idleRun,
	isRunBusy,
	type QueryRuns,
	requestStop,
	resetRuns,
	runsFor,
	startedRuns,
	startPaging,
} from "./queryRuns";

const DEV: ConnectionTarget = { kind: "environment", environmentId: "env-dev" };
const TEST: ConnectionTarget = { kind: "environment", environmentId: "env-test" };

const RESULT: QueryRunResult = {
	rows: [{ name: "Contoso" }],
	moreRecords: true,
	pagingCookie: "<cookie />",
	totalRecordCount: null,
	totalRecordCountLimitExceeded: false,
	elapsedMs: 42,
	annotations: {},
};

const parsed = parseFetchXml('<fetch><entity name="account" /></fetch>');
const QUERY = parsed.ok ? parsed.document : null;

const counter = (start = 0) => {
	let id = start;
	return () => ++id;
};

const SOURCE = () => {
	if (!QUERY) {
		throw new Error("no query");
	}
	return { query: QUERY, entitySetName: "accounts", pageable: true };
};

const started = (): { runs: QueryRuns; page: number; dev: number } => {
	const runs = startedRuns([PAGE_CONNECTION, DEV], counter());
	return { runs, page: runs.page?.id ?? 0, dev: runs["environment:env-dev"]?.id ?? 0 };
};

describe("the Query Runs, one per Connection", () => {
	it("starts one running Query Run for each Connection, each with its own id", () => {
		const { runs, page, dev } = started();
		expect(Object.keys(runs)).toEqual(["page", "environment:env-dev"]);
		expect(runs.page).toMatchObject({ status: "running", connection: PAGE_CONNECTION });
		expect(runs["environment:env-dev"]).toMatchObject({ status: "running", connection: DEV });
		expect(page).not.toBe(dev);
	});

	it("finishes and fails each Query Run on its own", () => {
		const { runs, page, dev } = started();
		const next = failRun(finishRun(runs, "page", page, RESULT, SOURCE()), "environment:env-dev", dev, "Column x does not exist.");
		expect(next.page).toMatchObject({ status: "done", rows: RESULT.rows, moreRecords: true, elapsedMs: 42 });
		expect(next["environment:env-dev"]).toMatchObject({ status: "failed", error: "Column x does not exist." });
	});

	it("ignores an update for a Query Run that has been replaced", () => {
		const { runs, page } = started();
		expect(finishRun(runs, "page", page + 10, RESULT, null)).toBe(runs);
		expect(finishRun(runs, "environment:gone", page, RESULT, null)).toBe(runs);
	});

	it("pages one Query Run without touching the others", () => {
		const { runs, page, dev } = started();
		const done = finishRun(finishRun(runs, "page", page, RESULT, SOURCE()), "environment:env-dev", dev, RESULT, SOURCE());
		const paging = startPaging(done, "page", page, "next", false);
		expect(paging?.page?.paging).toBe("next");
		expect(paging?.["environment:env-dev"]).toBe(done["environment:env-dev"]);
		const appended = appendPage(paging ?? done, "page", page, { ...RESULT, rows: [{ name: "Fabrikam" }], moreRecords: false });
		const finished = finishPaging(appended, "page", page, { kind: "finished" });
		expect(finished.page).toMatchObject({ rows: [{ name: "Contoso" }, { name: "Fabrikam" }], pageNumber: 2, moreRecords: false, paging: "idle" });
		expect(startPaging(finished, "page", page, "next", false)).toBeNull();
		expect(startPaging(finished, "environment:env-dev", dev, "all", false)?.["environment:env-dev"]?.paging).toBe("all");
	});

	it("refuses to page a Query Run that cannot be paged", () => {
		const { runs, page } = started();
		expect(startPaging(finishRun(runs, "page", page, RESULT, null), "page", page, "all", false)).toBeNull();
		expect(startPaging(runs, "page", page, "all", false)).toBeNull();
	});

	it("records a stop request and the pause at the limit for one Query Run", () => {
		const { runs, page } = started();
		const paging = startPaging(finishRun(runs, "page", page, RESULT, SOURCE()), "page", page, "all", false) ?? runs;
		const stopping = requestStop(paging, "page", page);
		expect(stopping.page?.stopRequested).toBe(true);
		const paused = finishPaging(stopping, "page", page, { kind: "confirm" });
		expect(paused.page).toMatchObject({ paging: "idle", stopRequested: false, awaitingLimitConfirmation: true });
		const resumed = startPaging(paused, "page", page, "all", true);
		expect(resumed?.page).toMatchObject({ pastLimitConfirmed: true, awaitingLimitConfirmation: false });
		expect(requestStop(paused, "page", page).page?.awaitingLimitConfirmation).toBe(false);
	});

	it("keeps the Query Runs of the Connections that stay and adds idle ones for new Connections", () => {
		const { runs, page } = started();
		const done = finishRun(runs, "page", page, RESULT, SOURCE());
		const next = runsFor([PAGE_CONNECTION, TEST], done, counter(100));
		expect(next.page).toBe(done.page);
		expect(next["environment:env-dev"]).toBeUndefined();
		expect(next["environment:env-test"]).toMatchObject({ status: "idle", id: 101, connection: TEST });
		expect(runsFor([PAGE_CONNECTION, TEST], next, counter(200))).toBe(next);
	});

	it("clears every Query Run that is not running", () => {
		const { runs, page, dev } = started();
		const done = finishRun(runs, "page", page, RESULT, SOURCE());
		const reset = resetRuns(done, counter(50));
		expect(reset.page).toMatchObject({ status: "idle", rows: [], connection: PAGE_CONNECTION });
		expect(reset["environment:env-dev"]?.id).toBe(dev);
	});

	it("knows when a Query Run is busy", () => {
		expect(isRunBusy(undefined)).toBe(false);
		expect(isRunBusy(idleRun(1))).toBe(false);
		expect(isRunBusy({ ...idleRun(1), status: "running" })).toBe(true);
		expect(isRunBusy({ ...idleRun(1), status: "done", paging: "all" })).toBe(true);
	});
});
