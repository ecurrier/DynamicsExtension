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
import { Stop20Regular } from "@fluentui/react-icons";

import { type ConnectionTarget } from "@/shared/connections";

import { useQueryRunColumns } from "./hooks";
import {
	CONNECTION_UNAVAILABLE,
	displayWindow,
	LOAD_ALL_CONFIRM_AT,
	type QueryRunState,
	recordCount,
	type ResultsViewKind,
	type ResultsViewState,
} from "./lib";
import { ResultsGrid } from "./ResultsGrid";
import { ResultsJson } from "./ResultsJson";

const useStyles = makeStyles({
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

export interface ResultsPagingActions {
	onNextPage: () => void;
	onLoadAll: () => void;
	onKeepLoading: () => void;
	onStop: () => void;
}

interface ResultsBodyProps extends ResultsPagingActions {
	run: QueryRunState;
	connection: ConnectionTarget;
	maximised: boolean;
	viewState: ResultsViewState;
	onViewStateChange: (next: ResultsViewState) => void;
}

export const ResultsBody = ({ run, connection, maximised, viewState, onViewStateChange, onNextPage, onLoadAll, onKeepLoading, onStop }: ResultsBodyProps) => {
	const styles = useStyles();
	const { gateway, columns, appUrl } = useQueryRunColumns(connection, run);
	const { view, mode, display } = viewState;
	const ready = gateway.ready;
	const visible = displayWindow(run.rows.length, display.page);
	const pageable = run.source?.pageable ?? false;
	const busy = run.status === "running" || run.paging !== "idle";

	const onNext = () => {
		onViewStateChange({ ...viewState, display: { ...display, jumpTo: run.rows.length } });
		onNextPage();
	};

	return (
		<div className={styles.body}>
			{run.status === "idle" ? (
				<Text size={200} className={styles.hint}>
					{ready ? "Select Run or press Ctrl+Enter to see the first page of Records." : CONNECTION_UNAVAILABLE}
				</Text>
			) : null}
			{run.status === "running" ? <Spinner size="small" label="The Query is running" /> : null}
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
						<TabList
							size="small"
							selectedValue={view}
							onTabSelect={(_, data) => onViewStateChange({ ...viewState, view: data.value as ResultsViewKind })}>
							<Tab value="records">Records</Tab>
							<Tab value="json">JSON</Tab>
						</TabList>
						<Switch
							label="Friendly values"
							checked={mode === "friendly"}
							disabled={view === "json"}
							onChange={(_, data) => onViewStateChange({ ...viewState, mode: data.checked ? "friendly" : "raw" })}
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
								<MessageBarTitle>{`${recordCount(run.rows.length, "loaded")}. More Records exist.`}</MessageBarTitle>
								{`If you load more than ${LOAD_ALL_CONFIRM_AT.toLocaleString()} Records, this tab can become slow.`}
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
								<MessageBarTitle>Cannot load the next page</MessageBarTitle>
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
							onPageChange={(page) => onViewStateChange({ ...viewState, display: { ...display, page } })}
						/>
					) : (
						<ResultsJson pages={run.pages} />
					)}
				</>
			) : null}
		</div>
	);
};
