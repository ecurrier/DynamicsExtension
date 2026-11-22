import { createContext, useContext } from "react";
import { createStore, type StoreApi, useStore } from "zustand";

import { type ConnectionTarget } from "@/shared/connections";
import { type FetchXmlDocument, type FetchXmlParseError, type NodePath, parseFetchXml } from "@/shared/lib/fetchxml";
import { type QueryRow, type QueryRunResult } from "@/shared/types";

import { type ResultsPaging } from "./lib";

export const PARSE_DELAY_MS = 300;

export type QueryRunStatus = "idle" | "running" | "done" | "failed";

export interface QueryRunSource {
	query: FetchXmlDocument;
	entitySetName: string;
	pageable: boolean;
}

export interface QueryRunPage {
	rows: QueryRow[];
	annotations: Record<string, unknown>;
}

export interface QueryRunState {
	id: number;
	status: QueryRunStatus;
	connection: ConnectionTarget | null;
	source: QueryRunSource | null;
	rows: QueryRow[];
	pages: QueryRunPage[];
	pageNumber: number;
	moreRecords: boolean;
	pagingCookie: string | null;
	totalRecordCount: number | null;
	elapsedMs: number | null;
	error: string | null;
	paging: ResultsPaging;
	pageError: string | null;
	stopRequested: boolean;
	pastLimitConfirmed: boolean;
	awaitingLimitConfirmation: boolean;
}

export type PaneId = "tree" | "xml" | "results";

export type ResizablePane = "tree" | "results";

export interface PaneLayout {
	treeWidth: number;
	resultsHeight: number;
	collapsed: Record<PaneId, boolean>;
	resultsMaximised: boolean;
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
	finishRun: (id: number, result: QueryRunResult, source?: QueryRunSource | null) => void;
	failRun: (id: number, message: string) => void;
	startPaging: (id: number, paging: Exclude<ResultsPaging, "idle">, pastLimitConfirmed?: boolean) => boolean;
	appendPage: (id: number, result: QueryRunResult) => void;
	finishPaging: (id: number, outcome: PagingOutcome) => void;
	requestStop: (id: number) => void;
	setResultsMaximised: (maximised: boolean) => void;
	resizePane: (pane: ResizablePane, size: number) => void;
	togglePane: (pane: PaneId) => void;
	dispose: () => void;
}

export type PagingOutcome = { kind: "finished" } | { kind: "confirm" } | { kind: "failed"; message: string };

export interface QueryBuilderInit {
	connection: ConnectionTarget;
	fetchXml: string | null;
}

export const DEFAULT_LAYOUT: PaneLayout = {
	treeWidth: 280,
	resultsHeight: 300,
	collapsed: { tree: false, xml: false, results: false },
	resultsMaximised: false,
};

const idleRun = (id: number): QueryRunState => ({
	id,
	status: "idle",
	connection: null,
	source: null,
	rows: [],
	pages: [],
	pageNumber: 0,
	moreRecords: false,
	pagingCookie: null,
	totalRecordCount: null,
	elapsedMs: null,
	error: null,
	paging: "idle",
	pageError: null,
	stopRequested: false,
	pastLimitConfirmed: false,
	awaitingLimitConfirmation: false,
});

const updateRun = (state: QueryBuilderState, id: number, update: (run: QueryRunState) => Partial<QueryRunState>): Partial<QueryBuilderState> =>
	state.run.id === id ? { run: { ...state.run, ...update(state.run) } } : state;

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
			finishRun: (id, result, source = null) =>
				set((state) =>
					updateRun(state, id, () => ({
						status: "done",
						source,
						rows: result.rows,
						pages: [{ rows: result.rows, annotations: result.annotations }],
						pageNumber: 1,
						moreRecords: result.moreRecords,
						pagingCookie: result.pagingCookie,
						totalRecordCount: result.totalRecordCount,
						elapsedMs: result.elapsedMs,
					}))
				),
			failRun: (id, message) => set((state) => updateRun(state, id, () => ({ status: "failed", error: message }))),
			startPaging: (id, paging, pastLimitConfirmed = false) => {
				const { run } = get();
				if (run.id !== id || run.status !== "done" || run.paging !== "idle" || !run.moreRecords || !run.source?.pageable) {
					return false;
				}
				set({
					run: {
						...run,
						paging,
						pageError: null,
						stopRequested: false,
						awaitingLimitConfirmation: false,
						pastLimitConfirmed: run.pastLimitConfirmed || pastLimitConfirmed,
					},
				});
				return true;
			},
			appendPage: (id, result) =>
				set((state) =>
					updateRun(state, id, (run) => ({
						rows: run.rows.concat(result.rows),
						pages: [...run.pages, { rows: result.rows, annotations: result.annotations }],
						pageNumber: run.pageNumber + 1,
						moreRecords: result.moreRecords,
						pagingCookie: result.pagingCookie,
						elapsedMs: result.elapsedMs,
					}))
				),
			finishPaging: (id, outcome) =>
				set((state) =>
					updateRun(state, id, () => ({
						paging: "idle",
						stopRequested: false,
						awaitingLimitConfirmation: outcome.kind === "confirm",
						pageError: outcome.kind === "failed" ? outcome.message : null,
					}))
				),
			requestStop: (id) =>
				set((state) => updateRun(state, id, (run) => (run.paging === "idle" ? { awaitingLimitConfirmation: false } : { stopRequested: true }))),
			setResultsMaximised: (maximised) => set((state) => ({ layout: { ...state.layout, resultsMaximised: maximised } })),
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
