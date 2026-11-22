import { createContext, useContext } from "react";
import { createStore, type StoreApi, useStore } from "zustand";

import { type ConnectionTarget } from "@/shared/connections";
import { type FetchXmlDocument, type FetchXmlParseError, type NodePath, parseFetchXml } from "@/shared/lib/fetchxml";
import { type QueryRow, type QueryRunResult } from "@/shared/types";

export const PARSE_DELAY_MS = 300;

export type QueryRunStatus = "idle" | "running" | "done" | "failed";

export interface QueryRunState {
	id: number;
	status: QueryRunStatus;
	connection: ConnectionTarget | null;
	rows: QueryRow[];
	moreRecords: boolean;
	pagingCookie: string | null;
	totalRecordCount: number | null;
	elapsedMs: number | null;
	error: string | null;
}

export type PaneId = "tree" | "xml" | "results";

export type ResizablePane = "tree" | "results";

export interface PaneLayout {
	treeWidth: number;
	resultsHeight: number;
	collapsed: Record<PaneId, boolean>;
}

export interface ParsedQuery {
	query: FetchXmlDocument | null;
	errors: readonly FetchXmlParseError[];
}

export interface QueryBuilderState extends ParsedQuery {
	connection: ConnectionTarget;
	text: string;
	parsedText: string;
	selectedPath: NodePath | null;
	run: QueryRunState;
	layout: PaneLayout;
	setText: (text: string) => void;
	parseNow: () => ParsedQuery;
	setConnection: (connection: ConnectionTarget) => void;
	select: (path: NodePath | null) => void;
	startRun: () => number;
	finishRun: (id: number, result: QueryRunResult) => void;
	failRun: (id: number, message: string) => void;
	resizePane: (pane: ResizablePane, size: number) => void;
	togglePane: (pane: PaneId) => void;
	dispose: () => void;
}

export interface QueryBuilderInit {
	connection: ConnectionTarget;
	fetchXml: string | null;
}

export const DEFAULT_LAYOUT: PaneLayout = {
	treeWidth: 280,
	resultsHeight: 300,
	collapsed: { tree: false, xml: false, results: false },
};

const idleRun = (id: number): QueryRunState => ({
	id,
	status: "idle",
	connection: null,
	rows: [],
	moreRecords: false,
	pagingCookie: null,
	totalRecordCount: null,
	elapsedMs: null,
	error: null,
});

export const parseQueryText = (text: string, previous: FetchXmlDocument | null): ParsedQuery => {
	if (text.trim() === "") {
		return { query: null, errors: [] };
	}
	const result = parseFetchXml(text);
	return result.ok ? { query: result.document, errors: [] } : { query: previous, errors: result.errors };
};

export const createQueryBuilderStore = ({ connection, fetchXml }: QueryBuilderInit): StoreApi<QueryBuilderState> => {
	let timer: ReturnType<typeof setTimeout> | null = null;
	const cancelParse = () => {
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
		}
	};
	const text = fetchXml ?? "";
	return createStore<QueryBuilderState>()((set, get) => {
		const applyParse = (): ParsedQuery => {
			cancelParse();
			const state = get();
			if (state.parsedText === state.text) {
				return { query: state.query, errors: state.errors };
			}
			const parsed = parseQueryText(state.text, state.query);
			set({ ...parsed, parsedText: state.text });
			return parsed;
		};
		return {
			connection,
			text,
			parsedText: text,
			...parseQueryText(text, null),
			selectedPath: null,
			run: idleRun(0),
			layout: DEFAULT_LAYOUT,
			setText: (next) => {
				set({ text: next });
				cancelParse();
				timer = setTimeout(applyParse, PARSE_DELAY_MS);
			},
			parseNow: applyParse,
			setConnection: (next) => set((state) => ({ connection: next, run: idleRun(state.run.id + 1) })),
			select: (path) => set({ selectedPath: path }),
			startRun: () => {
				const { run, connection: current } = get();
				const id = run.id + 1;
				set({ run: { ...idleRun(id), status: "running", connection: current } });
				return id;
			},
			finishRun: (id, result) =>
				set((state) =>
					state.run.id === id
						? {
								run: {
									...state.run,
									status: "done",
									rows: result.rows,
									moreRecords: result.moreRecords,
									pagingCookie: result.pagingCookie,
									totalRecordCount: result.totalRecordCount,
									elapsedMs: result.elapsedMs,
								},
							}
						: state
				),
			failRun: (id, message) => set((state) => (state.run.id === id ? { run: { ...state.run, status: "failed", error: message } } : state)),
			resizePane: (pane, size) => set((state) => ({ layout: { ...state.layout, ...(pane === "tree" ? { treeWidth: size } : { resultsHeight: size }) } })),
			togglePane: (pane) =>
				set((state) => ({ layout: { ...state.layout, collapsed: { ...state.layout.collapsed, [pane]: !state.layout.collapsed[pane] } } })),
			dispose: cancelParse,
		};
	});
};

export const QueryBuilderStoreContext = createContext<StoreApi<QueryBuilderState> | null>(null);

export const useQueryBuilderStoreApi = (): StoreApi<QueryBuilderState> => {
	const store = useContext(QueryBuilderStoreContext);
	if (!store) {
		throw new Error("The Query Builder store is used outside the Query Builder");
	}
	return store;
};

export const useQueryBuilder = <T>(selector: (state: QueryBuilderState) => T): T => useStore(useQueryBuilderStoreApi(), selector);
