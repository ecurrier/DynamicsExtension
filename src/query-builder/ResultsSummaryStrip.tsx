import { Button, makeStyles, Text, tokens } from "@fluentui/react-components";
import { ArrowDownload20Regular, ErrorCircle16Filled } from "@fluentui/react-icons";

import { canLoadAllEverywhere, type ConnectionRunEntry, runSummaryText } from "./lib";

const useStyles = makeStyles({
	strip: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		flexShrink: 0,
		columnGap: tokens.spacingHorizontalXL,
		rowGap: tokens.spacingVerticalXS,
		padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`,
		backgroundColor: tokens.colorNeutralBackground2,
		borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
	},
	list: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		columnGap: tokens.spacingHorizontalXL,
		rowGap: tokens.spacingVerticalXXS,
		minWidth: 0,
		margin: 0,
		padding: 0,
		listStyleType: "none",
	},
	item: {
		display: "inline-flex",
		alignItems: "center",
		columnGap: tokens.spacingHorizontalXS,
		minWidth: 0,
		whiteSpace: "nowrap",
	},
	name: {
		maxWidth: "200px",
		overflow: "hidden",
		textOverflow: "ellipsis",
	},
	value: {
		color: tokens.colorNeutralForeground2,
		fontVariantNumeric: "tabular-nums",
	},
	failed: {
		color: tokens.colorPaletteRedForeground1,
	},
	action: {
		marginLeft: "auto",
		flexShrink: 0,
	},
});

interface ResultsSummaryStripProps {
	entries: readonly ConnectionRunEntry[];
	onLoadAllEverywhere: () => void;
}

export const ResultsSummaryStrip = ({ entries, onLoadAllEverywhere }: ResultsSummaryStripProps) => {
	const styles = useStyles();
	return (
		<div className={styles.strip}>
			<ul className={styles.list} aria-label="Query Runs on each Connection">
				{entries.map(({ key, name, run }) => (
					<li key={key} className={styles.item}>
						<Text size={200} weight="semibold" className={styles.name} title={name}>
							{name}
						</Text>
						{run.status === "failed" ? <ErrorCircle16Filled className={styles.failed} /> : null}
						<Text size={200} className={run.status === "failed" ? styles.failed : styles.value}>
							{runSummaryText(run)}
						</Text>
					</li>
				))}
			</ul>
			<Button
				size="small"
				appearance="subtle"
				icon={<ArrowDownload20Regular />}
				className={styles.action}
				disabled={!canLoadAllEverywhere(entries.map((entry) => entry.run))}
				onClick={onLoadAllEverywhere}>
				Load all on every Connection
			</Button>
		</div>
	);
};
