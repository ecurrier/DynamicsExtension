import { makeStyles, Text, tokens } from "@fluentui/react-components";

import { findTable, newQueryChange } from "../lib";
import { useQueryBuilder } from "../store";
import { useQueryEditing } from "./EditingContext";
import { TablePicker } from "./Pickers";

const useStyles = makeStyles({
	root: {
		display: "flex",
		flexDirection: "column",
		alignItems: "flex-start",
		rowGap: tokens.spacingVerticalS,
		padding: tokens.spacingHorizontalM,
	},
	hint: {
		color: tokens.colorNeutralForeground3,
	},
});

export const BlankStart = () => {
	const styles = useStyles();
	const applyChange = useQueryBuilder((state) => state.applyChange);
	const { tables } = useQueryEditing();
	return (
		<div className={styles.root}>
			<Text size={200} className={styles.hint}>
				Start from a Table, or write or paste a Query as Fetch XML on the right.
			</Text>
			<TablePicker
				label="Table to start from"
				value={undefined}
				onChange={(logicalName) => {
					const table = logicalName === null ? null : findTable(tables ?? [], logicalName);
					if (table) {
						applyChange(newQueryChange(table));
					}
				}}
			/>
		</div>
	);
};
