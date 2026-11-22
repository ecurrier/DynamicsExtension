import {
	Button,
	makeStyles,
	MessageBar,
	MessageBarActions,
	MessageBarBody,
	MessageBarTitle,
	Spinner,
	Switch,
	Tab,
	TabList,
	Text,
	tokens,
} from "@fluentui/react-components";
import { ArrowMaximize20Regular, ArrowMinimize20Regular, PanelBottomContract20Regular, PanelBottomExpand20Regular, Stop20Regular } from "@fluentui/react-icons";
import { useMemo, useState } from "react";

import { type ConnectionTarget } from "@/shared/connections";
import { useSessionStore } from "@/shared/stores";

import { useQueryGateway, useQueryTables } from "./hooks";
import {
	connectionRecordAppUrl,
	deriveResultColumns,
	displayPageOf,
	displayWindow,
	LOAD_ALL_CONFIRM_AT,
	queryTableNames,
	recordCount,
	resultsStatus,
	type ValueMode,
} from "./lib";
import { PaneButton, PaneHeader } from "./PaneChrome";
import { ResultsGrid } from "./ResultsGrid";
import { ResultsJson } from "./ResultsJson";
import { type QueryRunState } from "./store";

const useStyles = makeStyles({
	status: {
		minWidth: 0,
		overflow: "hidden",
		whiteSpace: "nowrap",
		textOverflow: "ellipsis",
		color: tokens.colorNeutralForeground3,
	},
	body: {
		display: "flex",
		flexDirection: "column",
		flexGrow: 1,
		minHeight: 0,
		rowGap: tokens.spacingVerticalS,
		padding: tokens.spacingHorizontalS,
		overflow: "hidden",
	},
	toolbar: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		flexShrink: 0,
		columnGap: tokens.spacingHorizontalM,
		rowGap: tokens.spacingVerticalXS,
	},
	paging: {
		display: "flex",
		alignItems: "center",
		columnGap: tokens.spacingHorizontalS,
		marginLeft: "auto",
	},
	hint: {
		color: tokens.colorNeutralForeground3,
	},
	banner: {
		flexShrink: 0,
		overflowY: "auto",
		maxHeight: "40%",
	},
	failure: {
		flexShrink: 0,
		overflowY: "auto",
		maxHeight: "100%",
	},
	message: {
		whiteSpace: "pre-wrap",
		wordBreak: "break-word",
	},
});

type ResultsView = "records" | "json";

interface DisplayState {
	runId: number;
	page: number;
	jumpTo: number | null;
}

const nextDisplay = (display: DisplayState, run: QueryRunState): DisplayState => {
	if (display.runId !== run.id) {
		return { runId: run.id, page: 0, jumpTo: null };
	}
	if (display.jumpTo === null) {
		return display;
	}
	if (run.rows.length > display.jumpTo) {
		return { ...display, page: displayPageOf(display.jumpTo), jumpTo: null };
	}
	return run.paging === "idle" ? { ...display, jumpTo: null } : display;
};

export interface ResultsPaneProps {
	run: QueryRunState;
	connection: ConnectionTarget;
	connectionName: string;
	ready: boolean;
	collapsed: boolean;
	maximised: boolean;
	onToggle: () => void;
	onMaximisedChange: (maximised: boolean) => void;
	onNextPage: () => void;
	onLoadAll: () => void;
	onKeepLoading: () => void;
	onStop: () => void;
}

export const ResultsPane = ({
	run,
	connection,
	connectionName,
	ready,
	collapsed,
	maximised,
	onToggle,
	onMaximisedChange,
	onNextPage,
	onLoadAll,
	onKeepLoading,
	onStop,
}: ResultsPaneProps) => {
	const styles = useStyles();
	const gateway = useQueryGateway(connection);
	const tabUrl = useSessionStore((state) => state.tabUrl);
	const [view, setView] = useState<ResultsView>("records");
	const [mode, setMode] = useState<ValueMode>("friendly");
	const [display, setDisplay] = useState<DisplayState>({ runId: run.id, page: 0, jumpTo: null });
	const current = nextDisplay(display, run);
	if (current !== display) {
		setDisplay(current);
	}

	const query = run.source?.query ?? null;
	const tableNames = useMemo(() => queryTableNames(query), [query]);
	const { tables } = useQueryTables(gateway, tableNames);
	const columns = useMemo(() => deriveResultColumns(query, run.rows, tables), [query, run.rows, tables]);
	const appUrl = connectionRecordAppUrl(connection, { environmentUrl: gateway.environment?.modelDrivenAppUrl ?? null, tabUrl });
	const visible = displayWindow(run.rows.length, current.page);
	const pageable = run.source?.pageable ?? false;
	const status = resultsStatus({
		status: run.status,
		loaded: run.rows.length,
		moreRecords: run.moreRecords,
		pageable,
		paging: run.paging,
		elapsedMs: run.elapsedMs,
		connectionName,
	});
	const busy = run.status === "running" || run.paging !== "idle";
	const showBody = !collapsed || maximised;

	const onNext = () => {
		setDisplay({ ...current, jumpTo: run.rows.length });
		onNextPage();
	};

	return (
		<>
			<PaneHeader
				title="Results"
				toggleIcon={collapsed ? PanelBottomExpand20Regular : PanelBottomContract20Regular}
				toggleLabel={collapsed ? "Restore the results" : "Collapse the results"}
				onToggle={maximised ? undefined : onToggle}
				actions={
					<PaneButton
						icon={maximised ? ArrowMinimize20Regular : ArrowMaximize20Regular}
						label={maximised ? "Restore the tree and the Fetch XML (Escape)" : "Maximise the results"}
						onClick={() => onMaximisedChange(!maximised)}
					/>
				}>
				{busy ? <Spinner size="extra-tiny" /> : null}
				<Text size={200} className={styles.status} title={status}>
					{status}
				</Text>
			</PaneHeader>
			{showBody ? (
				<div className={styles.body}>
					{run.status === "idle" ? (
						<Text size={200} className={styles.hint}>
							{ready
								? "Run the Query with the Run button or Ctrl+Enter to see the first page of Records."
								: "This Connection is not available. Open a model-driven app in the tab Power Tools is reading, or choose a saved environment."}
						</Text>
					) : null}
					{run.status === "running" ? <Spinner size="small" label="Running the Query" /> : null}
					{run.status === "failed" ? (
						<MessageBar intent="error" layout="multiline" className={styles.failure}>
							<MessageBarBody>
								<MessageBarTitle>The Query Run failed</MessageBarTitle>
								<span className={styles.message}>{run.error}</span>
							</MessageBarBody>
						</MessageBar>
					) : null}
					{run.status === "done" ? (
						<>
							<div className={styles.toolbar}>
								<TabList size="small" selectedValue={view} onTabSelect={(_, data) => setView(data.value as ResultsView)}>
									<Tab value="records">Records</Tab>
									<Tab value="json">JSON</Tab>
								</TabList>
								<Switch
									label="Friendly values"
									checked={mode === "friendly"}
									disabled={view === "json"}
									onChange={(_, data) => setMode(data.checked ? "friendly" : "raw")}
								/>
								{pageable ? (
									<div className={styles.paging}>
										{run.paging === "all" ? (
											<>
												<Spinner size="extra-tiny" label={recordCount(run.rows.length, "loaded")} />
												<Button size="small" icon={<Stop20Regular />} disabled={run.stopRequested} onClick={onStop}>
													{run.stopRequested ? "Stopping" : "Stop"}
												</Button>
											</>
										) : (
											<>
												<Button size="small" disabled={!run.moreRecords || busy || !ready} onClick={onNext}>
													Next page
												</Button>
												<Button size="small" disabled={!run.moreRecords || busy || !ready} onClick={onLoadAll}>
													Load all
												</Button>
											</>
										)}
									</div>
								) : null}
							</div>
							{run.awaitingLimitConfirmation ? (
								<MessageBar intent="warning" layout="multiline" className={styles.banner}>
									<MessageBarBody>
										<MessageBarTitle>{`${recordCount(run.rows.length, "loaded")}, and more exist`}</MessageBarTitle>
										{`Loading past ${LOAD_ALL_CONFIRM_AT.toLocaleString()} Records can make this tab slow.`}
									</MessageBarBody>
									<MessageBarActions>
										<Button size="small" onClick={onKeepLoading}>
											Keep loading
										</Button>
										<Button size="small" onClick={onStop}>
											Stop here
										</Button>
									</MessageBarActions>
								</MessageBar>
							) : null}
							{run.pageError ? (
								<MessageBar intent="error" layout="multiline" className={styles.banner}>
									<MessageBarBody>
										<MessageBarTitle>The next page could not be loaded</MessageBarTitle>
										<span className={styles.message}>{run.pageError}</span>
									</MessageBarBody>
								</MessageBar>
							) : null}
							{view === "records" ? (
								<ResultsGrid
									rows={run.rows}
									columns={columns}
									mode={mode}
									appUrl={appUrl}
									visible={visible}
									maximised={maximised}
									onPageChange={(page) => setDisplay({ ...current, page })}
								/>
							) : (
								<ResultsJson pages={run.pages} />
							)}
						</>
					) : null}
				</div>
			) : null}
		</>
	);
};
