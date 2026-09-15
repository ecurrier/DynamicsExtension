import { describe, expect, it, vi } from "vitest";

import { type BulkRunPlan } from "@/shared/types";

import { runBulkPlan } from "./run";

const plan = (count: number): BulkRunPlan<{ n: number }> => ({
	title: "Add roles",
	action: "Add",
	items: Array.from({ length: count }, (_, index) => ({ id: String(index), label: `Item ${index}`, detail: "does a thing", args: { n: index } })),
});

describe("runBulkPlan", () => {
	it("returns one outcome per item, in plan order", async () => {
		const result = await runBulkPlan(plan(3), async () => undefined);
		expect(result.outcomes.map((outcome) => outcome.id)).toEqual(["0", "1", "2"]);
		expect(result.outcomes.every((outcome) => outcome.kind === "succeeded")).toBe(true);
	});

	it("records a failure per item and keeps going", async () => {
		const result = await runBulkPlan(plan(4), async (item) => {
			if (item.args.n % 2 === 1) {
				throw new Error(`item ${item.args.n} refused`);
			}
		});
		expect(result.outcomes.map((outcome) => outcome.kind)).toEqual(["succeeded", "failed", "succeeded", "failed"]);
		expect(result.outcomes[1]?.message).toBe("item 1 refused");
	});

	it("never rejects, even when every item throws", async () => {
		const result = await runBulkPlan(plan(3), async () => {
			throw new Error("nope");
		});
		expect(result.outcomes.every((outcome) => outcome.kind === "failed")).toBe(true);
	});

	it("describes a thrown non-error", async () => {
		const result = await runBulkPlan(plan(1), async () => {
			throw "just a string";
		});
		expect(result.outcomes[0]?.message).toBe("just a string");
	});

	it("reports progress once per item", async () => {
		const onProgress = vi.fn();
		await runBulkPlan(plan(5), async () => undefined, { concurrency: 2, onProgress });
		expect(onProgress).toHaveBeenCalledTimes(5);
		expect(onProgress).toHaveBeenLastCalledWith(5, 5);
	});

	it("runs no more than the concurrency cap at once", async () => {
		let running = 0;
		let peak = 0;
		await runBulkPlan(
			plan(10),
			async () => {
				running += 1;
				peak = Math.max(peak, running);
				await Promise.resolve();
				running -= 1;
			},
			{ concurrency: 3 }
		);
		expect(peak).toBeLessThanOrEqual(3);
	});

	it("marks everything after an abort as never run, and keeps what already succeeded", async () => {
		const controller = new AbortController();
		const result = await runBulkPlan(
			plan(6),
			async (item) => {
				if (item.args.n === 1) {
					controller.abort();
				}
			},
			{ concurrency: 1, signal: controller.signal }
		);
		expect(result.outcomes.map((outcome) => outcome.kind)).toEqual(["succeeded", "succeeded", "skipped", "skipped", "skipped", "skipped"]);
		expect(result.outcomes[2]?.message).toBe("Stopped before this ran");
	});

	it("still reports progress for items it skipped after an abort", async () => {
		const controller = new AbortController();
		const onProgress = vi.fn();
		await runBulkPlan(plan(4), async () => controller.abort(), { concurrency: 1, signal: controller.signal, onProgress });
		expect(onProgress).toHaveBeenLastCalledWith(4, 4);
	});

	it("handles an empty plan without calling the executor", async () => {
		const execute = vi.fn();
		const result = await runBulkPlan(plan(0), execute);
		expect(execute).not.toHaveBeenCalled();
		expect(result.outcomes).toEqual([]);
	});
});
