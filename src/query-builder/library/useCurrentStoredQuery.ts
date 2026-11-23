import { useMemo } from "react";

import { matchesStored, useStoredQueries } from "../remembered";
import { useQueryBuilder } from "../store";

export const useCurrentStoredQuery = () => {
	const storedQueryId = useQueryBuilder((state) => state.origin.storedQueryId);
	const text = useQueryBuilder((state) => state.text);
	const { byId } = useStoredQueries();
	const storedQuery = storedQueryId === null ? null : (byId[storedQueryId] ?? null);
	const changed = useMemo(() => storedQuery !== null && !matchesStored(storedQuery, text), [storedQuery, text]);
	return { storedQuery, changed };
};
