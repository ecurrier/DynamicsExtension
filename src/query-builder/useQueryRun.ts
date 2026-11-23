import { useCallback, useMemo } from "react";

import { canLoadAllPages, connectionKey, isRunBusy } from "./lib";
import { type LoadPagesOutcome, useQueryBuilderStoreApi } from "./store";

export const useQueryRun = () => {
	const store = useQueryBuilderStoreApi();

	const run = useCallback(async () => {
		const state = store.getState();
		if (Object.values(state.runs).some(isRunBusy)) {
			return;
		}
		const { query, errors } = state.parseNow();
		if (!query || errors.length > 0) {
			return;
		}
		const ids = store.getState().startRuns();
		const { text: fetchXml, connections } = store.getState();
		const checkLacks = connections.length > 1;
		await Promise.all(
			connections.map(async (connection) => {
				const key = connectionKey(connection);
				const id = ids[key];
				if (id === undefined) {
					return;
				}
				const runner = store.getState().runnerFor(key);
				if (!runner) {
					store.getState().failRun(key, id, "This Connection is not ready. Select Run again.");
					return;
				}
				await runner.start(id, { query, fetchXml, checkLacks });
			})
		);
	}, [store]);

	const loadRemaining = useCallback(
		(key: string, pastLimitConfirmed = false): Promise<LoadPagesOutcome> =>
			store.getState().runnerFor(key)?.loadPages("all", pastLimitConfirmed) ?? Promise.resolve("unavailable"),
		[store]
	);

	const nextPage = useCallback((key: string) => void store.getState().runnerFor(key)?.loadPages("next", false), [store]);

	const loadAll = useCallback((key: string) => void loadRemaining(key), [loadRemaining]);

	const keepLoading = useCallback((key: string) => void loadRemaining(key, true), [loadRemaining]);

	const stop = useCallback(
		(key: string) => {
			const current = store.getState().runs[key];
			if (current) {
				store.getState().requestStop(key, current.id);
			}
		},
		[store]
	);

	const loadAllEverywhere = useCallback(() => {
		const { runs } = store.getState();
		Object.entries(runs)
			.filter(([, current]) => canLoadAllPages(current))
			.forEach(([key]) => loadAll(key));
	}, [loadAll, store]);

	return useMemo(
		() => ({ run, nextPage, loadAll, keepLoading, stop, loadRemaining, loadAllEverywhere }),
		[run, nextPage, loadAll, keepLoading, stop, loadRemaining, loadAllEverywhere]
	);
};

export type QueryRunControls = ReturnType<typeof useQueryRun>;
