import { createContext, type ReactNode, useContext, useMemo } from "react";

import { type Diagnostic, tablesNamedIn, validate } from "@/shared/lib/fetchxml";

import { type QueryGateway, useQueryTables } from "./hooks";
import { NO_ROW_PROBLEMS, rowProblems, type RowProblems } from "./lib";
import { useQueryBuilder } from "./store";

export interface QueryDiagnostics {
	readonly diagnostics: readonly Diagnostic[];
	readonly rows: RowProblems;
}

const NO_DIAGNOSTICS: QueryDiagnostics = { diagnostics: [], rows: NO_ROW_PROBLEMS };

const QueryDiagnosticsContext = createContext<QueryDiagnostics>(NO_DIAGNOSTICS);

export const useQueryDiagnostics = (): QueryDiagnostics => useContext(QueryDiagnosticsContext);

interface QueryDiagnosticsProviderProps {
	gateway: QueryGateway;
	children: ReactNode;
}

export const QueryDiagnosticsProvider = ({ gateway, children }: QueryDiagnosticsProviderProps) => {
	const query = useQueryBuilder((state) => state.query);
	const tableNames = useMemo(() => (query ? tablesNamedIn(query) : []), [query]);
	const { metadata } = useQueryTables(gateway, tableNames);
	const value = useMemo<QueryDiagnostics>(() => {
		if (!query) {
			return NO_DIAGNOSTICS;
		}
		const diagnostics = validate(query, metadata);
		return { diagnostics, rows: rowProblems(query, diagnostics) };
	}, [query, metadata]);
	return <QueryDiagnosticsContext.Provider value={value}>{children}</QueryDiagnosticsContext.Provider>;
};
