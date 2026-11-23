import { createContext, useContext } from "react";
import { createStore, type StoreApi, useStore } from "zustand";

import { type ConnectionTarget } from "@/shared/connections";
import { type FetchXmlDocument, type FetchXmlParseError, type NodePath, parseFetchXml, pathAtOffset, serializeFetchXml } from "@/shared/lib/fetchxml";
import { type QueryRunResult } from "@/shared/types";

import {
	addConnection,
	ancestorKeys,
	appendPage,
	type ChangeResult,
	type CollapsibleGroup,
	connectionKey,
	failRun,
	finishPaging,
	finishRun,
	idleRun,
	type NamesLead,
	NO_ORIGIN,
	type PagingOutcome,
	pathKey,
	type QueryOrigin,
	type QueryChange,
	type QueryRuns,
	type QueryRunSource,
	type QueryRunState,
	remapKeys,
	remapPath,
	removeConnection,
	requestStop,
	resetRuns,
	type ResultsPaging,
	rowPathOf,
	runsFor,
	samePath,
	setFirstConnection,
	startedRuns,
	startPaging,
} from "./lib";

export type { PagingOutcome, QueryRunPage, QueryRuns, QueryRunSource, QueryRunState, QueryRunStatus } from "./lib";

export const PARSE_DELAY_MS = 300;

export const HISTORY_LIMIT = 100;

export interface ConnectionRunRequest {
	query: FetchXmlDocument;
	fetchXml: string;
	checkLacks: boolean;
}

export type LoadPagesOutcome = "complete" | "stopped" | "confirm" | "failed" | "unavailable";

export interface QueryRunner {
	start: (id: number, request: ConnectionRunRequest) => Promise<void>;
	loadPages: (mode: Exclude<ResultsPaging, "idle">, pastLimitConfirmed: boolean) => Promise<LoadPagesOutcome>;
}

export type PaneId = "tree" | "details" | "xml" | "results";

export type ResizablePane = "tree" | "details" | "results";

export type XmlPaneTab = "fetchxml" | "webapi";

export interface PaneLayout {
	treeWidth: number | null;
	detailsWidth: number;
	resultsHeight: number;
	collapsed: Record<PaneId, boolean>;
	detailsForced: boolean;
	resultsMaximised: boolean;
	detailsGroups: Record<CollapsibleGroup, boolean>;
	xmlTab: XmlPaneTab;
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
	origin: QueryOrigin;
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
	focus?: () => void;
}

export interface QueryBuilderState extends ParsedQuery {
	connection: ConnectionTarget;
	connections: readonly ConnectionTarget[];
	text: string;
	parsedText: string;
	selectedPath: NodePath | null;
	selectionOrigin: SelectionOrigin;
	collapsed: ReadonlySet<string>;
	namesLead: NamesLead;
	history: TreeHistory;
	origin: QueryOrigin;
	lastRunText: string | null;
	runs: QueryRuns;
	layout: PaneLayout;
	setText: (text: string) => void;
	loadQuery: (text: string, origin: QueryOrigin) => void;
	setStoredQuery: (storedQueryId: string | null) => void;
	focusXml: () => void;
	parseNow: () => ParsedQuery;
	setConnection: (connection: ConnectionTarget) => void;
	addConnection: (connection: ConnectionTarget) => void;
	removeConnection: (key: string) => void;
	select: (path: NodePath | null, origin?: SelectionOrigin) => void;
	selectAtOffset: (offset: number) => void;
	setExpanded: (path: NodePath, open: boolean) => void;
	setNamesLead: (lead: NamesLead) => void;
	edit: (build: (query: FetchXmlDocument) => ChangeResult) => ChangeResult;
	applyChange: (change: QueryChange) => void;
	undo: () => void;
	redo: () => void;
	attachEditor: (editor: EditorHistory) => () => void;
	startRuns: () => Readonly<Record<string, number>>;
	finishRun: (key: string, id: number, result: QueryRunResult, source?: QueryRunSource | null) => void;
	failRun: (key: string, id: number, message: string) => void;
	startPaging: (key: string, id: number, paging: Exclude<ResultsPaging, "idle">, pastLimitConfirmed?: boolean) => boolean;
	appendPage: (key: string, id: number, result: QueryRunResult) => void;
	finishPaging: (key: string, id: number, outcome: PagingOutcome) => void;
	requestStop: (key: string, id: number) => void;
	registerRunner: (key: string, runner: QueryRunner) => () => void;
	runnerFor: (key: string) => QueryRunner | undefined;
	setResultsMaximised: (maximised: boolean) => void;
	resizePane: (pane: ResizablePane, size: number) => void;
	togglePane: (pane: PaneId) => void;
	showDetails: (force: boolean) => void;
	releaseDetails: () => void;
	setDetailsGroupOpen: (group: CollapsibleGroup, open: boolean) => void;
	setXmlTab: (tab: XmlPaneTab) => void;
	registerDraft: (commit: () => void) => () => void;
	flushDraft: () => void;
	dispose: () => void;
}

export interface QueryBuilderInit {
	connection: ConnectionTarget;
	fetchXml: string | null;
	origin?: QueryOrigin;
}

export const DEFAULT_LAYOUT: PaneLayout = {
	treeWidth: null,
	detailsWidth: 280,
	resultsHeight: 300,
	collapsed: { tree: false, details: false, xml: false, results: false },
	detailsForced: false,
	resultsMaximised: false,
	detailsGroups: { more: false, legacy: false },
	xmlTab: "fetchxml",
};

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

const snapshotOf = (state: QueryBuilderState): TreeSnapshot => ({
	text: state.text,
	selectedPath: state.selectedPath,
	collapsed: state.collapsed,
	origin: state.origin,
});

export const firstRunOf = (state: Pick<QueryBuilderState, "connection" | "runs">): QueryRunState | undefined => state.runs[connectionKey(state.connection)];

export const parseQueryText = (text: string, previous: FetchXmlDocument | null): ParsedQuery => {
	if (text.trim() === "") {
		return { query: null, errors: [] };
	}
	const result = parseFetchXml(text);
	return result.ok ? { query: result.document, errors: [] } : { query: previous, errors: result.errors };
};

export const createQueryBuilderStore = ({ connection, fetchXml, origin = NO_ORIGIN }: QueryBuilderInit): StoreApi<QueryBuilderState> => {
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
	let runId = 0;
	const nextRunId = () => ++runId;
	const runners = new Map<string, QueryRunner>();
	return createStore<QueryBuilderState>()((set, get) => {
		const withConnections = (state: QueryBuilderState, connections: readonly ConnectionTarget[]): Partial<QueryBuilderState> => {
			const first = connections[0];
			if (connections === state.connections || !first) {
				return state;
			}
			return { connection: first, connections, runs: runsFor(connections, state.runs, nextRunId) };
		};
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
				origin: snapshot.origin,
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
			connections: [connection],
			text,
			parsedText: text,
			...parseQueryText(text, null),
			selectedPath: null,
			selectionOrigin: "tree",
			collapsed: NO_KEYS,
			namesLead: "logical",
			history: EMPTY_HISTORY,
			origin,
			lastRunText: null,
			runs: { [connectionKey(connection)]: idleRun(nextRunId(), connection) },
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
			loadQuery: (next, nextOrigin) => {
				const state = get();
				if (next === state.text) {
					set({ origin: nextOrigin });
					return;
				}
				const after: TreeSnapshot = { text: next, selectedPath: null, collapsed: NO_KEYS, origin: nextOrigin };
				const entry: HistoryEntry = { before: snapshotOf(state), after };
				restore(after, { undo: [...state.history.undo, entry].slice(-HISTORY_LIMIT), redo: [] });
				set((current) => ({ runs: resetRuns(current.runs, nextRunId) }));
			},
			setStoredQuery: (storedQueryId) => set((state) => ({ origin: { ...state.origin, storedQueryId } })),
			focusXml: () => {
				set((state) =>
					state.layout.collapsed.xml || state.layout.xmlTab !== "fetchxml" || state.layout.resultsMaximised
						? {
								layout: {
									...state.layout,
									collapsed: { ...state.layout.collapsed, xml: false },
									xmlTab: "fetchxml",
									resultsMaximised: false,
									detailsForced: false,
								},
							}
						: state
				);
				setTimeout(() => editor?.focus?.(), 0);
			},
			setConnection: (next) => set((state) => withConnections(state, setFirstConnection(state.connections, next))),
			addConnection: (next) => set((state) => withConnections(state, addConnection(state.connections, next))),
			removeConnection: (key) => set((state) => withConnections(state, removeConnection(state.connections, key))),
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
					origin: state.origin,
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
			startRuns: () => {
				const { connections, text: ran } = get();
				const runs = startedRuns(connections, nextRunId);
				set({ runs, lastRunText: ran });
				return Object.fromEntries(Object.entries(runs).map(([key, run]) => [key, run.id]));
			},
			finishRun: (key, id, result, source = null) => set((state) => ({ runs: finishRun(state.runs, key, id, result, source) })),
			failRun: (key, id, message) => set((state) => ({ runs: failRun(state.runs, key, id, message) })),
			startPaging: (key, id, paging, pastLimitConfirmed = false) => {
				const runs = startPaging(get().runs, key, id, paging, pastLimitConfirmed);
				if (!runs) {
					return false;
				}
				set({ runs });
				return true;
			},
			appendPage: (key, id, result) => set((state) => ({ runs: appendPage(state.runs, key, id, result) })),
			finishPaging: (key, id, outcome) => set((state) => ({ runs: finishPaging(state.runs, key, id, outcome) })),
			requestStop: (key, id) => set((state) => ({ runs: requestStop(state.runs, key, id) })),
			registerRunner: (key, runner) => {
				runners.set(key, runner);
				return () => {
					if (runners.get(key) === runner) {
						runners.delete(key);
					}
				};
			},
			runnerFor: (key) => runners.get(key),
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
			setXmlTab: (tab) => set((state) => (state.layout.xmlTab === tab ? state : { layout: { ...state.layout, xmlTab: tab } })),
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
