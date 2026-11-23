import { type QueryHistory, type QueryHistoryEntry, queryHistoryItem, useStorageItem, useStorageUpdate } from "@/shared/storage";

import { clearHistory, recordRun } from "./history";

const NO_HISTORY: QueryHistory = [];

export const useQueryHistory = () => {
	const historyQuery = useStorageItem(queryHistoryItem);
	const updateHistory = useStorageUpdate(queryHistoryItem);
	const record = (entry: QueryHistoryEntry) => updateHistory.mutateAsync((current) => recordRun(current, entry));
	const clear = () => updateHistory.mutateAsync(clearHistory);
	return {
		history: historyQuery.data ?? NO_HISTORY,
		isLoading: historyQuery.isLoading,
		record,
		clear,
		isSaving: updateHistory.isPending,
	};
};
