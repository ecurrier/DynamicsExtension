import { Button, makeStyles, tokens } from "@fluentui/react-components";
import { Delete20Regular } from "@fluentui/react-icons";
import { useState } from "react";

import { SearchField, useAppToast, useConfirm } from "@/shared/components";
import { type QueryHistoryEntry } from "@/shared/storage";

import { filterHistory, useQueryHistory } from "../remembered";
import { useReplaceQuery } from "../start";
import { useEntryStyles } from "./entryStyles";
import { HistoryItem } from "./HistoryItem";

const useStyles = makeStyles({
	root: {
		display: "flex",
		flexDirection: "column",
		rowGap: tokens.spacingVerticalS,
		minHeight: 0,
	},
	bar: {
		display: "flex",
		alignItems: "center",
		columnGap: tokens.spacingHorizontalS,
	},
});

interface HistoryListProps {
	onOpened?: () => void;
}

export const HistoryList = ({ onOpened }: HistoryListProps) => {
	const styles = useStyles();
	const entryStyles = useEntryStyles();
	const toast = useAppToast();
	const confirm = useConfirm();
	const { replace } = useReplaceQuery();
	const { history, isLoading, clear } = useQueryHistory();
	const [filter, setFilter] = useState("");
	const shown = filterHistory(history, filter);

	const open = async (entry: QueryHistoryEntry) => {
		if (await replace(entry.fetchXml, { storedQueryId: null, loadedText: entry.fetchXml })) {
			onOpened?.();
		}
	};

	const onClear = async () => {
		const accepted = await confirm({
			title: "Clear the history?",
			content: `This deletes ${history.length === 1 ? "the entry" : `all ${history.length} entries`} in the history. You cannot undo this.`,
			confirmLabel: "Clear",
		});
		if (accepted) {
			await clear().catch((error: unknown) => toast.error("Cannot clear the history", error));
		}
	};

	const empty = history.length === 0 ? "The history is empty. Each Query Run adds an entry." : "No matches.";

	return (
		<div className={styles.root}>
			<div className={styles.bar}>
				<SearchField aria-label="Filter the history" placeholder="Filter the history" value={filter} onChange={setFilter} />
				<Button appearance="subtle" icon={<Delete20Regular />} disabled={history.length === 0} onClick={() => void onClear()}>
					Clear
				</Button>
			</div>
			{isLoading ? null : shown.length === 0 ? (
				<div className={entryStyles.empty}>{empty}</div>
			) : (
				<ul className={entryStyles.list} aria-label="History">
					{shown.map((entry) => (
						<HistoryItem key={`${entry.ranAt}-${entry.fetchXml.length}`} entry={entry} onOpen={(chosen) => void open(chosen)} />
					))}
				</ul>
			)}
		</div>
	);
};
