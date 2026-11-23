import { useCallback, useMemo } from "react";

import {
	compareColumns,
	comparedSide,
	compareFailureMessage,
	compareLoadPlan,
	comparePair,
	compareQueryRuns,
	connectionKey,
	needsRunBeforeCompare,
	primaryKeyOf,
	resolveCompareSetup,
	type ResultTables,
	rootTableName,
} from "../lib";
import { useQueryBuilderStoreApi } from "../store";
import { type QueryRunControls } from "../useQueryRun";

export interface CompareContext {
	tables: ResultTables;
	names: Readonly<Record<string, string>>;
}

export const useCompare = (controls: QueryRunControls) => {
	const store = useQueryBuilderStoreApi();

	const currentPair = useCallback(() => {
		const state = store.getState();
		return comparePair(state.compare.setup, state.connections.map(connectionKey));
	}, [store]);

	const fail = useCallback(
		(attempt: number, keys: readonly string[], { names }: CompareContext) => {
			const { runs, updateCompare } = store.getState();
			updateCompare(attempt, {
				kind: "failed",
				failures: keys.map((key) => ({ key, name: names[key] ?? key, message: compareFailureMessage(runs[key]) })),
			});
		},
		[store]
	);

	const finish = useCallback(
		(attempt: number, pair: readonly [string, string], context: CompareContext) => {
			const state = store.getState();
			const [firstKey, secondKey] = pair;
			const first = state.runs[firstKey];
			const second = state.runs[secondKey];
			if (!first || !second) {
				fail(attempt, pair, context);
				return;
			}
			const columns = compareColumns(state.query, first.rows, second.rows, context.tables);
			const primaryKey = primaryKeyOf(columns, state.query ? rootTableName(state.query) : null, context.tables);
			const resolution = resolveCompareSetup(state.compare.setup, { keys: state.connections.map(connectionKey), columns, primaryKey });
			if (!resolution.ok) {
				state.updateCompare(attempt, { kind: "failed", failures: [{ key: "", name: "", message: resolution.reason }] });
				return;
			}
			const { setup } = resolution;
			const comparison = compareQueryRuns(first.rows, second.rows, {
				columns,
				primaryKey: setup.primaryKey,
				matchKey: setup.matchKey,
				comparedColumns: setup.comparedColumns,
			});
			state.finishCompare(attempt, {
				id: attempt,
				comparison,
				first: comparedSide(firstKey, context.names[firstKey] ?? firstKey, first),
				second: comparedSide(secondKey, context.names[secondKey] ?? secondKey, second),
				text: state.text,
				setup: state.compare.setup,
				matchKey: setup.matchKey,
				keyColumns: setup.keyColumns,
				primaryKey: setup.primaryKey,
			});
		},
		[fail, store]
	);

	const load = useCallback(
		async (attempt: number, pair: readonly [string, string], confirmed: readonly string[], context: CompareContext) => {
			if (!store.getState().updateCompare(attempt, { kind: "loading" })) {
				return;
			}
			const keys = confirmed.length > 0 ? confirmed : pair;
			const outcomes = Object.fromEntries(
				await Promise.all(keys.map(async (key) => [key, await controls.loadRemaining(key, confirmed.includes(key))] as const))
			);
			if (store.getState().compare.attempt !== attempt) {
				return;
			}
			const plan = compareLoadPlan(outcomes);
			if (plan.kind === "failed") {
				fail(attempt, plan.keys, context);
			} else if (plan.kind === "confirm") {
				store.getState().updateCompare(attempt, { kind: "confirm", keys: plan.keys });
			} else {
				finish(attempt, pair, context);
			}
		},
		[controls, fail, finish, store]
	);

	const compare = useCallback(
		async (context: CompareContext) => {
			const pair = currentPair();
			if (!pair) {
				return;
			}
			const state = store.getState();
			const mustRun = needsRunBeforeCompare(
				pair.map((key) => state.runs[key]),
				state.text,
				state.lastRunText
			);
			const attempt = state.beginCompare({ kind: mustRun ? "running" : "loading" });
			if (mustRun) {
				await controls.run();
				if (store.getState().compare.attempt !== attempt) {
					return;
				}
			}
			const runs = store.getState().runs;
			const notDone = pair.filter((key) => runs[key]?.status !== "done");
			if (notDone.length > 0) {
				fail(attempt, notDone, context);
				return;
			}
			await load(attempt, pair, [], context);
		},
		[controls, currentPair, fail, load, store]
	);

	const keepLoading = useCallback(
		async (context: CompareContext) => {
			const { compare: state } = store.getState();
			const pair = currentPair();
			if (state.progress.kind !== "confirm" || !pair) {
				return;
			}
			await load(state.attempt, pair, state.progress.keys, context);
		},
		[currentPair, load, store]
	);

	const compareLoaded = useCallback(
		(context: CompareContext) => {
			const { compare: state } = store.getState();
			const pair = currentPair();
			if (state.progress.kind !== "confirm" || !pair) {
				return;
			}
			state.progress.keys.forEach((key) => controls.stop(key));
			finish(state.attempt, pair, context);
		},
		[controls, currentPair, finish, store]
	);

	const stop = useCallback(() => {
		currentPair()?.forEach((key) => controls.stop(key));
	}, [controls, currentPair]);

	return useMemo(() => ({ compare, keepLoading, compareLoaded, stop }), [compare, keepLoading, compareLoaded, stop]);
};

export type CompareActions = ReturnType<typeof useCompare>;
