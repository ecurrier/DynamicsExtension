import { describe, expect, it } from "vitest";

import { type BulkRunItem, type BulkRunOutcome, type BulkRunResult } from "@/shared/types";

import { bulkRunCounts, bulkRunProgress, bulkRunSummary, retryPlan } from "./plan";

const item = (id: string): BulkRunItem<{ id: string }> => ({ id, label: `Item ${id}`, detail: "does a thing", args: { id } });

const result = (outcomes: BulkRunOutcome[]): BulkRunResult<{ id: string }> => ({
	plan: { title: "Add roles", action: "Add", items: outcomes.map((outcome) => item(outcome.id)) },
	outcomes,
});

const ok = (id: string): BulkRunOutcome => ({ id, kind: "succeeded", message: null });
const bad = (id: string, message = "boom"): BulkRunOutcome => ({ id, kind: "failed", message });
const never = (id: string): BulkRunOutcome => ({ id, kind: "skipped", message: "Stopped before this ran" });

describe("bulkRunCounts", () => {
	it("counts failures and never-ran items together as unfinished", () => {
		expect(bulkRunCounts(result([ok("1"), bad("2"), never("3"), ok("4")]))).toEqual({
			total: 4,
			succeeded: 2,
			failed: 1,
			skipped: 1,
			unfinished: 2,
		});
	});
});

describe("bulkRunSummary", () => {
	it("says so plainly when everything worked", () => {
		expect(bulkRunSummary(result([ok("1"), ok("2")]))).toBe("All 2 changes applied.");
	});

	it("uses the singular for one change", () => {
		expect(bulkRunSummary(result([ok("1")]))).toBe("All 1 change applied.");
	});

	it("names the failures and points at retry", () => {
		expect(bulkRunSummary(result([ok("1"), bad("2"), bad("3")]))).toBe("1 of 3 applied, 2 failures. Retry leaves what already worked alone.");
	});

	it("separates items that failed from items that never ran", () => {
		expect(bulkRunSummary(result([ok("1"), bad("2"), never("3")]))).toBe("1 of 3 applied, 1 failure, 1 never ran. Retry leaves what already worked alone.");
	});

	it("handles an empty run", () => {
		expect(bulkRunSummary(result([]))).toBe("Nothing to do.");
	});
});

describe("retryPlan", () => {
	it("keeps only the items that did not succeed, in their original order", () => {
		const plan = retryPlan(result([ok("1"), bad("2"), ok("3"), never("4")]));
		expect(plan?.items.map((entry) => entry.id)).toEqual(["2", "4"]);
	});

	it("carries the title and action across so the retry reads the same", () => {
		expect(retryPlan(result([bad("1")]))).toMatchObject({ title: "Add roles", action: "Add" });
	});

	it("is null when there is nothing left to retry", () => {
		expect(retryPlan(result([ok("1"), ok("2")]))).toBeNull();
		expect(retryPlan(result([]))).toBeNull();
	});
});

describe("bulkRunProgress", () => {
	it("reports completion as a fraction and a caption", () => {
		expect(bulkRunProgress(3, 12)).toEqual({ completed: 3, total: 12, percent: 0.25, caption: "3 of 12 done" });
	});

	it("clamps nonsense rather than reporting more than the total", () => {
		expect(bulkRunProgress(20, 12).completed).toBe(12);
		expect(bulkRunProgress(-1, 12).completed).toBe(0);
	});

	it("treats an empty run as finished", () => {
		expect(bulkRunProgress(0, 0)).toEqual({ completed: 0, total: 0, percent: 1, caption: "Nothing to do" });
	});
});
