export type RunAction = "create" | "update" | "delete";

export interface RunItem {
	id: string;
	action: RunAction;
	label: string;
	payload?: Record<string, unknown>;
}

export type RunStatus = "success" | "failed" | "cancelled";

export interface RunItemResult {
	id: string;
	action: RunAction;
	label: string;
	status: RunStatus;
	message: string;
}

export interface RunSummary {
	total: number;
	succeeded: number;
	failed: number;
	cancelled: number;
}

export interface RunOptions {
	concurrency?: number;
	signal?: AbortSignal;
	retryDelayMs?: number;
	onResult?: (result: RunItemResult, done: number) => void;
}

const RETRYABLE_STATUSES: ReadonlySet<number> = new Set([429, 503]);

const statusOf = (error: unknown): number | null => {
	if (typeof error !== "object" || error === null) {
		return null;
	}
	const candidate = error as { status?: unknown; details?: { status?: unknown } };
	const status = candidate.status ?? candidate.details?.status;
	return typeof status === "number" ? status : null;
};

export const isRetryable = (error: unknown): boolean => {
	const status = statusOf(error);
	return status !== null && RETRYABLE_STATUSES.has(status);
};

const describe = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const runWithConcurrency = async (items: RunItem[], worker: (item: RunItem) => Promise<void>, options: RunOptions = {}): Promise<RunItemResult[]> => {
	const { concurrency = 4, signal, retryDelayMs = 2000, onResult } = options;
	const results: RunItemResult[] = [];
	let next = 0;
	let done = 0;
	const attempt = async (item: RunItem): Promise<void> => {
		try {
			await worker(item);
		} catch (error) {
			if (!isRetryable(error) || signal?.aborted) {
				throw error;
			}
			await wait(retryDelayMs);
			await worker(item);
		}
	};
	const lane = async (): Promise<void> => {
		while (next < items.length) {
			const index = next;
			next += 1;
			const item = items[index] as RunItem;
			const base = { id: item.id, action: item.action, label: item.label };
			let result: RunItemResult;
			if (signal?.aborted) {
				result = { ...base, status: "cancelled", message: "Cancelled before it started" };
			} else {
				try {
					await attempt(item);
					result = { ...base, status: "success", message: "" };
				} catch (error) {
					result = { ...base, status: "failed", message: describe(error) };
				}
			}
			results[index] = result;
			done += 1;
			onResult?.(result, done);
		}
	};
	await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, lane));
	return results;
};

export const summarize = (results: RunItemResult[]): RunSummary => ({
	total: results.length,
	succeeded: results.filter((result) => result.status === "success").length,
	failed: results.filter((result) => result.status === "failed").length,
	cancelled: results.filter((result) => result.status === "cancelled").length,
});

export const formatFailures = (results: RunItemResult[]): string =>
	results
		.filter((result) => result.status === "failed")
		.map((result) => [result.action, result.id, result.label, result.message].join("\t"))
		.join("\n");
