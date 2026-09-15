import { type BulkRunCounts, type BulkRunOutcomeKind, type BulkRunPlan, type BulkRunProgress, type BulkRunResult } from "@/shared/types";

const plural = (count: number, singular: string): string => `${count} ${count === 1 ? singular : `${singular}s`}`;

export const bulkRunCounts = <TArgs>(result: BulkRunResult<TArgs>): BulkRunCounts => {
	const count = (kind: BulkRunOutcomeKind) => result.outcomes.filter((outcome) => outcome.kind === kind).length;
	const succeeded = count("succeeded");
	const failed = count("failed");
	const skipped = count("skipped");
	return { total: result.outcomes.length, succeeded, failed, skipped, unfinished: failed + skipped };
};

export const bulkRunSummary = <TArgs>(result: BulkRunResult<TArgs>): string => {
	const counts = bulkRunCounts(result);
	if (counts.total === 0) {
		return "Nothing to do.";
	}
	if (counts.unfinished === 0) {
		return `All ${plural(counts.total, "change")} applied.`;
	}
	const parts = [`${counts.succeeded} of ${counts.total} applied`];
	if (counts.failed > 0) {
		parts.push(`${plural(counts.failed, "failure")}`);
	}
	if (counts.skipped > 0) {
		parts.push(`${counts.skipped} never ran`);
	}
	return `${parts.join(", ")}. Retry leaves what already worked alone.`;
};

export const retryPlan = <TArgs>(result: BulkRunResult<TArgs>): BulkRunPlan<TArgs> | null => {
	const unfinished = new Set(result.outcomes.filter((outcome) => outcome.kind !== "succeeded").map((outcome) => outcome.id));
	const items = result.plan.items.filter((item) => unfinished.has(item.id));
	return items.length === 0 ? null : { ...result.plan, items };
};

export const bulkRunProgress = (completed: number, total: number): BulkRunProgress => {
	const safeTotal = Math.max(0, total);
	const safeCompleted = Math.min(Math.max(0, completed), safeTotal);
	return {
		completed: safeCompleted,
		total: safeTotal,
		percent: safeTotal === 0 ? 1 : safeCompleted / safeTotal,
		caption: safeTotal === 0 ? "Nothing to do" : `${safeCompleted} of ${safeTotal} done`,
	};
};
