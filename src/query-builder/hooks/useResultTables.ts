import { type UseQueryResult, useQueries } from "@tanstack/react-query";

import { type QueryTable } from "@/shared/types";

import { type ResultTables } from "../lib";
import { type QueryGateway } from "./useQueryGateway";

const byLogicalName = (results: UseQueryResult<QueryTable>[]): ResultTables =>
	Object.fromEntries(results.flatMap((result) => (result.data ? [[result.data.logicalName.toLowerCase(), result.data]] : [])));

export const useResultTables = (gateway: QueryGateway, logicalNames: readonly string[]): ResultTables =>
	useQueries({
		queries: logicalNames.map((logicalName) => ({
			queryKey: gateway.key("getTable", { logicalName }),
			queryFn: () => gateway.ops.getTable({ logicalName }),
			enabled: gateway.ready,
			staleTime: Infinity,
			retry: false,
		})),
		combine: byLogicalName,
	});
