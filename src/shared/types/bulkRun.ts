export type BulkRunOutcomeKind = "succeeded" | "failed" | "skipped";

export interface BulkRunItem<TArgs = unknown> {
	id: string;
	label: string;
	detail: string;
	args: TArgs;
}

export interface BulkRunPlan<TArgs = unknown> {
	title: string;
	action: string;
	items: BulkRunItem<TArgs>[];
}

export interface BulkRunOutcome {
	id: string;
	kind: BulkRunOutcomeKind;
	message: string | null;
}

export interface BulkRunResult<TArgs = unknown> {
	plan: BulkRunPlan<TArgs>;
	outcomes: BulkRunOutcome[];
}

export interface BulkRunCounts {
	total: number;
	succeeded: number;
	failed: number;
	skipped: number;
	unfinished: number;
}

export interface BulkRunProgress {
	completed: number;
	total: number;
	percent: number;
	caption: string;
}
