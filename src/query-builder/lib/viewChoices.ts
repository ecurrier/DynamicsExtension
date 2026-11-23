import { type QueryView } from "@/shared/types";

export interface ViewGroups {
	system: QueryView[];
	personal: QueryView[];
}

const VIEW_TYPES: Readonly<Record<number, string>> = {
	1: "Advanced Find",
	2: "Associated",
	4: "Quick Find",
	64: "Lookup",
};

export const QUICK_FIND_TYPE = 4;

export const viewTypeLabel = (queryType: number): string | null => VIEW_TYPES[queryType] ?? null;

export const hasPlaceholders = (fetchXml: string): boolean => /\{\d+\}/.test(fetchXml);

export const needsPlaceholderNote = (view: Pick<QueryView, "queryType" | "fetchXml">): boolean =>
	view.queryType === QUICK_FIND_TYPE || hasPlaceholders(view.fetchXml);

const matches = (view: QueryView, term: string): boolean =>
	view.name.toLowerCase().includes(term) || (viewTypeLabel(view.queryType)?.toLowerCase().includes(term) ?? false);

export const groupViews = (views: readonly QueryView[], filter: string): ViewGroups => {
	const term = filter.trim().toLowerCase();
	const shown = term === "" ? views : views.filter((view) => matches(view, term));
	return {
		system: shown.filter((view) => view.kind === "system"),
		personal: shown.filter((view) => view.kind === "personal"),
	};
};
