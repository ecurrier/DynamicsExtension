export interface TabDescriptor {
	title: string | null;
	url: string | null;
}

const MAX_LABEL_LENGTH = 70;

const hostOf = (url: string | null): string | null => {
	if (!url) {
		return null;
	}
	try {
		return new URL(url).host || null;
	} catch {
		return null;
	}
};

const truncate = (value: string): string => (value.length > MAX_LABEL_LENGTH ? `${value.slice(0, MAX_LABEL_LENGTH - 1).trimEnd()}…` : value);

export const tabLabel = (tab: TabDescriptor | null): string | null => {
	if (!tab) {
		return null;
	}
	const title = tab.title?.trim();
	if (title) {
		return truncate(title);
	}
	const host = hostOf(tab.url);
	return host ? truncate(host) : null;
};

export const tabTooltip = (tab: TabDescriptor | null): string => {
	if (!tab) {
		return "The tab Power Tools was reading is no longer available";
	}
	const label = tabLabel(tab);
	return label ? `Go to the tab Power Tools is reading — ${label}` : "Go to the tab Power Tools is reading";
};
