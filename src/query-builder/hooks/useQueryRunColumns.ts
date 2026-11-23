import { useMemo } from "react";

import { type ConnectionTarget } from "@/shared/connections";
import { useSessionStore } from "@/shared/stores";

import { connectionRecordAppUrl, deriveResultColumns, type QueryRunState, queryTableNames, type ResultGridColumn } from "../lib";
import { type QueryGateway, useQueryGateway } from "./useQueryGateway";
import { useQueryTables } from "./useQueryTables";

export interface QueryRunColumns {
	gateway: QueryGateway;
	columns: readonly ResultGridColumn[];
	appUrl: string | null;
}

export const useQueryRunColumns = (connection: ConnectionTarget, run: QueryRunState): QueryRunColumns => {
	const gateway = useQueryGateway(connection);
	const tabUrl = useSessionStore((state) => state.tabUrl);
	const query = run.source?.query ?? null;
	const tableNames = useMemo(() => queryTableNames(query), [query]);
	const { tables } = useQueryTables(gateway, tableNames);
	const columns = useMemo(() => deriveResultColumns(query, run.rows, tables), [query, run.rows, tables]);
	const appUrl = connectionRecordAppUrl(connection, { environmentUrl: gateway.environment?.modelDrivenAppUrl ?? null, tabUrl });
	return { gateway, columns, appUrl };
};
