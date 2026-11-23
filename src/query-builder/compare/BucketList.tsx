import { makeStyles, Text, tokens } from "@fluentui/react-components";

import { type CompareCellContext, type CompareGridColumn, type CompareGridRow } from "../lib";
import { CompareTable } from "./CompareTable";
import { PairDetails } from "./PairDetails";

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

export interface PairExpansion {
	firstName: string;
	secondName: string;
	openRows: ReadonlySet<string>;
	onToggleRow: (id: string) => void;
}

export interface ColumnFiltering {
	column: string | null;
	arrow: string;
	onToggle: (column: string) => void;
}

interface BucketListProps {
	label: string;
	columns: readonly CompareGridColumn[];
	rows: readonly CompareGridRow[];
	empty: string;
	context: CompareCellContext;
	note?: string | null;
	warning?: string | null;
	expansion?: PairExpansion;
	filtering?: ColumnFiltering;
}

export const BucketList = ({ label, columns, rows, empty, context, note = null, warning = null, expansion, filtering }: BucketListProps) => {
	const styles = useStyles();
	const renderDetail = expansion
		? (row: CompareGridRow) =>
				row.differences ? (
					<PairDetails differences={[...row.differences.values()]} firstName={expansion.firstName} secondName={expansion.secondName} />
				) : null
		: undefined;
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
					{empty}
				</Text>
			) : (
				<CompareTable
					label={label}
					columns={columns}
					rows={rows}
					context={context}
					openRows={expansion?.openRows}
					onToggleRow={expansion?.onToggleRow}
					renderDetail={renderDetail}
					filterColumn={filtering?.column ?? null}
					filterHint={filtering?.arrow}
					onFilterColumn={filtering?.onToggle}
				/>
			)}
		</div>
	);
};
