import { describe, expect, it } from "vitest";

import { parseFetchXml } from "@/shared/lib/fetchxml";

import { idleRun, type QueryRunState } from "./queryRuns";
import { canLoadAllEverywhere, canLoadAllPages, runCountText, runSummaryText, runTimeText } from "./runSummary";

const parsed = parseFetchXml('<fetch><entity name="account" /></fetch>');

const done = (rows: number, moreRecords: boolean, overrides: Partial<QueryRunState> = {}): QueryRunState => ({
	...idleRun(1),
	status: "done",
	rows: Array.from({ length: rows }, (_, index) => ({ name: `Account ${index}` })),
	moreRecords,
	elapsedMs: 312.4,
	source: parsed.ok ? { query: parsed.document, entitySetName: "accounts", pageable: true } : null,
	...overrides,
});

describe("the summary of a Query Run", () => {
	it("shows a plus while more Records exist on the server", () => {
		expect(runCountText(done(50, true))).toBe("50+");
		expect(runCountText(done(130, false))).toBe("130");
		expect(runCountText(done(1200, false))).toBe("1,200");
	});

	it("shows no count before the Query Run is done", () => {
		expect(runCountText(idleRun(1))).toBeNull();
		expect(runCountText({ ...idleRun(1), status: "failed", error: "boom" })).toBeNull();
	});

	it("shows the time of the last request", () => {
		expect(runTimeText(done(1, false))).toBe("312 ms");
		expect(runTimeText(idleRun(1))).toBeNull();
	});

	it("says what each Query Run is doing", () => {
		expect(runSummaryText(idleRun(1))).toBe("Not run");
		expect(runSummaryText({ ...idleRun(1), status: "running" })).toBe("Running");
		expect(runSummaryText({ ...idleRun(1), status: "failed", error: "boom" })).toBe("Failed");
		expect(runSummaryText(done(50, true))).toBe("50+ Records · 312 ms");
		expect(runSummaryText(done(1, false))).toBe("1 Record · 312 ms");
		expect(runSummaryText(done(100, true, { paging: "all" }))).toBe("100+ Records · loading");
	});

	it("offers Load all on every Connection while one Query Run has more pages", () => {
		expect(canLoadAllPages(done(50, true))).toBe(true);
		expect(canLoadAllPages(done(50, false))).toBe(false);
		expect(canLoadAllPages(done(50, true, { paging: "next" }))).toBe(false);
		expect(canLoadAllPages(done(50, true, { source: null }))).toBe(false);
		expect(canLoadAllEverywhere([done(130, false), { ...idleRun(2), status: "failed" }])).toBe(false);
		expect(canLoadAllEverywhere([done(130, false), done(50, true), undefined])).toBe(true);
	});
});
