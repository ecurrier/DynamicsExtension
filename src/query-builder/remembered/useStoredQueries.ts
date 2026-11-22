import { useMemo } from "react";

import { generateGuid } from "@/shared/lib";
import { type StoredQueries, type StoredQuery, storedQueriesItem, useStorageItem, useStorageUpdate } from "@/shared/storage";

import { addStoredQuery, deleteStoredQuery, overwriteStoredQuery, renameStoredQuery, sortStoredQueries, type StoredQueryResult } from "./storedQueries";

const NO_STORED_QUERIES: StoredQueries = {};

export const useStoredQueries = () => {
	const storedQueriesQuery = useStorageItem(storedQueriesItem);
	const updateStored = useStorageUpdate(storedQueriesItem);
	const byId = storedQueriesQuery.data ?? NO_STORED_QUERIES;
	const storedQueries = useMemo<StoredQuery[]>(() => sortStoredQueries(byId), [byId]);

	const change = async (apply: (current: StoredQueries) => StoredQueryResult): Promise<StoredQueryResult> => {
		const outcome: { result?: StoredQueryResult } = {};
		await updateStored.mutateAsync((current) => {
			const result = apply(current);
			outcome.result = result;
			return result.ok ? result.storedQueries : current;
		});
		return outcome.result ?? apply(byId);
	};

	const add = (name: string, fetchXml: string) => change((current) => addStoredQuery(current, { id: generateGuid(), name, fetchXml, now: Date.now() }));
	const overwrite = (name: string, fetchXml: string) => change((current) => overwriteStoredQuery(current, name, fetchXml, Date.now()));
	const rename = (id: string, name: string) => change((current) => renameStoredQuery(current, id, name, Date.now()));
	const remove = (id: string) => updateStored.mutateAsync((current) => deleteStoredQuery(current, id));

	return {
		storedQueries,
		byId,
		isLoading: storedQueriesQuery.isLoading,
		add,
		overwrite,
		rename,
		remove,
		isSaving: updateStored.isPending,
	};
};
