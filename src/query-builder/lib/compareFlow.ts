import { type CompareSetup, sameCompareSetup } from "./compareSetup";
import { type Comparison, type MatchKey } from "./comparison";
import { type LoadPagesOutcome, type QueryRuns, type QueryRunState } from "./queryRuns";
import { type ResultColumn } from "./resultColumn";

export interface CompareFailure {
	key: string;
	name: string;
	message: string;
}

export type CompareProgress =
	| { kind: "idle" }
	| { kind: "running" }
	| { kind: "loading" }
	| { kind: "confirm"; keys: readonly string[] }
	| { kind: "failed"; failures: readonly CompareFailure[] };

export const IDLE_COMPARE: CompareProgress = { kind: "idle" };

export type CompareLoadPlan = { kind: "compare" } | { kind: "confirm"; keys: string[] } | { kind: "failed"; keys: string[] };

export const compareLoadPlan = (outcomes: Readonly<Record<string, LoadPagesOutcome>>): CompareLoadPlan => {
	const entries = Object.entries(outcomes);
	const failed = entries.filter(([, outcome]) => outcome === "failed" || outcome === "unavailable").map(([key]) => key);
	if (failed.length > 0) {
		return { kind: "failed", keys: failed };
	}
	const confirm = entries.filter(([, outcome]) => outcome === "confirm").map(([key]) => key);
	return confirm.length > 0 ? { kind: "confirm", keys: confirm } : { kind: "compare" };
};

export const needsRunBeforeCompare = (runs: readonly (QueryRunState | undefined)[], text: string, lastRunText: string | null): boolean =>
	lastRunText !== text || runs.some((run) => run === undefined || run.status === "idle");

export const compareFailureMessage = (run: QueryRunState | undefined): string => {
	if (run?.status === "failed" && run.error) {
		return run.error;
	}
	if (run?.pageError) {
		return run.pageError;
	}
	return "The Connection is not ready. Select Compare again.";
};

export interface ComparedSide {
	key: string;
	name: string;
	runId: number;
	loaded: number;
	partial: boolean;
}

export const comparedSide = (key: string, name: string, run: QueryRunState): ComparedSide => ({
	key,
	name,
	runId: run.id,
	loaded: run.rows.length,
	partial: run.moreRecords,
});

export interface StoredComparison {
	id: number;
	comparison: Comparison;
	first: ComparedSide;
	second: ComparedSide;
	text: string;
	setup: CompareSetup;
	matchKey: MatchKey;
	keyColumns: readonly ResultColumn[];
	primaryKey: string;
}

export interface CompareCurrent {
	text: string;
	setup: CompareSetup;
	pair: readonly [string, string] | null;
	runs: QueryRuns;
}

export const isComparisonStale = (stored: StoredComparison, { text, setup, pair, runs }: CompareCurrent): boolean => {
	const withoutPair = (value: CompareSetup): CompareSetup => ({ ...value, firstKey: null, secondKey: null });
	if (stored.text !== text || !sameCompareSetup(withoutPair(stored.setup), withoutPair(setup))) {
		return true;
	}
	if (!pair || pair[0] !== stored.first.key || pair[1] !== stored.second.key) {
		return true;
	}
	return [stored.first, stored.second].some((side) => {
		const run = runs[side.key];
		return !run || run.id !== side.runId || run.rows.length !== side.loaded;
	});
};
