import { makeStyles, Tab, TabList, Text, tokens } from "@fluentui/react-components";
import { useState } from "react";

import { type CompareSide, type Comparison, type ResultGridColumn, SET_ASIDE_TEXT, type StoredComparison } from "../lib";
import { RecordsBucket } from "./RecordsBucket";

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

const recordsOf = (comparison: Comparison, kind: "ambiguous" | "noKey", side: CompareSide) =>
	kind === "ambiguous" ? comparison.ambiguous.flatMap((group) => group[side]) : comparison.noKey[side];

interface SetAsideBucketProps {
	kind: "ambiguous" | "noKey";
	stored: StoredComparison;
	columns: readonly ResultGridColumn[];
	appUrlOf: (key: string) => string | null;
	maximised: boolean;
}

export const SetAsideBucket = ({ kind, stored, columns, appUrlOf, maximised }: SetAsideBucketProps) => {
	const styles = useStyles();
	const { comparison, first, second } = stored;
	const firstRecords = recordsOf(comparison, kind, "first");
	const secondRecords = recordsOf(comparison, kind, "second");
	const [chosen, setChosen] = useState<CompareSide | null>(null);
	const side: CompareSide = chosen ?? (firstRecords.length === 0 && secondRecords.length > 0 ? "second" : "first");
	const sideInfo = side === "first" ? first : second;
	return (
		<div className={styles.root}>
			<div className={styles.head}>
				<TabList size="small" selectedValue={side} onTabSelect={(_, data) => setChosen(data.value as CompareSide)}>
					<Tab value="first">{`${first.name} (${firstRecords.length.toLocaleString()})`}</Tab>
					<Tab value="second">{`${second.name} (${secondRecords.length.toLocaleString()})`}</Tab>
				</TabList>
				<Text size={200} className={styles.note}>
					{kind === "ambiguous"
						? `${comparison.ambiguous.length === 1 ? "1 group" : `${comparison.ambiguous.length.toLocaleString()} groups`}. ${SET_ASIDE_TEXT.ambiguous}`
						: SET_ASIDE_TEXT.noKey}
				</Text>
			</div>
			<RecordsBucket
				key={side}
				rows={side === "first" ? firstRecords : secondRecords}
				columns={columns}
				appUrl={appUrlOf(sideInfo.key)}
				maximised={maximised}
			/>
		</div>
	);
};
