import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { describeError } from "@/shared/lib";
import { DEFAULT_PAGE_SIZE, pagedFetchXml } from "@/shared/lib/fetchxml";

import { type QueryGateway } from "./hooks";
import { findTable, loadAllStep, type LoadAllStep, rootTableName } from "./lib";
import { type PagingOutcome, useQueryBuilderStoreApi } from "./store";

const outcomeOf = (step: LoadAllStep): PagingOutcome => (step === "confirm" ? { kind: "confirm" } : { kind: "finished" });

export const useQueryRun = (gateway: QueryGateway, connectionName: string) => {
	const store = useQueryBuilderStoreApi();
	const queryClient = useQueryClient();
	const tables = useQuery({
		queryKey: gateway.key("listTables"),
		queryFn: () => gateway.ops.listTables(),
		enabled: gateway.ready,
		staleTime: Infinity,
		retry: false,
	});

	const run = useCallback(async () => {
		const state = store.getState();
		if (!gateway.ready || state.run.status === "running" || state.run.paging !== "idle") {
			return;
		}
		const { query, errors } = state.parseNow();
		if (!query || errors.length > 0) {
			return;
		}
		const id = store.getState().startRun();
		try {
			const tableName = rootTableName(query);
			if (!tableName) {
				store.getState().failRun(id, "The Query does not name a Table. Give its <entity> element a name attribute.");
				return;
			}
			const list = await queryClient.fetchQuery({
				queryKey: gateway.key("listTables"),
				queryFn: () => gateway.ops.listTables(),
				staleTime: Infinity,
				retry: false,
			});
			const table = findTable(list, tableName);
			if (!table) {
				store.getState().failRun(id, `There is no Table named "${tableName}" in this Connection (${connectionName}).`);
				return;
			}
			const page = pagedFetchXml(query, { page: 1, pagingCookie: null, pageSize: DEFAULT_PAGE_SIZE });
			const result = await gateway.ops.runQuery({ entitySetName: table.entitySetName, fetchXml: page.fetchXml });
			store.getState().finishRun(id, result, { query, entitySetName: table.entitySetName, pageable: page.pageable });
		} catch (error) {
			store.getState().failRun(id, describeError(error));
		}
	}, [connectionName, gateway, queryClient, store]);

	const loadPages = useCallback(
		async (mode: "next" | "all", pastLimitConfirmed: boolean) => {
			const { id } = store.getState().run;
			if (!gateway.ready || !store.getState().startPaging(id, mode, pastLimitConfirmed)) {
				return;
			}
			try {
				let step: LoadAllStep = "continue";
				while (step === "continue") {
					const current = store.getState().run;
					if (current.id !== id || !current.source) {
						return;
					}
					const page = pagedFetchXml(current.source.query, {
						page: current.pageNumber + 1,
						pagingCookie: current.pagingCookie,
						pageSize: DEFAULT_PAGE_SIZE,
					});
					if (!page.pageable) {
						throw new Error(page.reason);
					}
					const result = await gateway.ops.runQuery({ entitySetName: current.source.entitySetName, fetchXml: page.fetchXml });
					store.getState().appendPage(id, result);
					const after = store.getState().run;
					if (after.id !== id) {
						return;
					}
					step =
						mode === "next"
							? "done"
							: loadAllStep({
									loaded: after.rows.length,
									moreRecords: after.moreRecords,
									stopRequested: after.stopRequested,
									pastLimitConfirmed: after.pastLimitConfirmed,
								});
				}
				store.getState().finishPaging(id, outcomeOf(step));
			} catch (error) {
				store.getState().finishPaging(id, { kind: "failed", message: describeError(error) });
			}
		},
		[gateway, store]
	);

	const nextPage = useCallback(() => void loadPages("next", false), [loadPages]);
	const loadAll = useCallback(() => void loadPages("all", false), [loadPages]);
	const keepLoading = useCallback(() => void loadPages("all", true), [loadPages]);
	const stop = useCallback(() => store.getState().requestStop(store.getState().run.id), [store]);

	return { run, nextPage, loadAll, keepLoading, stop, tables };
};
