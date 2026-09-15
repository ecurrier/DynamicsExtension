import { tabLabel, type TabDescriptor } from "@/shared/lib";
import { type PageTarget } from "@/shared/types";

export interface TabChoice {
	id: number;
	label: string;
}

interface IdentifiedTab extends TabDescriptor {
	id: number;
}

const IDENTITY_KEYS = ["entityLogicalName", "recordId", "formId", "viewId"] as const;

export const pageTargetChanged = (previous: PageTarget | null, next: PageTarget | null): boolean => {
	if (!previous || !next) {
		return previous !== next;
	}
	return IDENTITY_KEYS.some((key) => previous[key] !== next[key]);
};

export const tabChoices = (tabs: (IdentifiedTab | null)[]): TabChoice[] =>
	tabs.filter((tab): tab is IdentifiedTab => tab !== null).map((tab) => ({ id: tab.id, label: tabLabel(tab) ?? `Tab ${tab.id}` }));
