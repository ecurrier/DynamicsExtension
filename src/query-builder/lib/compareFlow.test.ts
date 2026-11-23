import { describe, expect, it } from "vitest";

import { comparedSide, compareFailureMessage, compareLoadPlan, isComparisonStale, needsRunBeforeCompare, type StoredComparison } from "./compareFlow";
import { DEFAULT_COMPARE_SETUP } from "./compareSetup";
import { compareQueryRuns } from "./comparison";
import { idleRun, type QueryRuns, type QueryRunState } from "./queryRuns";

const doneRun = (id: number, rows: number, moreRecords = false): QueryRunState => ({
	...idleRun(id),
	status: "done",
	rows: Array.from({ length: rows }, (_, index) => ({ accountid: String(index) })),
	moreRecords,
});

describe("compareLoadPlan", () => {
	it("compares when both sides are complete or stopped", () => {
		expect(compareLoadPlan({ a: "complete", b: "stopped" })).toEqual({ kind: "compare" });
	});

	it("asks before going past the limit", () => {
		expect(compareLoadPlan({ a: "confirm", b: "complete" })).toEqual({ kind: "confirm", keys: ["a"] });
	});

	it("fails when a side failed or is unavailable, before asking", () => {
		expect(compareLoadPlan({ a: "confirm", b: "failed", c: "unavailable" })).toEqual({ kind: "failed", keys: ["b", "c"] });
	});
});

describe("needsRunBeforeCompare", () => {
	it("runs when a Query Run has not started or the Query changed since the last Run", () => {
		expect(needsRunBeforeCompare([idleRun(1), doneRun(2, 1)], "<fetch />", "<fetch />")).toBe(true);
		expect(needsRunBeforeCompare([doneRun(1, 1), doneRun(2, 1)], "<fetch a />", "<fetch />")).toBe(true);
		expect(needsRunBeforeCompare([doneRun(1, 1), doneRun(2, 1)], "<fetch />", "<fetch />")).toBe(false);
	});
});

describe("compareFailureMessage", () => {
	it("uses the run error, then the page error, then a fallback", () => {
		expect(compareFailureMessage({ ...idleRun(1), status: "failed", error: "No such Column" })).toBe("No such Column");
		expect(compareFailureMessage({ ...doneRun(1, 1), pageError: "Timeout" })).toBe("Timeout");
		expect(compareFailureMessage(undefined)).toBe("The Connection is not ready. Select Compare again.");
	});
});

describe("comparedSide", () => {
	it("is partial while more Records exist on the server", () => {
		expect(comparedSide("a", "Dev", doneRun(4, 3, true))).toEqual({ key: "a", name: "Dev", runId: 4, loaded: 3, partial: true });
		expect(comparedSide("a", "Dev", doneRun(4, 3)).partial).toBe(false);
	});
});

describe("isComparisonStale", () => {
	const runs: QueryRuns = { a: doneRun(1, 2), b: doneRun(2, 3) };
	const stored: StoredComparison = {
		id: 1,
		comparison: compareQueryRuns([], [], { columns: [], primaryKey: "accountid", matchKey: { kind: "primaryKey" }, comparedColumns: [] }),
		first: comparedSide("a", "Dev", doneRun(1, 2)),
		second: comparedSide("b", "Test", doneRun(2, 3)),
		text: "<fetch />",
		setup: DEFAULT_COMPARE_SETUP,
		matchKey: { kind: "primaryKey" },
		keyColumns: [],
		primaryKey: "accountid",
	};
	const current = { text: "<fetch />", setup: DEFAULT_COMPARE_SETUP, pair: ["a", "b"] as const, runs };

	it("is current when nothing changed, even when the default Connections are chosen by hand", () => {
		expect(isComparisonStale(stored, current)).toBe(false);
		expect(isComparisonStale(stored, { ...current, setup: { ...DEFAULT_COMPARE_SETUP, firstKey: "a", secondKey: "b" } })).toBe(false);
	});

	it("is stale when the Query text changes", () => {
		expect(isComparisonStale(stored, { ...current, text: "<fetch top='1' />" })).toBe(true);
	});

	it("is stale when a Query Run restarts or loads more Records", () => {
		expect(isComparisonStale(stored, { ...current, runs: { ...runs, a: doneRun(9, 2) } })).toBe(true);
		expect(isComparisonStale(stored, { ...current, runs: { ...runs, b: doneRun(2, 4) } })).toBe(true);
	});

	it("is stale when a Connection is removed or another pair is chosen", () => {
		expect(isComparisonStale(stored, { ...current, runs: { a: doneRun(1, 2) } })).toBe(true);
		expect(isComparisonStale(stored, { ...current, pair: ["a", "c"] })).toBe(true);
	});

	it("is stale when the setup changes", () => {
		expect(isComparisonStale(stored, { ...current, setup: { ...DEFAULT_COMPARE_SETUP, matchKeyKind: "columns", keyColumns: ["name"] } })).toBe(true);
		expect(isComparisonStale(stored, { ...current, setup: { ...DEFAULT_COMPARE_SETUP, comparedColumns: ["name"] } })).toBe(true);
	});
});
