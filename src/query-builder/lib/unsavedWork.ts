import { sameFetchXml } from "./sameFetchXml";

export interface QueryOrigin {
	storedQueryId: string | null;
	loadedText: string | null;
}

export const NO_ORIGIN: QueryOrigin = { storedQueryId: null, loadedText: null };

export interface QueryBaseline {
	run: string | null;
	stored: string | null;
	loaded: string | null;
}

export const queryBaseline = (lastRunText: string | null, origin: QueryOrigin, storedFetchXml: string | null): QueryBaseline => ({
	run: lastRunText,
	stored: origin.storedQueryId === null ? null : storedFetchXml,
	loaded: origin.loadedText,
});

export const hasUnsavedWork = (text: string, baseline: QueryBaseline): boolean => {
	if (text.trim() === "") {
		return false;
	}
	return ![baseline.run, baseline.stored, baseline.loaded].some((known) => known !== null && sameFetchXml(known, text));
};
