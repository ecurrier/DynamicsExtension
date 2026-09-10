import { describe, expect, it, vi } from "vitest";

import { formatFailures, isRetryable, type RunItem, runWithConcurrency, summarize } from "./runner";

const items = (count: number): RunItem[] =>
	Array.from({ length: count }, (_, index) => ({ id: `id-${index}`, action: "create" as const, label: `Row ${index}` }));

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 1));

describe("runWithConcurrency", () => {
	it("runs every item with at most the configured concurrency and reports progress", async () => {
		let inFlight = 0;
		let peak = 0;
		const progress: number[] = [];
		const results = await runWithConcurrency(
			items(9),
			async () => {
				inFlight += 1;
				peak = Math.max(peak, inFlight);
				await tick();
				inFlight -= 1;
			},
			{ concurrency: 3, onResult: (_, done) => progress.push(done) }
		);
		expect(results.map((result) => result.status)).toEqual(Array(9).fill("success"));
		expect(peak).toBe(3);
		expect(progress).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
	});

	it("retries throttled requests once and reports other failures", async () => {
		const attempts = new Map<string, number>();
		const worker = vi.fn(async (item: RunItem) => {
			const count = (attempts.get(item.id) ?? 0) + 1;
			attempts.set(item.id, count);
			if (item.id === "id-0" && count === 1) {
				throw { status: 429 };
			}
			if (item.id === "id-1") {
				throw new Error("privilege missing");
			}
		});
		const results = await runWithConcurrency(items(3), worker, { concurrency: 1, retryDelayMs: 0 });
		expect(results.map((result) => [result.id, result.status, result.message])).toEqual([
			["id-0", "success", ""],
			["id-1", "failed", "privilege missing"],
			["id-2", "success", ""],
		]);
		expect(attempts.get("id-0")).toBe(2);
		expect(isRetryable({ details: { status: 503 } })).toBe(true);
		expect(isRetryable(new Error("x"))).toBe(false);
	});

	it("cancels items that have not started once aborted", async () => {
		const controller = new AbortController();
		const results = await runWithConcurrency(
			items(4),
			async (item) => {
				if (item.id === "id-1") {
					controller.abort();
				}
			},
			{ concurrency: 1, signal: controller.signal }
		);
		expect(results.map((result) => result.status)).toEqual(["success", "success", "cancelled", "cancelled"]);
		expect(summarize(results)).toEqual({ total: 4, succeeded: 2, failed: 0, cancelled: 2 });
	});

	it("formats failures as tab separated lines", () => {
		expect(
			formatFailures([
				{ id: "a", action: "create", label: "Row a", status: "failed", message: "boom" },
				{ id: "b", action: "update", label: "Row b", status: "success", message: "" },
			])
		).toBe("create\ta\tRow a\tboom");
	});
});
