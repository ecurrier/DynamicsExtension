import { makeStyles, tokens } from "@fluentui/react-components";
import { useState } from "react";

import { SearchField, useAppToast, useConfirm } from "@/shared/components";
import { type StoredQuery } from "@/shared/storage";

import { filterStoredQueries, useStoredQueries } from "../remembered";
import { useReplaceQuery } from "../start";
import { useQueryBuilder } from "../store";
import { useEntryStyles } from "./entryStyles";
import { NameDialog, type NameSubmitResult } from "./NameDialog";
import { StoredQueryItem } from "./StoredQueryItem";

const useStyles = makeStyles({
	root: {
		display: "flex",
		flexDirection: "column",
		rowGap: tokens.spacingVerticalS,
		minHeight: 0,
	},
});

interface StoredQueryListProps {
	onOpened?: () => void;
}

export const StoredQueryList = ({ onOpened }: StoredQueryListProps) => {
	const styles = useStyles();
	const entryStyles = useEntryStyles();
	const toast = useAppToast();
	const confirm = useConfirm();
	const { replace } = useReplaceQuery();
	const currentId = useQueryBuilder((state) => state.origin.storedQueryId);
	const { storedQueries, isLoading, rename, remove } = useStoredQueries();
	const [filter, setFilter] = useState("");
	const [renaming, setRenaming] = useState<StoredQuery | null>(null);
	const shown = filterStoredQueries(storedQueries, filter);

	const open = async (storedQuery: StoredQuery) => {
		if (await replace(storedQuery.fetchXml, { storedQueryId: storedQuery.id, loadedText: null })) {
			onOpened?.();
		}
	};

	const onDelete = async (storedQuery: StoredQuery) => {
		const accepted = await confirm({
			title: "Delete the Stored Query?",
			content: `This deletes "${storedQuery.name}" from My queries. You cannot undo this.`,
			confirmLabel: "Delete",
		});
		if (accepted) {
			await remove(storedQuery.id).catch((error: unknown) => toast.error("Cannot delete the Stored Query", error));
		}
	};

	const submitRename = async (name: string): Promise<NameSubmitResult> => {
		if (!renaming) {
			return { kind: "done" };
		}
		const result = await rename(renaming.id, name);
		return result.ok ? { kind: "done" } : { kind: "error", message: result.reason };
	};

	const empty = storedQueries.length === 0 ? "My queries is empty. Select Save to store the current Query." : "No matches.";

	return (
		<div className={styles.root}>
			<SearchField aria-label="Filter My queries" placeholder="Filter My queries" value={filter} onChange={setFilter} />
			{isLoading ? null : shown.length === 0 ? (
				<div className={entryStyles.empty}>{empty}</div>
			) : (
				<ul className={entryStyles.list} aria-label="My queries">
					{shown.map((storedQuery) => (
						<StoredQueryItem
							key={storedQuery.id}
							storedQuery={storedQuery}
							current={storedQuery.id === currentId}
							onOpen={(chosen) => void open(chosen)}
							onRename={setRenaming}
							onDelete={(chosen) => void onDelete(chosen)}
						/>
					))}
				</ul>
			)}
			<NameDialog
				open={renaming !== null}
				title="Rename the Stored Query"
				initialName={renaming?.name ?? ""}
				confirmLabel="Rename"
				onSubmit={submitRename}
				onClose={() => setRenaming(null)}
			/>
		</div>
	);
};
