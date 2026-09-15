import { useMemo, useState } from "react";

import { matchesFilter } from "@/shared/lib";

export const useTableFilter = <T>(items: T[], fields: (item: T) => (string | null | undefined)[]) => {
	const [query, setQuery] = useState("");
	const filtered = useMemo(() => (query.trim() === "" ? items : items.filter((item) => matchesFilter(fields(item), query))), [items, query, fields]);
	return { query, setQuery, filtered, total: items.length, shown: filtered.length };
};
