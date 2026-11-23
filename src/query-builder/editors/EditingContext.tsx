import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext, useMemo } from "react";

import { type RecordLookupServices } from "@/shared/components";
import { columnOf, type QueryMetadata, tablesNamedIn } from "@/shared/lib/fetchxml";
import { type QueryTable, type QueryTableSummary } from "@/shared/types";

import { type QueryGateway, useQueryTables } from "../hooks";
import { findTable, RECORD_SEARCH_TOP, recordSearchFetchXml, recordSearchResults } from "../lib";
import { useQueryBuilder } from "../store";

export interface QueryEditing {
	readonly gateway: QueryGateway;
	readonly metadata: QueryMetadata;
	readonly tables: readonly QueryTableSummary[] | undefined;
	readonly lookup: RecordLookupServices;
	readonly loadTable: (logicalName: string) => Promise<QueryTable | null>;
	readonly openDetails: () => void;
}

const QueryEditingContext = createContext<QueryEditing | null>(null);

const InPaneContext = createContext(false);

export const useQueryEditing = (): QueryEditing => {
	const editing = useContext(QueryEditingContext);
	if (!editing) {
		throw new Error("Query editing is used outside the Query Builder");
	}
	return editing;
};

export const useInPane = (): boolean => useContext(InPaneContext);

export const InPane = ({ children }: { children: ReactNode }) => <InPaneContext.Provider value>{children}</InPaneContext.Provider>;

interface QueryEditingProviderProps {
	gateway: QueryGateway;
	openDetails: () => void;
	children: ReactNode;
}

export const QueryEditingProvider = ({ gateway, openDetails, children }: QueryEditingProviderProps) => {
	const query = useQueryBuilder((state) => state.query);
	const queryClient = useQueryClient();
	const tableNames = useMemo(() => (query ? tablesNamedIn(query) : []), [query]);
	const { metadata } = useQueryTables(gateway, tableNames);
	const tableList = useQuery({
		queryKey: gateway.key("listTables"),
		queryFn: () => gateway.ops.listTables(),
		enabled: gateway.ready,
		staleTime: Infinity,
		retry: false,
	});
	const tables = tableList.data;

	const value = useMemo<QueryEditing>(() => {
		const summaryOf = async (logicalName: string): Promise<QueryTableSummary> => {
			const list = await queryClient.fetchQuery({
				queryKey: gateway.key("listTables"),
				queryFn: () => gateway.ops.listTables(),
				staleTime: Infinity,
				retry: false,
			});
			const table = findTable(list, logicalName);
			if (!table) {
				throw new Error(`Table "${logicalName}" does not exist`);
			}
			return table;
		};
		const loadTable = async (logicalName: string): Promise<QueryTable | null> => {
			try {
				return await queryClient.fetchQuery({
					queryKey: gateway.key("getTable", { logicalName }),
					queryFn: () => gateway.ops.getTable({ logicalName }),
					staleTime: Infinity,
					retry: false,
				});
			} catch {
				return null;
			}
		};
		return {
			gateway,
			metadata,
			tables,
			openDetails,
			loadTable,
			lookup: {
				search: async (entityLogicalName, text) => {
					const table = await summaryOf(entityLogicalName);
					const details = await loadTable(table.logicalName);
					const modifiedOn = details !== null && columnOf(details, "modifiedon") !== undefined;
					const result = await gateway.ops.runQuery({
						entitySetName: table.entitySetName,
						fetchXml: recordSearchFetchXml(table, text, RECORD_SEARCH_TOP, modifiedOn),
					});
					return recordSearchResults(table, result.rows);
				},
				getEntityInfo: async (logicalName) => {
					const table = await summaryOf(logicalName);
					return {
						logicalName: table.logicalName,
						displayName: table.displayName,
						entitySetName: table.entitySetName,
						primaryIdAttribute: table.primaryIdAttribute,
						primaryNameAttribute: table.primaryNameAttribute,
					};
				},
			},
		};
	}, [gateway, metadata, tables, openDetails, queryClient]);

	return <QueryEditingContext.Provider value={value}>{children}</QueryEditingContext.Provider>;
};
