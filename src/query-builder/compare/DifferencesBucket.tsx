import { makeStyles, Tab, TabList, Text, tokens } from "@fluentui/react-components";
import { useMemo, useState } from "react";

import {
	type DifferingPair,
	differingColumnsGrid,
	displayWindow,
	rangeCaption,
	matchKeyLabel,
	matchKeyText,
	pairLabelColumn,
	type ResultGridColumn,
	type StoredComparison,
} from "../lib";
import { ResultsGrid } from "../ResultsGrid";
import { PairList } from "./PairList";

const useStyles = makeStyles({
	root: {
		display: "flex",
		flexDirection: "column",
		flexGrow: 1,
		minHeight: 0,
		rowGap: tokens.spacingVerticalXS,
	},
	head: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		flexShrink: 0,
		columnGap: tokens.spacingHorizontalM,
	},
	note: {
		color: tokens.colorNeutralForeground3,
	},
});

type DifferencesView = "pairs" | "columns";

interface DifferencesBucketProps {
	stored: StoredComparison;
	columns: readonly ResultGridColumn[];
	appUrlOf: (key: string) => string | null;
	maximised: boolean;
}

export const DifferencesBucket = ({ stored, columns, appUrlOf, maximised }: DifferencesBucketProps) => {
	const styles = useStyles();
	const { comparison, first, second, primaryKey, matchKey } = stored;
	const [view, setView] = useState<DifferencesView>("pairs");
	const [page, setPage] = useState(0);
	const keyText = (pair: DifferingPair) => matchKeyText(pair.first, matchKey, primaryKey);
	const labelColumn = useMemo(() => pairLabelColumn(columns, matchKey, primaryKey), [columns, matchKey, primaryKey]);
	const grid = useMemo(() => (view === "columns" ? differingColumnsGrid(stored, labelColumn) : null), [view, stored, labelColumn]);

	return (
		<div className={styles.root}>
			<div className={styles.head}>
				<TabList size="small" selectedValue={view} onTabSelect={(_, data) => setView(data.value as DifferencesView)}>
					<Tab value="pairs">Pairs</Tab>
					<Tab value="columns">Differing Columns</Tab>
				</TabList>
				{view === "columns" ? (
					<Text size={200} className={styles.note}>
						{`Each cell shows ${first.name} → ${second.name}. A blank cell is the same in both.`}
					</Text>
				) : null}
			</div>
			{grid ? (
				<ResultsGrid
					rows={grid.rows}
					columns={grid.columns}
					mode="friendly"
					appUrl={null}
					visible={displayWindow(grid.rows.length, page)}
					maximised={maximised}
					onPageChange={setPage}
					caption={rangeCaption(displayWindow(grid.rows.length, page), grid.rows.length, "Pairs")}
				/>
			) : (
				<PairList
					pairs={comparison.different}
					keyLabel={matchKeyLabel(stored)}
					keyText={keyText}
					labelColumn={labelColumn}
					primaryKeyColumn={columns.find((column) => column.key === primaryKey && column.primaryKey) ?? null}
					first={{ name: first.name, appUrl: appUrlOf(first.key) }}
					second={{ name: second.name, appUrl: appUrlOf(second.key) }}
				/>
			)}
		</div>
	);
};
