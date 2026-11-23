import { useCallback, useMemo } from "react";

import { useConnectableEnvironments } from "@/modules/settings";
import { type ConnectionTarget } from "@/shared/connections";
import { useSessionStore } from "@/shared/stores";

import { useQueryGateway, useQueryTables } from "../hooks";
import { compareColumns, type ConnectionRunEntry, connectionRecordAppUrl, primaryKeyOf, queryTableNames, rootTableName } from "../lib";
import { useQueryBuilder } from "../store";

export const useCompareContext = (entries: readonly ConnectionRunEntry[], first: ConnectionRunEntry, second: ConnectionRunEntry) => {
	const query = useQueryBuilder((state) => state.query);
	const gateway = useQueryGateway(first.connection);
	const tableNames = useMemo(() => queryTableNames(query), [query]);
	const { tables } = useQueryTables(gateway, tableNames);
	const columns = useMemo(() => compareColumns(query, first.run.rows, second.run.rows, tables), [query, first.run.rows, second.run.rows, tables]);
	const primaryKey = primaryKeyOf(columns, query ? rootTableName(query) : null, tables);
	const { byId } = useConnectableEnvironments();
	const tabUrl = useSessionStore((state) => state.tabUrl);
	const names = useMemo(() => Object.fromEntries(entries.map((entry) => [entry.key, entry.name])), [entries]);

	const appUrlOf = useCallback(
		(key: string): string | null => {
			const connection: ConnectionTarget | undefined = entries.find((entry) => entry.key === key)?.connection;
			if (!connection) {
				return null;
			}
			const environmentUrl = connection.kind === "environment" ? (byId[connection.environmentId]?.modelDrivenAppUrl ?? null) : null;
			return connectionRecordAppUrl(connection, { environmentUrl, tabUrl });
		},
		[byId, entries, tabUrl]
	);

	return { tables, columns, primaryKey, names, appUrlOf };
};

export type CompareView = ReturnType<typeof useCompareContext>;
