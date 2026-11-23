import { useCallback } from "react";

import { useConfirm } from "@/shared/components";

import { hasUnsavedWork, type QueryOrigin, queryBaseline } from "../lib";
import { useStoredQueries } from "../remembered";
import { useQueryBuilderStoreApi } from "../store";

export const useReplaceQuery = () => {
	const store = useQueryBuilderStoreApi();
	const confirm = useConfirm();
	const { byId } = useStoredQueries();

	const mayReplace = useCallback(async (): Promise<boolean> => {
		const { text, lastRunText, origin } = store.getState();
		const stored = origin.storedQueryId === null ? null : (byId[origin.storedQueryId]?.fetchXml ?? null);
		if (!hasUnsavedWork(text, queryBaseline(lastRunText, origin, stored))) {
			return true;
		}
		return confirm({
			title: "Replace the Query?",
			content: "The current Query has changes that you did not run or store. You can undo the replacement with Ctrl+Z.",
			confirmLabel: "Replace",
		});
	}, [byId, confirm, store]);

	const replace = useCallback(
		async (text: string, origin: QueryOrigin): Promise<boolean> => {
			if (!(await mayReplace())) {
				return false;
			}
			store.getState().loadQuery(text, origin);
			return true;
		},
		[mayReplace, store]
	);

	return { mayReplace, replace };
};
