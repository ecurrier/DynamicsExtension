import { makeStyles, Text } from "@fluentui/react-components";
import { useMemo } from "react";

import { DataTable, type DataTableColumn, useAppToast } from "@/shared/components";
import { type WorkspaceTarget } from "@/shared/types";
import { useWorkspaceLauncher, WorkspaceLaunchButton } from "@/workspaces";

import { buildResultsShare, cellText, columnsFromRows, type ResultRow } from "../../lib";

const useStyles = makeStyles({
	footer: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: "8px",
	},
});

interface ResultsPreviewProps {
	entityName: string;
	rows: ResultRow[];
}

export const ResultsPreview = ({ entityName, rows }: ResultsPreviewProps) => {
	const styles = useStyles();
	const toast = useAppToast();
	const workspaces = useWorkspaceLauncher();
	const columns = useMemo(() => columnsFromRows(rows), [rows]);
	const tableColumns = useMemo<DataTableColumn<ResultRow>[]>(
		() =>
			columns.map((column) => ({
				id: column,
				label: column,
				render: (row) => cellText(row[column]),
				sortValue: (row) => cellText(row[column]),
			})),
		[columns]
	);

	const openViewer = async (target: WorkspaceTarget) => {
		try {
			const share = buildResultsShare(entityName, rows);
			await workspaces.open({ id: "results-viewer", share }, target);
			if (share.truncated) {
				toast.info("Results truncated", `The viewer shows the first ${share.rows.length} records.`);
			}
		} catch (error) {
			toast.error("Could not open the results viewer", error);
		}
	};

	return (
		<>
			<DataTable items={rows} columns={tableColumns} pageSize={50} fill />
			<div className={styles.footer}>
				<Text size={200}>
					{rows.length} record{rows.length === 1 ? "" : "s"} retrieved
				</Text>
				<WorkspaceLaunchButton
					label="Open in viewer"
					size="small"
					canOpenInWindow={workspaces.canOpenInWindow}
					disabled={rows.length === 0}
					onOpen={(target) => void openViewer(target)}
				/>
			</div>
		</>
	);
};
