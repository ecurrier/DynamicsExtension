import { useQueries, type UseQueryResult } from "@tanstack/react-query";
import { useMemo } from "react";

import { metadataFrom, type QueryMetadata } from "@/shared/lib/fetchxml";
import { type QueryTable } from "@/shared/types";

import { type ResultTables } from "../lib";
import { type QueryGateway } from "./useQueryGateway";

export interface QueryTables {
	tables: ResultTables;
	metadata: QueryMetadata;
}

const combineTables =
	(logicalNames: readonly string[]) =>
	(results: UseQueryResult<QueryTable>[]): QueryTables => {
		const loaded = results.flatMap((result) => (result.data ? [result.data] : []));
		const missing = logicalNames.filter((_, index) => results[index]?.isError === true);
		return {
			tables: Object.fromEntries(loaded.map((table) => [table.logicalName.toLowerCase(), table])),
			metadata: metadataFrom(loaded, missing),
		};
	};

export const useQueryTables = (gateway: QueryGateway, logicalNames: readonly string[]): QueryTables => {
	const key = [...new Set(logicalNames.map((name) => name.trim().toLowerCase()).filter((name) => name !== ""))].join(" ");
	const names = useMemo(() => (key === "" ? [] : key.split(" ")), [key]);
	const combine = useMemo(() => combineTables(names), [names]);
	return useQueries({
		queries: names.map((logicalName) => ({
			queryKey: gateway.key("getTable", { logicalName }),
			queryFn: () => gateway.ops.getTable({ logicalName }),
			enabled: gateway.ready,
			staleTime: Infinity,
			retry: false,
		})),
		combine,
	});
};
