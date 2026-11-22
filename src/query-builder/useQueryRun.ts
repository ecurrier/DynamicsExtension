import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { describeError } from "@/shared/lib";
import { DEFAULT_PAGE_SIZE, pagedFetchXml } from "@/shared/lib/fetchxml";

import { type QueryGateway } from "./hooks";
import { findTable, rootTableName } from "./lib";
import { useQueryBuilderStoreApi } from "./store";

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
		if (!gateway.ready || state.run.status === "running") {
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
			store.getState().finishRun(id, result);
		} catch (error) {
			store.getState().failRun(id, describeError(error));
		}
	}, [connectionName, gateway, queryClient, store]);

	return { run, tables };
};
