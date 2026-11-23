import { makeStyles, Text, tokens } from "@fluentui/react-components";
import { useState } from "react";

import { displayWindow, type QueryRunRecord, type ResultGridColumn } from "../lib";
import { ResultsGrid } from "../ResultsGrid";

const useStyles = makeStyles({
	root: {
		display: "flex",
		flexDirection: "column",
		flexGrow: 1,
		minHeight: 0,
		rowGap: tokens.spacingVerticalXS,
	},
	note: {
		flexShrink: 0,
		color: tokens.colorNeutralForeground3,
	},
	warning: {
		flexShrink: 0,
		color: tokens.colorPaletteMarigoldForeground1,
	},
});

interface RecordsBucketProps {
	rows: readonly QueryRunRecord[];
	columns: readonly ResultGridColumn[];
	appUrl: string | null;
	maximised: boolean;
	note?: string | null;
	warning?: string | null;
}

export const RecordsBucket = ({ rows, columns, appUrl, maximised, note = null, warning = null }: RecordsBucketProps) => {
	const styles = useStyles();
	const [page, setPage] = useState(0);
	const visible = displayWindow(rows.length, page);
	return (
		<div className={styles.root}>
			{warning ? (
				<Text size={200} className={styles.warning}>
					{warning}
				</Text>
			) : null}
			{note ? (
				<Text size={200} className={styles.note}>
					{note}
				</Text>
			) : null}
			{rows.length === 0 ? (
				<Text size={200} className={styles.note}>
					No Records.
				</Text>
			) : (
				<ResultsGrid rows={rows} columns={columns} mode="friendly" appUrl={appUrl} visible={visible} maximised={maximised} onPageChange={setPage} />
			)}
		</div>
	);
};
