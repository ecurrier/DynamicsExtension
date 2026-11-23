import { makeStyles, mergeClasses, Text, ToggleButton, tokens } from "@fluentui/react-components";
import { Warning16Regular } from "@fluentui/react-icons";

import { bucketLabel, COMPARISON_BUCKETS, type ComparisonBucket, type ComparisonCounts, UNRELIABLE_TEXT } from "../lib";

const useStyles = makeStyles({
	row: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		flexShrink: 0,
		columnGap: tokens.spacingHorizontalXS,
		rowGap: tokens.spacingVerticalXXS,
	},
	button: {
		minWidth: 0,
		maxWidth: "260px",
		fontWeight: tokens.fontWeightRegular,
	},
	label: {
		overflow: "hidden",
		whiteSpace: "nowrap",
		textOverflow: "ellipsis",
	},
	count: {
		marginLeft: tokens.spacingHorizontalXS,
		fontWeight: tokens.fontWeightSemibold,
		fontVariantNumeric: "tabular-nums",
	},
	zero: {
		color: tokens.colorNeutralForeground4,
	},
	warning: {
		marginLeft: tokens.spacingHorizontalXXS,
		color: tokens.colorPaletteMarigoldForeground1,
		flexShrink: 0,
	},
});

interface ComparisonSummaryProps {
	counts: ComparisonCounts;
	selected: ComparisonBucket;
	firstName: string;
	secondName: string;
	unreliable: ReadonlySet<ComparisonBucket>;
	onSelect: (bucket: ComparisonBucket) => void;
}

export const ComparisonSummary = ({ counts, selected, firstName, secondName, unreliable, onSelect }: ComparisonSummaryProps) => {
	const styles = useStyles();
	return (
		<div className={styles.row} role="toolbar" aria-label="Comparison counts">
			{COMPARISON_BUCKETS.map((bucket) => {
				const label = bucketLabel(bucket, firstName, secondName);
				const value = counts[bucket];
				return (
					<ToggleButton
						key={bucket}
						size="small"
						appearance="subtle"
						checked={bucket === selected}
						disabled={value === 0 && bucket !== selected}
						className={mergeClasses(styles.button, value === 0 && styles.zero)}
						title={unreliable.has(bucket) ? `${label}. ${UNRELIABLE_TEXT}` : label}
						onClick={() => onSelect(bucket)}>
						<span className={styles.label}>{label}</span>
						<Text size={200} className={styles.count}>
							{value.toLocaleString()}
						</Text>
						{unreliable.has(bucket) ? <Warning16Regular className={styles.warning} aria-label={UNRELIABLE_TEXT} /> : null}
					</ToggleButton>
				);
			})}
		</div>
	);
};
