import { useState } from "react";

interface BucketViewState {
	key: string;
	page: number;
	filter: string | null;
	openRows: ReadonlySet<string>;
}

const initial = (key: string): BucketViewState => ({ key, page: 0, filter: null, openRows: new Set() });

const toggled = (current: ReadonlySet<string>, id: string): ReadonlySet<string> => {
	const next = new Set(current);
	if (!next.delete(id)) {
		next.add(id);
	}
	return next;
};

export const useBucketView = (key: string) => {
	const [stored, setStored] = useState<BucketViewState>(() => initial(key));
	const view = stored.key === key ? stored : initial(key);
	const update = (change: (current: BucketViewState) => BucketViewState) => setStored((current) => change(current.key === key ? current : initial(key)));
	return {
		page: view.page,
		filter: view.filter,
		openRows: view.openRows,
		setPage: (page: number) => update((current) => ({ ...current, page })),
		setFilter: (filter: string | null) => update((current) => ({ ...current, filter, page: 0 })),
		toggleRow: (id: string) => update((current) => ({ ...current, openRows: toggled(current.openRows, id) })),
	};
};
