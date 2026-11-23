import { createContext, useContext } from "react";
import { createStore, type StoreApi, useStore } from "zustand";

import { type ConnectionTarget } from "@/shared/connections";
import { type FetchXmlDocument, type FetchXmlParseError, type NodePath, parseFetchXml, pathAtOffset, serializeFetchXml } from "@/shared/lib/fetchxml";
import { type QueryRow, type QueryRunResult } from "@/shared/types";

import {
	ancestorKeys,
	type ChangeResult,
	type CollapsibleGroup,
	type NamesLead,
	pathKey,
	type QueryChange,
	remapKeys,
	remapPath,
	type ResultsPaging,
	rowPathOf,
	samePath,
} from "./lib";

export const PARSE_DELAY_MS = 300;

export const HISTORY_LIMIT = 100;

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

export type PaneId = "tree" | "details" | "xml" | "results";

export type ResizablePane = "tree" | "details" | "results";

export interface PaneLayout {
	treeWidth: number | null;
	detailsWidth: number;
	resultsHeight: number;
	collapsed: Record<PaneId, boolean>;
	detailsForced: boolean;
	resultsMaximised: boolean;
	detailsGroups: Record<CollapsibleGroup, boolean>;
}

export interface ParsedQuery {
	query: FetchXmlDocument | null;
	errors: readonly FetchXmlParseError[];
}

export type SelectionOrigin = "tree" | "editor";

export interface TreeSnapshot {
	text: string;
	selectedPath: NodePath | null;
	collapsed: ReadonlySet<string>;
}

export interface HistoryEntry {
	before: TreeSnapshot;
	after: TreeSnapshot;
}

export interface TreeHistory {
	undo: readonly HistoryEntry[];
	redo: readonly HistoryEntry[];
}

export interface EditorHistory {
	undo: () => boolean;
	redo: () => boolean;
}

export interface QueryBuilderState extends ParsedQuery {
	connection: ConnectionTarget;
	text: string;
	parsedText: string;
	selectedPath: NodePath | null;
	selectionOrigin: SelectionOrigin;
	collapsed: ReadonlySet<string>;
	namesLead: NamesLead;
	history: TreeHistory;
	run: QueryRunState;
	layout: PaneLayout;
	setText: (text: string) => void;
	parseNow: () => ParsedQuery;
	setConnection: (connection: ConnectionTarget) => void;
	select: (path: NodePath | null, origin?: SelectionOrigin) => void;
	selectAtOffset: (offset: number) => void;
	setExpanded: (path: NodePath, open: boolean) => void;
	setNamesLead: (lead: NamesLead) => void;
	edit: (build: (query: FetchXmlDocument) => ChangeResult) => ChangeResult;
	applyChange: (change: QueryChange) => void;
	undo: () => void;
	redo: () => void;
	attachEditor: (editor: EditorHistory) => () => void;
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
	showDetails: (force: boolean) => void;
	releaseDetails: () => void;
	setDetailsGroupOpen: (group: CollapsibleGroup, open: boolean) => void;
	registerDraft: (commit: () => void) => () => void;
	flushDraft: () => void;
	dispose: () => void;
}

export type PagingOutcome = { kind: "finished" } | { kind: "confirm" } | { kind: "failed"; message: string };

export interface QueryBuilderInit {
	connection: ConnectionTarget;
	fetchXml: string | null;
}

export const DEFAULT_LAYOUT: PaneLayout = {
	treeWidth: null,
	detailsWidth: 280,
	resultsHeight: 300,
	collapsed: { tree: false, details: false, xml: false, results: false },
	detailsForced: false,
	resultsMaximised: false,
	detailsGroups: { more: false, legacy: false },
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

const EMPTY_HISTORY: TreeHistory = { undo: [], redo: [] };

const NO_KEYS: ReadonlySet<string> = new Set();

const withoutAncestors = (collapsed: ReadonlySet<string>, path: NodePath | null): ReadonlySet<string> => {
	if (path === null) {
		return collapsed;
	}
	const keys = ancestorKeys(path);
	if (!keys.some((key) => collapsed.has(key))) {
		return collapsed;
	}
	const next = new Set(collapsed);
	keys.forEach((key) => next.delete(key));
	return next;
};

const snapshotOf = (state: QueryBuilderState): TreeSnapshot => ({ text: state.text, selectedPath: state.selectedPath, collapsed: state.collapsed });

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
	let pendingOffset: number | null = null;
	let editor: EditorHistory | null = null;
	let draft: (() => void) | null = null;
	return createStore<QueryBuilderState>()((set, get) => {
		const selectionAt = (query: FetchXmlDocument, offset: number): NodePath | null => {
			const path = pathAtOffset(query, offset);
			return path === undefined ? null : rowPathOf(query, path);
		};
		const selectFromEditor = (path: NodePath | null) => {
			const state = get();
			if (samePath(state.selectedPath, path) && state.selectionOrigin === "editor") {
				return;
			}
			set({ selectedPath: path, selectionOrigin: "editor", collapsed: withoutAncestors(state.collapsed, path) });
		};
		const applyParse = (): ParsedQuery => {
			cancelParse();
			const state = get();
			if (state.parsedText === state.text) {
				return { query: state.query, errors: state.errors };
			}
			const parsed = parseQueryText(state.text, state.query);
			set({ ...parsed, parsedText: state.text });
			if (pendingOffset !== null && parsed.errors.length === 0 && parsed.query) {
				const offset = pendingOffset;
				pendingOffset = null;
				selectFromEditor(selectionAt(parsed.query, offset));
			}
			return parsed;
		};
		const restore = (snapshot: TreeSnapshot, history: TreeHistory) => {
			cancelParse();
			pendingOffset = null;
			const parsed = parseQueryText(snapshot.text, get().query);
			set({
				...parsed,
				text: snapshot.text,
				parsedText: snapshot.text,
				selectedPath: snapshot.selectedPath,
				selectionOrigin: "tree",
				collapsed: snapshot.collapsed,
				history,
			});
		};
		const travel = (next: string): boolean => {
			const { text: current, history } = get();
			const undone = history.undo.at(-1);
			if (undone && undone.after.text === current && undone.before.text === next) {
				restore(undone.before, { undo: history.undo.slice(0, -1), redo: [...history.redo, undone] });
				return true;
			}
			const redone = history.redo.at(-1);
			if (redone && redone.before.text === current && redone.after.text === next) {
				restore(redone.after, { undo: [...history.undo, redone], redo: history.redo.slice(0, -1) });
				return true;
			}
			return false;
		};
		return {
			connection,
			text,
			parsedText: text,
			...parseQueryText(text, null),
			selectedPath: null,
			selectionOrigin: "tree",
			collapsed: NO_KEYS,
			namesLead: "logical",
			history: EMPTY_HISTORY,
			run: idleRun(0),
			layout: DEFAULT_LAYOUT,
			setText: (next) => {
				if (next === get().text || travel(next)) {
					return;
				}
				set({ text: next });
				cancelParse();
				timer = setTimeout(applyParse, PARSE_DELAY_MS);
			},
			parseNow: applyParse,
			setConnection: (next) => set((state) => ({ connection: next, run: idleRun(state.run.id + 1) })),
			select: (path, origin = "tree") => {
				const state = get();
				if (samePath(state.selectedPath, path) && state.selectionOrigin === origin) {
					return;
				}
				set({ selectedPath: path, selectionOrigin: origin, collapsed: withoutAncestors(state.collapsed, path) });
			},
			selectAtOffset: (offset) => {
				const state = get();
				if (state.parsedText === state.text && state.query && state.errors.length === 0) {
					pendingOffset = null;
					selectFromEditor(selectionAt(state.query, offset));
					return;
				}
				pendingOffset = offset;
			},
			setExpanded: (path, open) => {
				const { collapsed } = get();
				const key = pathKey(path);
				if (collapsed.has(key) !== open) {
					return;
				}
				const next = new Set(collapsed);
				if (open) {
					next.delete(key);
				} else {
					next.add(key);
				}
				set({ collapsed: next });
			},
			setNamesLead: (lead) => set({ namesLead: lead }),
			edit: (build) => {
				const { query, errors } = applyParse();
				if (!query || errors.length > 0) {
					return { ok: false, reason: "The Fetch XML does not parse" };
				}
				const result = build(query);
				if (result.ok) {
					get().applyChange(result.change);
				}
				return result;
			},
			applyChange: (change) => {
				const state = get();
				const nextText = serializeFetchXml(change.document);
				if (nextText === state.text) {
					if (change.select !== null) {
						get().select(change.select);
					}
					return;
				}
				const selectedPath = change.select ?? (state.selectedPath === null ? null : remapPath(state.selectedPath, change.shift));
				const after: TreeSnapshot = {
					text: nextText,
					selectedPath,
					collapsed: withoutAncestors(remapKeys(state.collapsed, change.shift), selectedPath),
				};
				const entry: HistoryEntry = { before: snapshotOf(state), after };
				restore(after, { undo: [...state.history.undo, entry].slice(-HISTORY_LIMIT), redo: [] });
			},
			undo: () => {
				if (editor?.undo()) {
					return;
				}
				const { history, text: current } = get();
				const entry = history.undo.at(-1);
				if (entry && entry.after.text === current) {
					travel(entry.before.text);
				}
			},
			redo: () => {
				if (editor?.redo()) {
					return;
				}
				const { history, text: current } = get();
				const entry = history.redo.at(-1);
				if (entry && entry.before.text === current) {
					travel(entry.after.text);
				}
			},
			attachEditor: (next) => {
				editor = next;
				return () => {
					if (editor === next) {
						editor = null;
					}
				};
			},
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
			resizePane: (pane, size) =>
				set((state) => ({
					layout: {
						...state.layout,
						...(pane === "tree" ? { treeWidth: size } : pane === "details" ? { detailsWidth: size } : { resultsHeight: size }),
					},
				})),
			togglePane: (pane) =>
				set((state) => {
					const collapsed = !state.layout.collapsed[pane];
					return {
						layout: {
							...state.layout,
							collapsed: { ...state.layout.collapsed, [pane]: collapsed },
							detailsForced: pane === "details" ? false : state.layout.detailsForced,
						},
					};
				}),
			showDetails: (force) =>
				set((state) =>
					!state.layout.collapsed.details && state.layout.detailsForced === force
						? state
						: { layout: { ...state.layout, collapsed: { ...state.layout.collapsed, details: false }, detailsForced: force } }
				),
			releaseDetails: () => set((state) => (state.layout.detailsForced ? { layout: { ...state.layout, detailsForced: false } } : state)),
			setDetailsGroupOpen: (group, open) =>
				set((state) =>
					state.layout.detailsGroups[group] === open
						? state
						: { layout: { ...state.layout, detailsGroups: { ...state.layout.detailsGroups, [group]: open } } }
				),
			registerDraft: (commit) => {
				draft = commit;
				return () => {
					if (draft === commit) {
						draft = null;
					}
				};
			},
			flushDraft: () => draft?.(),
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
