import { type BulkRunItem, type BulkRunOutcome, type BulkRunPlan, type BulkRunResult } from "@/shared/types";

import { describeError } from "../errors";

const DEFAULT_CONCURRENCY = 4;

export interface RunBulkPlanOptions {
	concurrency?: number;
	signal?: AbortSignal;
	onProgress?: (completed: number, total: number) => void;
}

export const runBulkPlan = async <TArgs>(
	plan: BulkRunPlan<TArgs>,
	execute: (item: BulkRunItem<TArgs>) => Promise<void>,
	options: RunBulkPlanOptions = {}
): Promise<BulkRunResult<TArgs>> => {
	const total = plan.items.length;
	const outcomes: BulkRunOutcome[] = new Array<BulkRunOutcome>(total);
	const concurrency = Math.min(Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY), Math.max(1, total));
	let next = 0;
	let completed = 0;

	const worker = async (): Promise<void> => {
		for (let index = next++; index < total; index = next++) {
			const item = plan.items[index]!;
			if (options.signal?.aborted) {
				outcomes[index] = { id: item.id, kind: "skipped", message: "Stopped before this ran" };
			} else {
				try {
					await execute(item);
					outcomes[index] = { id: item.id, kind: "succeeded", message: null };
				} catch (error) {
					outcomes[index] = { id: item.id, kind: "failed", message: describeError(error) };
				}
			}
			completed += 1;
			options.onProgress?.(completed, total);
		}
	};

	await Promise.all(Array.from({ length: total === 0 ? 0 : concurrency }, worker));
	return { plan, outcomes };
};
