import { makeStyles, MessageBar, MessageBarBody, MessageBarTitle, Spinner, Text, tokens } from "@fluentui/react-components";
import { PanelBottomContract20Regular, PanelBottomExpand20Regular } from "@fluentui/react-icons";
import { useMemo } from "react";

import { DataTable, type DataTableColumn } from "@/shared/components";
import { type QueryRow } from "@/shared/types";

import { cellSortValue, cellText, resultColumnKeys } from "./lib";
import { PaneHeader } from "./PaneChrome";
import { type QueryRunState, useQueryBuilder } from "./store";

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
		padding: tokens.spacingHorizontalS,
		overflow: "hidden",
	},
	hint: {
		color: tokens.colorNeutralForeground3,
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

const recordCount = (count: number): string => (count === 1 ? "1 Record returned" : `${count.toLocaleString()} Records returned`);

const statusLine = (run: QueryRunState, connectionName: string): string => {
	switch (run.status) {
		case "idle":
			return connectionName;
		case "running":
			return `Running on ${connectionName}`;
		case "failed":
			return `Query Run failed on ${connectionName}`;
		case "done":
			return [recordCount(run.rows.length), run.moreRecords ? "more available" : null, `${Math.round(run.elapsedMs ?? 0)} ms`, connectionName]
				.filter((part) => part !== null)
				.join(" · ");
	}
};

interface ResultsPaneProps {
	collapsed: boolean;
	ready: boolean;
	runConnectionName: string;
	connectionName: string;
	onToggle: () => void;
}

export const ResultsPane = ({ collapsed, ready, runConnectionName, connectionName, onToggle }: ResultsPaneProps) => {
	const styles = useStyles();
	const run = useQueryBuilder((state) => state.run);
	const columns = useMemo<DataTableColumn<QueryRow>[]>(
		() =>
			resultColumnKeys(run.rows).map((key) => ({
				id: key,
				label: key,
				render: (row) => cellText(row[key]),
				sortValue: (row) => cellSortValue(row[key]),
			})),
		[run.rows]
	);
	const status = statusLine(run, run.status === "idle" ? connectionName : runConnectionName);

	return (
		<>
			<PaneHeader
				title="Results"
				toggleIcon={collapsed ? PanelBottomExpand20Regular : PanelBottomContract20Regular}
				toggleLabel={collapsed ? "Restore the results" : "Collapse the results"}
				onToggle={onToggle}>
				{run.status === "running" ? <Spinner size="extra-tiny" /> : null}
				<Text size={200} className={styles.status} title={status}>
					{status}
				</Text>
			</PaneHeader>
			{collapsed ? null : (
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
						<DataTable items={run.rows} columns={columns} fill autoFitColumns={false} emptyMessage="The Query returned no Records" />
					) : null}
				</div>
			)}
		</>
	);
};
