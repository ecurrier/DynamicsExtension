import { Button, makeStyles, mergeClasses, MessageBar, MessageBarActions, MessageBarBody, MessageBarTitle, Text, tokens } from "@fluentui/react-components";
import { Info16Regular } from "@fluentui/react-icons";
import { useMemo } from "react";

import { InfoTip } from "@/shared/components";

import {
	arrowText,
	bucketLabel,
	bucketNoun,
	type CompareCellContext,
	type CompareGridContext,
	compareGridColumns,
	compareGridRows,
	type ComparisonBucket,
	defaultBucket,
	differenceColumnName,
	displayWindow,
	filterByDifference,
	gridCaption,
	matchingText,
	noPairsHint,
	partialText,
	type ResultGridColumn,
	SET_ASIDE_TEXT,
	type StoredComparison,
	UNRELIABLE_TEXT,
	unreliableBuckets,
} from "../lib";
import { BucketList } from "./BucketList";
import { BucketRow } from "./BucketRow";
import { ColumnFilter } from "./ColumnFilter";
import { DisplayPager } from "./DisplayPager";
import { useBucketView } from "./useBucketView";

const useStyles = makeStyles({
	root: {
		display: "flex",
		flexDirection: "column",
		flexGrow: 1,
		minHeight: 0,
		rowGap: tokens.spacingVerticalXS,
	},
	stale: {
		opacity: 0.55,
	},
	list: {
		display: "flex",
		flexDirection: "column",
		flexGrow: 1,
		flexShrink: 0,
		flexBasis: 0,
		minHeight: "120px",
	},
	banner: {
		flexShrink: 0,
	},
	hint: {
		display: "inline-flex",
		alignItems: "center",
		flexShrink: 0,
		columnGap: tokens.spacingHorizontalXXS,
		color: tokens.colorBrandForeground1,
	},
});

interface ComparisonViewProps {
	stored: StoredComparison;
	bucket: ComparisonBucket | null;
	stale: boolean;
	canCompareAgain: boolean;
	columns: readonly ResultGridColumn[];
	primaryName: string | null;
	appUrlOf: (key: string) => string | null;
	onSelectBucket: (bucket: ComparisonBucket) => void;
	onCompareAgain: () => void;
}

const setAsideNote = (bucket: ComparisonBucket, stored: StoredComparison): string | null => {
	if (bucket === "noKey") {
		return SET_ASIDE_TEXT.noKey;
	}
	if (bucket !== "ambiguous") {
		return null;
	}
	const groups = stored.comparison.ambiguous.length;
	return `${groups === 1 ? "1 group" : `${groups.toLocaleString()} groups`}. ${SET_ASIDE_TEXT.ambiguous}`;
};

export const ComparisonView = ({
	stored,
	bucket,
	stale,
	canCompareAgain,
	columns,
	primaryName,
	appUrlOf,
	onSelectBucket,
	onCompareAgain,
}: ComparisonViewProps) => {
	const styles = useStyles();
	const { comparison, first, second, primaryKey, matchKey } = stored;
	const selected = bucket ?? defaultBucket(comparison.counts);
	const unreliable = unreliableBuckets(first, second);
	const partial = partialText(first, second);
	const hint = noPairsHint(stored);
	const view = useBucketView(`${stored.id}:${selected}`);
	const grid = useMemo<CompareGridContext>(() => ({ stored, columns, primaryName }), [stored, columns, primaryName]);
	const firstUrl = appUrlOf(first.key);
	const secondUrl = appUrlOf(second.key);
	const context = useMemo<CompareCellContext>(
		() => ({
			matchKey,
			primaryKey,
			primaryKeyColumn: columns.find((column) => column.key === primaryKey && column.primaryKey) ?? null,
			appUrls: { first: firstUrl, second: secondUrl },
		}),
		[columns, firstUrl, matchKey, primaryKey, secondUrl]
	);
	const gridColumns = useMemo(() => compareGridColumns(selected, grid), [selected, grid]);
	const rows = useMemo(() => compareGridRows(selected, comparison), [selected, comparison]);
	const different = selected === "different";
	const shown = different ? filterByDifference(rows, view.filter) : rows;
	const visible = displayWindow(shown.length, view.page);
	const noun = bucketNoun(selected);
	const caption = gridCaption(visible, shown.length, noun, different ? differenceColumnName(gridColumns, view.filter) : null);
	const arrow = arrowText(first.name, second.name);
	const tooltip = different ? `${matchingText(stored)} ${arrow}` : matchingText(stored);

	return (
		<div className={styles.root}>
			{stale ? (
				<MessageBar intent="warning" className={styles.banner}>
					<MessageBarBody>
						<MessageBarTitle>Out of date.</MessageBarTitle>
						The Query, a Query Run or the setup changed after this Comparison.
					</MessageBarBody>
					<MessageBarActions>
						<Button size="small" disabled={!canCompareAgain} onClick={onCompareAgain}>
							Compare again
						</Button>
					</MessageBarActions>
				</MessageBar>
			) : null}
			{partial ? (
				<MessageBar intent="warning" className={styles.banner}>
					<MessageBarBody>{partial}</MessageBarBody>
				</MessageBar>
			) : null}
			<div className={mergeClasses(styles.root, stale && styles.stale)}>
				<BucketRow
					counts={comparison.counts}
					selected={selected}
					firstName={first.name}
					secondName={second.name}
					unreliable={unreliable}
					onSelect={onSelectBucket}>
					<InfoTip content={tooltip} />
					{different && rows.length > 0 ? <ColumnFilter columns={gridColumns} selected={view.filter} onSelect={view.setFilter} /> : null}
					{shown.length > 0 ? <DisplayPager visible={visible} caption={caption} noun={noun} onPageChange={view.setPage} /> : null}
				</BucketRow>
				{hint ? (
					<Text size={200} className={styles.hint}>
						<Info16Regular />
						{hint}
					</Text>
				) : null}
				<div className={styles.list}>
					<BucketList
						label={bucketLabel(selected, first.name, second.name)}
						columns={gridColumns}
						rows={shown.slice(visible.start, visible.end)}
						empty={`No ${noun}.`}
						context={context}
						note={setAsideNote(selected, stored)}
						warning={unreliable.has(selected) ? UNRELIABLE_TEXT : null}
						expansion={
							different ? { firstName: first.name, secondName: second.name, openRows: view.openRows, onToggleRow: view.toggleRow } : undefined
						}
						filtering={
							different ? { column: view.filter, arrow, onToggle: (column) => view.setFilter(view.filter === column ? null : column) } : undefined
						}
					/>
				</div>
			</div>
		</div>
	);
};
