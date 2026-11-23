import { makeStyles, mergeClasses, Spinner, tokens } from "@fluentui/react-components";
import { type KeyboardEvent, useCallback, useEffect, useState } from "react";

import { useConnectableEnvironments } from "@/modules/settings";
import { EmptyState, FailureBanner } from "@/shared/components";
import { type ConnectionTarget, requestEnvironmentAccess } from "@/shared/connections";
import { useAsyncAction } from "@/shared/hooks";
import { useSessionStore } from "@/shared/stores";
import { type QueryBuilderLaunch } from "@/shared/types";

import { EDITORS_MIN_HEIGHT, EditorPanes } from "./EditorPanes";
import { useQueryGateway } from "./hooks";
import { connectionLabel, historyConnection, historyConnectionLabel, NO_ORIGIN } from "./lib";
import { QueryLibraryDrawer } from "./library";
import { QueryBuilderHeader } from "./QueryBuilderHeader";
import { QueryDiagnosticsProvider } from "./QueryDiagnostics";
import { useQueryHistory, useWorkingQuery } from "./remembered";
import { ResultsPane } from "./ResultsPane";
import { Splitter, SPLITTER_THICKNESS } from "./Splitter";
import { StartProvider } from "./start";
import { createQueryBuilderStore, QueryBuilderStoreContext, useQueryBuilder, useQueryBuilderStoreApi } from "./store";
import { connectionFor, type QueryBuilderBootstrapStatus } from "./useQueryBuilderBootstrap";
import { type QueryRunRecord, useQueryRun } from "./useQueryRun";

export const RESULTS_MIN_HEIGHT = 120;

const RESULTS_PANE_ID = "query-builder-results";

const useStyles = makeStyles({
	root: {
		containerType: "inline-size",
		display: "flex",
		flexDirection: "column",
		height: "100%",
		minHeight: 0,
		backgroundColor: tokens.colorNeutralBackground2,
	},
	body: {
		display: "flex",
		flexDirection: "column",
		flexGrow: 1,
		flexBasis: 0,
		minHeight: 0,
		minWidth: 0,
	},
	pane: {
		display: "flex",
		flexDirection: "column",
		minWidth: 0,
		minHeight: 0,
		overflow: "hidden",
		backgroundColor: tokens.colorNeutralBackground1,
	},
	results: {
		flexGrow: 0,
		flexShrink: 0,
		minHeight: `${RESULTS_MIN_HEIGHT}px`,
		maxHeight: `calc(100% - ${EDITORS_MIN_HEIGHT + SPLITTER_THICKNESS}px)`,
		borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
	},
	resultsCollapsed: {
		minHeight: 0,
	},
	resultsMaximised: {
		flexGrow: 1,
		flexShrink: 1,
		flexBasis: 0,
		minHeight: 0,
		maxHeight: "none",
		borderTopStyle: "none",
	},
	hidden: {
		display: "none",
	},
});

interface QueryBuilderWorkspaceProps {
	hosted: boolean;
}

const QueryBuilderWorkspace = ({ hosted }: QueryBuilderWorkspaceProps) => {
	const styles = useStyles();
	const store = useQueryBuilderStoreApi();
	const { environments, byId } = useConnectableEnvironments();
	const connection = useQueryBuilder((state) => state.connection);
	const setConnection = useQueryBuilder((state) => state.setConnection);
	const text = useQueryBuilder((state) => state.text);
	const errors = useQueryBuilder((state) => state.errors);
	const run = useQueryBuilder((state) => state.run);
	const layout = useQueryBuilder((state) => state.layout);
	const resizePane = useQueryBuilder((state) => state.resizePane);
	const togglePane = useQueryBuilder((state) => state.togglePane);
	const setResultsMaximised = useQueryBuilder((state) => state.setResultsMaximised);
	const namesLead = useQueryBuilder((state) => state.namesLead);
	const setNamesLead = useQueryBuilder((state) => state.setNamesLead);
	const empty = useQueryBuilder((state) => state.text.trim() === "");
	const tabUrl = useSessionStore((state) => state.tabUrl);
	const { record } = useQueryHistory();
	const [libraryOpen, setLibraryOpen] = useState(false);
	const gateway = useQueryGateway(connection);
	const connectionName = connectionLabel(connection, byId);
	const onQueryRun = useCallback(
		(queryRun: QueryRunRecord) => {
			const target = historyConnection(queryRun.connection, tabUrl);
			void record({
				fetchXml: queryRun.fetchXml,
				connection: target,
				connectionLabel: historyConnectionLabel(target, connectionLabel(queryRun.connection, byId)),
				ranAt: queryRun.ranAt,
				outcome: queryRun.outcome,
				elapsedMs: queryRun.elapsedMs,
			}).catch(() => undefined);
		},
		[byId, record, tabUrl]
	);
	const { run: runQuery, nextPage, loadAll, keepLoading, stop } = useQueryRun(gateway, connectionName, onQueryRun);
	const connect = useAsyncAction("Cannot change the Connection");
	const running = run.status === "running" || run.paging !== "idle";
	const canRun = gateway.ready && text.trim() !== "" && errors.length === 0 && !running;
	const { collapsed, resultsMaximised: maximised } = layout;
	const resultsCollapsed = collapsed.results && !maximised;
	const showResults = !empty || run.status !== "idle";

	const onConnectionChange = (target: ConnectionTarget) =>
		void connect.run(async () => {
			if (target.kind === "environment") {
				const environment = byId[target.environmentId];
				if (!environment) {
					throw new Error("The selected Environment does not exist");
				}
				if (!(await requestEnvironmentAccess(environment))) {
					throw new Error("Power Tools does not have permission to connect to the Environment and the Microsoft sign-in service");
				}
			}
			setConnection(target);
		});

	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === "Escape" && maximised && !event.defaultPrevented) {
			event.preventDefault();
			setResultsMaximised(false);
		}
	};

	const onKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey)) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		store.getState().flushDraft();
		if (canRun) {
			void runQuery();
		}
	};

	return (
		<QueryDiagnosticsProvider gateway={gateway}>
			<StartProvider gateway={gateway}>
				<div className={styles.root} onKeyDownCapture={onKeyDownCapture} onKeyDown={onKeyDown}>
					<QueryBuilderHeader
						hosted={hosted}
						connection={connection}
						environments={environments}
						connecting={connect.running}
						canRun={canRun}
						running={running}
						namesLead={namesLead}
						onConnectionChange={onConnectionChange}
						onNamesLeadChange={setNamesLead}
						onRun={() => void runQuery()}
						onOpenLibrary={() => setLibraryOpen(true)}
					/>
					<FailureBanner />
					<div className={styles.body}>
						<EditorPanes gateway={gateway} hidden={maximised} />
						{resultsCollapsed || maximised || !showResults ? null : (
							<Splitter
								orientation="horizontal"
								reverse
								size={layout.resultsHeight}
								min={RESULTS_MIN_HEIGHT}
								otherMin={EDITORS_MIN_HEIGHT}
								label="Resize the results"
								controls={RESULTS_PANE_ID}
								onResize={(size) => resizePane("results", size)}
								onToggle={() => togglePane("results")}
							/>
						)}
						<section
							id={RESULTS_PANE_ID}
							aria-label="Results"
							className={mergeClasses(
								styles.pane,
								styles.results,
								resultsCollapsed && styles.resultsCollapsed,
								maximised && styles.resultsMaximised,
								!showResults && styles.hidden
							)}
							style={resultsCollapsed || maximised ? undefined : { height: `${layout.resultsHeight}px` }}>
							<ResultsPane
								run={run}
								connection={run.connection ?? connection}
								connectionName={run.connection ? connectionLabel(run.connection, byId) : connectionName}
								ready={gateway.ready}
								collapsed={collapsed.results}
								maximised={maximised}
								onToggle={() => togglePane("results")}
								onMaximisedChange={setResultsMaximised}
								onNextPage={nextPage}
								onLoadAll={loadAll}
								onKeepLoading={keepLoading}
								onStop={stop}
							/>
						</section>
					</div>
				</div>
				<QueryLibraryDrawer open={libraryOpen} onClose={() => setLibraryOpen(false)} />
			</StartProvider>
		</QueryDiagnosticsProvider>
	);
};

interface QueryBuilderProps {
	launch: QueryBuilderLaunch;
	hosted?: boolean;
}

interface QueryBuilderSessionProps extends QueryBuilderProps {
	restored: string | null;
	write: (fetchXml: string) => void;
	flush: () => Promise<void>;
}

const QueryBuilderSession = ({ launch, hosted = false, restored, write, flush }: QueryBuilderSessionProps) => {
	const [store] = useState(() =>
		createQueryBuilderStore({
			connection: connectionFor(launch),
			fetchXml: launch.fetchXml ?? restored,
			origin: launch.fetchXml === null ? NO_ORIGIN : { storedQueryId: null, loadedText: launch.fetchXml },
		})
	);
	useEffect(() => () => store.getState().dispose(), [store]);
	useEffect(
		() =>
			store.subscribe((state, previous) => {
				if (state.text !== previous.text) {
					write(state.text);
				}
			}),
		[store, write]
	);
	useEffect(() => {
		const onVisibility = () => {
			if (globalThis.document.visibilityState === "hidden") {
				void flush();
			}
		};
		const onPageHide = () => void flush();
		globalThis.document.addEventListener("visibilitychange", onVisibility);
		globalThis.addEventListener("pagehide", onPageHide);
		return () => {
			globalThis.document.removeEventListener("visibilitychange", onVisibility);
			globalThis.removeEventListener("pagehide", onPageHide);
		};
	}, [flush]);
	return (
		<QueryBuilderStoreContext.Provider value={store}>
			<QueryBuilderWorkspace hosted={hosted} />
		</QueryBuilderStoreContext.Provider>
	);
};

export const QueryBuilder = ({ launch, hosted = false }: QueryBuilderProps) => {
	const working = useWorkingQuery();
	if (launch.fetchXml === null && working.isLoading) {
		return <Spinner style={{ padding: "24px" }} />;
	}
	return (
		<QueryBuilderSession
			launch={launch}
			hosted={hosted}
			restored={launch.fetchXml === null ? (working.opened?.fetchXml ?? null) : null}
			write={working.write}
			flush={working.flush}
		/>
	);
};

export const QueryBuilderApp = ({ status }: { status: QueryBuilderBootstrapStatus }) => {
	if (status.kind === "loading") {
		return <Spinner style={{ padding: "24px" }} />;
	}
	if (status.kind === "missing") {
		return (
			<EmptyState title="No Query Builder session" intent="warning">
				{status.reason}
			</EmptyState>
		);
	}
	return <QueryBuilder launch={status.launch} />;
};
