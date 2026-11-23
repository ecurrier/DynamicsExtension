import { Button, makeStyles, mergeClasses, MessageBar, MessageBarActions, MessageBarBody, MessageBarTitle, Text, tokens } from "@fluentui/react-components";
import { Info16Regular } from "@fluentui/react-icons";

import {
	type ComparisonBucket,
	defaultBucket,
	matchingText,
	noPairsHint,
	partialText,
	type ResultGridColumn,
	type StoredComparison,
	UNRELIABLE_TEXT,
	unreliableBuckets,
} from "../lib";
import { ComparisonSummary } from "./ComparisonSummary";
import { DifferencesBucket } from "./DifferencesBucket";
import { RecordsBucket } from "./RecordsBucket";
import { SetAsideBucket } from "./SetAsideBucket";

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
		minHeight: "200px",
	},
	banner: {
		flexShrink: 0,
	},
	matching: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		flexShrink: 0,
		columnGap: tokens.spacingHorizontalM,
		color: tokens.colorNeutralForeground3,
	},
	hint: {
		display: "inline-flex",
		alignItems: "center",
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
	appUrlOf: (key: string) => string | null;
	maximised: boolean;
	onSelectBucket: (bucket: ComparisonBucket) => void;
	onCompareAgain: () => void;
}

export const ComparisonView = ({
	stored,
	bucket,
	stale,
	canCompareAgain,
	columns,
	appUrlOf,
	maximised,
	onSelectBucket,
	onCompareAgain,
}: ComparisonViewProps) => {
	const styles = useStyles();
	const { comparison, first, second } = stored;
	const selected = bucket ?? defaultBucket(comparison.counts);
	const unreliable = unreliableBuckets(first, second);
	const partial = partialText(first, second);
	const hint = noPairsHint(stored);

	const list = () => {
		switch (selected) {
			case "onlyInFirst":
			case "onlyInSecond": {
				const side = selected === "onlyInFirst" ? first : second;
				return (
					<RecordsBucket
						key={`${selected}-${side.key}`}
						rows={selected === "onlyInFirst" ? comparison.onlyInFirst : comparison.onlyInSecond}
						columns={columns}
						appUrl={appUrlOf(side.key)}
						maximised={maximised}
						warning={unreliable.has(selected) ? UNRELIABLE_TEXT : null}
					/>
				);
			}
			case "equal":
				return (
					<RecordsBucket
						key="equal"
						rows={comparison.equal.map((pair) => pair.first)}
						columns={columns}
						appUrl={appUrlOf(first.key)}
						maximised={maximised}
						note={`The values are the same in both. The list shows the Records in ${first.name}.`}
					/>
				);
			case "different":
				return <DifferencesBucket stored={stored} columns={columns} appUrlOf={appUrlOf} maximised={maximised} />;
			case "ambiguous":
			case "noKey":
				return <SetAsideBucket key={selected} kind={selected} stored={stored} columns={columns} appUrlOf={appUrlOf} maximised={maximised} />;
		}
	};

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
				<ComparisonSummary
					counts={comparison.counts}
					selected={selected}
					firstName={first.name}
					secondName={second.name}
					unreliable={unreliable}
					onSelect={onSelectBucket}
				/>
				<div className={styles.matching}>
					<Text size={200}>{matchingText(stored)}</Text>
					{hint ? (
						<Text size={200} className={styles.hint}>
							<Info16Regular />
							{hint}
						</Text>
					) : null}
				</div>
				<div key={stored.id} className={styles.list}>
					{list()}
				</div>
			</div>
		</div>
	);
};
