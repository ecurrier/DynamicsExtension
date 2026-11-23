import { Button, Caption1, makeStyles, mergeClasses, tokens, Tooltip } from "@fluentui/react-components";
import { ChevronDown20Regular, ChevronRight20Regular } from "@fluentui/react-icons";
import { useId, useState } from "react";

import { type QueryHistoryEntry } from "@/shared/storage";

import { timeText } from "../lib";
import { summarizeHistoryEntry } from "../remembered";
import { useEntryStyles } from "./entryStyles";

const useStyles = makeStyles({
	failed: {
		color: tokens.colorPaletteRedForeground1,
	},
	xml: {
		margin: `${tokens.spacingVerticalXS} 0 0 0`,
		padding: tokens.spacingHorizontalS,
		maxHeight: "240px",
		overflow: "auto",
		borderRadius: tokens.borderRadiusMedium,
		backgroundColor: tokens.colorNeutralBackground3,
		fontFamily: tokens.fontFamilyMonospace,
		fontSize: tokens.fontSizeBase200,
		lineHeight: tokens.lineHeightBase200,
		whiteSpace: "pre",
	},
});

interface HistoryItemProps {
	entry: QueryHistoryEntry;
	onOpen: (entry: QueryHistoryEntry) => void;
}

export const HistoryItem = ({ entry, onOpen }: HistoryItemProps) => {
	const styles = useStyles();
	const entryStyles = useEntryStyles();
	const [expanded, setExpanded] = useState(false);
	const xmlId = useId();
	const summary = summarizeHistoryEntry(entry);
	return (
		<li className={entryStyles.entry}>
			<div className={entryStyles.row}>
				<Tooltip content={expanded ? "Hide the Fetch XML" : "Show the Fetch XML"} relationship="label">
					<Button
						appearance="subtle"
						size="small"
						icon={expanded ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
						aria-expanded={expanded}
						aria-controls={xmlId}
						onClick={() => setExpanded(!expanded)}
					/>
				</Tooltip>
				<button type="button" className={entryStyles.open} onClick={() => onOpen(entry)}>
					<span className={mergeClasses(entryStyles.title, entryStyles.mono)}>{summary.title}</span>
					<Caption1 className={entryStyles.meta}>
						{timeText(entry.ranAt)} · {entry.connectionLabel} ·{" "}
						<span className={mergeClasses(summary.failed && styles.failed)}>{summary.outcome}</span>
					</Caption1>
				</button>
			</div>
			{expanded ? (
				<pre id={xmlId} className={styles.xml}>
					{entry.fetchXml}
				</pre>
			) : null}
		</li>
	);
};
