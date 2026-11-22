import { makeStyles, mergeClasses, Spinner, tokens } from "@fluentui/react-components";
import { PanelLeftExpand20Regular, PanelRightExpand20Regular } from "@fluentui/react-icons";
import { type KeyboardEvent, useEffect, useState } from "react";

import { useConnectableEnvironments } from "@/modules/settings";
import { EmptyState, FailureBanner } from "@/shared/components";
import { type ConnectionTarget, requestEnvironmentAccess } from "@/shared/connections";
import { useAsyncAction } from "@/shared/hooks";
import { type QueryBuilderLaunch } from "@/shared/types";

import { useQueryGateway } from "./hooks";
import { connectionLabel } from "./lib";
import { CollapsedPane } from "./PaneChrome";
import { QueryBuilderHeader } from "./QueryBuilderHeader";
import { ResultsPane } from "./ResultsPane";
import { Splitter, SPLITTER_THICKNESS } from "./Splitter";
import { createQueryBuilderStore, QueryBuilderStoreContext, useQueryBuilder } from "./store";
import { TreePlaceholder } from "./TreePlaceholder";
import { connectionFor, type QueryBuilderBootstrapStatus } from "./useQueryBuilderBootstrap";
import { useQueryRun } from "./useQueryRun";
import { XmlPane } from "./XmlPane";

export const TREE_MIN_WIDTH = 180;
export const XML_MIN_WIDTH = 280;
export const RESULTS_MIN_HEIGHT = 120;
export const EDITORS_MIN_HEIGHT = 160;

const TREE_PANE_ID = "query-builder-tree";
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
	editors: {
		display: "flex",
		justifyContent: "space-between",
		flexGrow: 1,
		flexBasis: 0,
		minHeight: `${EDITORS_MIN_HEIGHT}px`,
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
	tree: {
		flexGrow: 0,
		flexShrink: 0,
		minWidth: `${TREE_MIN_WIDTH}px`,
		maxWidth: `calc(100% - ${XML_MIN_WIDTH + SPLITTER_THICKNESS}px)`,
	},
	treeAlone: {
		flexGrow: 1,
		flexBasis: 0,
		maxWidth: "none",
	},
	xml: {
		flexGrow: 1,
		flexBasis: 0,
		minWidth: `${XML_MIN_WIDTH}px`,
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
});

interface QueryBuilderWorkspaceProps {
	hosted: boolean;
}

const QueryBuilderWorkspace = ({ hosted }: QueryBuilderWorkspaceProps) => {
	const styles = useStyles();
	const { environments, byId } = useConnectableEnvironments();
	const connection = useQueryBuilder((state) => state.connection);
	const setConnection = useQueryBuilder((state) => state.setConnection);
	const text = useQueryBuilder((state) => state.text);
	const errors = useQueryBuilder((state) => state.errors);
	const run = useQueryBuilder((state) => state.run);
	const layout = useQueryBuilder((state) => state.layout);
	const resizePane = useQueryBuilder((state) => state.resizePane);
	const togglePane = useQueryBuilder((state) => state.togglePane);
	const gateway = useQueryGateway(connection);
	const connectionName = connectionLabel(connection, byId);
	const { run: runQuery } = useQueryRun(gateway, connectionName);
	const connect = useAsyncAction("Could not switch connection");
	const running = run.status === "running";
	const canRun = gateway.ready && text.trim() !== "" && errors.length === 0 && !running;
	const { collapsed } = layout;

	const onConnectionChange = (target: ConnectionTarget) =>
		void connect.run(async () => {
			if (target.kind === "environment") {
				const environment = byId[target.environmentId];
				if (!environment) {
					throw new Error("The selected environment no longer exists");
				}
				if (!(await requestEnvironmentAccess(environment))) {
					throw new Error("Power Tools needs permission to contact the environment and the Microsoft login service");
				}
			}
			setConnection(target);
		});

	const onKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey)) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		if (canRun) {
			void runQuery();
		}
	};

	return (
		<div className={styles.root} onKeyDownCapture={onKeyDownCapture}>
			<QueryBuilderHeader
				hosted={hosted}
				connection={connection}
				environments={environments}
				connecting={connect.running}
				canRun={canRun}
				running={running}
				onConnectionChange={onConnectionChange}
				onRun={() => void runQuery()}
			/>
			<FailureBanner />
			<div className={styles.body}>
				<div className={styles.editors}>
					{collapsed.tree ? (
						<CollapsedPane title="Tree" icon={PanelLeftExpand20Regular} label="Restore the tree" onRestore={() => togglePane("tree")} />
					) : (
						<section
							id={TREE_PANE_ID}
							aria-label="Tree"
							className={mergeClasses(styles.pane, styles.tree, collapsed.xml && styles.treeAlone)}
							style={collapsed.xml ? undefined : { width: `${layout.treeWidth}px` }}>
							<TreePlaceholder onCollapse={() => togglePane("tree")} />
						</section>
					)}
					{collapsed.tree || collapsed.xml ? null : (
						<Splitter
							orientation="vertical"
							size={layout.treeWidth}
							min={TREE_MIN_WIDTH}
							otherMin={XML_MIN_WIDTH}
							label="Resize the tree and the Fetch XML"
							controls={TREE_PANE_ID}
							onResize={(size) => resizePane("tree", size)}
							onToggle={() => togglePane("tree")}
						/>
					)}
					{collapsed.xml ? (
						<CollapsedPane title="Fetch XML" icon={PanelRightExpand20Regular} label="Restore the Fetch XML" onRestore={() => togglePane("xml")} />
					) : (
						<section aria-label="Fetch XML" className={mergeClasses(styles.pane, styles.xml)}>
							<XmlPane onCollapse={() => togglePane("xml")} />
						</section>
					)}
				</div>
				{collapsed.results ? null : (
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
					className={mergeClasses(styles.pane, styles.results, collapsed.results && styles.resultsCollapsed)}
					style={collapsed.results ? undefined : { height: `${layout.resultsHeight}px` }}>
					<ResultsPane
						collapsed={collapsed.results}
						ready={gateway.ready}
						connectionName={connectionName}
						runConnectionName={run.connection ? connectionLabel(run.connection, byId) : connectionName}
						onToggle={() => togglePane("results")}
					/>
				</section>
			</div>
		</div>
	);
};

interface QueryBuilderProps {
	launch: QueryBuilderLaunch;
	hosted?: boolean;
}

export const QueryBuilder = ({ launch, hosted = false }: QueryBuilderProps) => {
	const [store] = useState(() => createQueryBuilderStore({ connection: connectionFor(launch), fetchXml: launch.fetchXml }));
	useEffect(() => () => store.getState().dispose(), [store]);
	return (
		<QueryBuilderStoreContext.Provider value={store}>
			<QueryBuilderWorkspace hosted={hosted} />
		</QueryBuilderStoreContext.Provider>
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
