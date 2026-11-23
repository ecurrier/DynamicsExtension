import { Badge, makeStyles, Tab, TabList, tokens } from "@fluentui/react-components";
import { Warning16Regular } from "@fluentui/react-icons";
import { type ReactNode } from "react";

import { bucketLabel, COMPARISON_BUCKETS, type ComparisonBucket, type ComparisonCounts, UNRELIABLE_TEXT } from "../lib";

const useStyles = makeStyles({
	row: {
		display: "flex",
		alignItems: "center",
		flexShrink: 0,
		columnGap: tokens.spacingHorizontalS,
		containerType: "inline-size",
		borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
	},
	tabs: {
		flexShrink: 1,
		minWidth: 0,
		overflowX: "auto",
	},
	tab: {
		flexShrink: 0,
		whiteSpace: "nowrap",
	},
	badge: {
		marginLeft: tokens.spacingHorizontalXS,
		fontVariantNumeric: "tabular-nums",
	},
	warning: {
		marginLeft: tokens.spacingHorizontalXXS,
		verticalAlign: "middle",
		color: tokens.colorPaletteMarigoldForeground1,
	},
	tools: {
		display: "flex",
		alignItems: "center",
		flexShrink: 0,
		marginLeft: "auto",
		columnGap: tokens.spacingHorizontalS,
	},
});

interface BucketRowProps {
	counts: ComparisonCounts;
	selected: ComparisonBucket;
	firstName: string;
	secondName: string;
	unreliable: ReadonlySet<ComparisonBucket>;
	onSelect: (bucket: ComparisonBucket) => void;
	children: ReactNode;
}

export const BucketRow = ({ counts, selected, firstName, secondName, unreliable, onSelect, children }: BucketRowProps) => {
	const styles = useStyles();
	return (
		<div className={styles.row}>
			<TabList
				size="small"
				className={styles.tabs}
				aria-label="Comparison buckets"
				selectedValue={selected}
				onTabSelect={(_, data) => onSelect(data.value as ComparisonBucket)}>
				{COMPARISON_BUCKETS.map((bucket) => {
					const value = counts[bucket];
					return (
						<Tab key={bucket} value={bucket} className={styles.tab} disabled={value === 0 && bucket !== selected}>
							{bucketLabel(bucket, firstName, secondName)}
							<Badge
								size="small"
								appearance={bucket === selected ? "filled" : "tint"}
								color={bucket === selected ? "brand" : "informative"}
								className={styles.badge}>
								{value.toLocaleString()}
							</Badge>
							{unreliable.has(bucket) ? (
								<Warning16Regular className={styles.warning} aria-label={UNRELIABLE_TEXT} title={UNRELIABLE_TEXT} />
							) : null}
						</Tab>
					);
				})}
			</TabList>
			<div className={styles.tools}>{children}</div>
		</div>
	);
};
