import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { type ConnectionTarget } from "@/shared/connections";
import { describeError } from "@/shared/lib";
import { DEFAULT_PAGE_SIZE, type FetchXmlDocument, metadataFrom, pagedFetchXml, tablesNamedIn, validate } from "@/shared/lib/fetchxml";
import { type QueryRunOutcome } from "@/shared/storage";
import { type QueryTable, type QueryTableSummary } from "@/shared/types";

import { type QueryGateway, useQueryGateway } from "./hooks";
import {
	CONNECTION_UNAVAILABLE,
	connectionKey,
	connectionLacks,
	errorOutcome,
	findTable,
	loadAllStep,
	type LoadAllStep,
	missingTables,
	type PagingOutcome,
	recordsOutcome,
	rootTableName,
} from "./lib";
import { type LoadPagesOutcome, type QueryRunner, useQueryBuilderStoreApi } from "./store";

export interface QueryRunRecord {
	fetchXml: string;
	connection: ConnectionTarget;
	ranAt: number;
	outcome: QueryRunOutcome;
	elapsedMs: number | null;
}

const outcomeOf = (step: LoadAllStep): PagingOutcome => (step === "confirm" ? { kind: "confirm" } : { kind: "finished" });

const loadOutcomeOf = (step: LoadAllStep): LoadPagesOutcome => (step === "confirm" ? "confirm" : step === "stopped" ? "stopped" : "complete");

const listTables = (queryClient: QueryClient, gateway: QueryGateway): Promise<QueryTableSummary[]> =>
	queryClient.fetchQuery({
		queryKey: gateway.key("listTables"),
		queryFn: () => gateway.ops.listTables(),
		staleTime: Infinity,
		retry: false,
	});

const loadTable = (queryClient: QueryClient, gateway: QueryGateway, logicalName: string): Promise<QueryTable | null> =>
	queryClient
		.fetchQuery({
			queryKey: gateway.key("getTable", { logicalName }),
			queryFn: () => gateway.ops.getTable({ logicalName }),
			staleTime: Infinity,
			retry: false,
		})
		.catch(() => null);

const lacksOf = async (
	queryClient: QueryClient,
	gateway: QueryGateway,
	query: FetchXmlDocument,
	list: readonly QueryTableSummary[],
	connectionName: string
): Promise<string | null> => {
	const names = [...new Set(tablesNamedIn(query).map((name) => name.trim().toLowerCase()))];
	const missing = missingTables(names, list);
	const loaded = await Promise.all(names.filter((name) => !missing.includes(name)).map((name) => loadTable(queryClient, gateway, name)));
	const metadata = metadataFrom(
		loaded.filter((table): table is QueryTable => table !== null),
		missing
	);
	return connectionLacks(query, validate(query, metadata), connectionName);
};

export const useConnectionRunner = (connection: ConnectionTarget, connectionName: string, onQueryRun: (record: QueryRunRecord) => void) => {
	const store = useQueryBuilderStoreApi();
	const queryClient = useQueryClient();
	const gateway = useQueryGateway(connection);
	const key = connectionKey(connection);

	useEffect(() => {
		const runner: QueryRunner = {
			start: async (id, { query, fetchXml, checkLacks }) => {
				const ranAt = Date.now();
				const started = performance.now();
				const fail = (message: string) => {
					store.getState().failRun(key, id, message);
					onQueryRun({ fetchXml, connection, ranAt, outcome: errorOutcome(message), elapsedMs: Math.round(performance.now() - started) });
				};
				if (!gateway.ready) {
					fail(CONNECTION_UNAVAILABLE);
					return;
				}
				try {
					const tableName = rootTableName(query);
					if (!tableName) {
						fail("The Query has no Table. Add a name attribute to the entity element.");
						return;
					}
					const list = await listTables(queryClient, gateway);
					const lacks = checkLacks ? await lacksOf(queryClient, gateway, query, list, connectionName) : null;
					if (lacks) {
						fail(lacks);
						return;
					}
					const table = findTable(list, tableName);
					if (!table) {
						fail(`Table "${tableName}" is not in this Connection (${connectionName}).`);
						return;
					}
					const page = pagedFetchXml(query, { page: 1, pagingCookie: null, pageSize: DEFAULT_PAGE_SIZE });
					const result = await gateway.ops.runQuery({ entitySetName: table.entitySetName, fetchXml: page.fetchXml });
					store.getState().finishRun(key, id, result, { query, entitySetName: table.entitySetName, pageable: page.pageable });
					onQueryRun({ fetchXml, connection, ranAt, outcome: recordsOutcome(result), elapsedMs: result.elapsedMs });
				} catch (error) {
					fail(describeError(error));
				}
			},
			loadPages: async (mode, pastLimitConfirmed) => {
				const run = store.getState().runs[key];
				if (!run) {
					return "unavailable";
				}
				if (run.status === "done" && run.paging === "idle" && !run.moreRecords) {
					return "complete";
				}
				const { id } = run;
				if (!gateway.ready || !store.getState().startPaging(key, id, mode, pastLimitConfirmed)) {
					return "unavailable";
				}
				try {
					let step: LoadAllStep = "continue";
					while (step === "continue") {
						const current = store.getState().runs[key];
						if (current?.id !== id || !current.source) {
							return "unavailable";
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
						store.getState().appendPage(key, id, result);
						const after = store.getState().runs[key];
						if (after?.id !== id) {
							return "unavailable";
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
					store.getState().finishPaging(key, id, outcomeOf(step));
					return loadOutcomeOf(step);
				} catch (error) {
					store.getState().finishPaging(key, id, { kind: "failed", message: describeError(error) });
					return "failed";
				}
			},
		};
		return store.getState().registerRunner(key, runner);
	}, [connection, connectionName, gateway, key, onQueryRun, queryClient, store]);
};
