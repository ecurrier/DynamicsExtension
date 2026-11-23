import { type StoredQueries, type StoredQuery } from "@/shared/storage";

import { fetchXmlTableName, filterTerm, includesText, sameFetchXml } from "./fetchXmlKey";

export type StoredQueryRefusal =
	| { ok: false; refusal: "empty-name"; reason: string }
	| { ok: false; refusal: "name-taken"; reason: string; existing: StoredQuery }
	| { ok: false; refusal: "not-found"; reason: string };

export type StoredQueryResult = { ok: true; storedQueries: StoredQueries; storedQuery: StoredQuery } | StoredQueryRefusal;

export interface NewStoredQuery {
	id: string;
	name: string;
	fetchXml: string;
	now: number;
}

const EMPTY_NAME: StoredQueryRefusal = { ok: false, refusal: "empty-name", reason: "Type a name for the Query" };

const notFound = (): StoredQueryRefusal => ({ ok: false, refusal: "not-found", reason: "This Stored Query does not exist" });

const nameTaken = (existing: StoredQuery): StoredQueryRefusal => ({
	ok: false,
	refusal: "name-taken",
	reason: `A Stored Query with the name "${existing.name}" already exists`,
	existing,
});

const sameName = (left: string, right: string): boolean => left.localeCompare(right, undefined, { sensitivity: "accent" }) === 0;

export const findStoredQueryByName = (storedQueries: StoredQueries, name: string): StoredQuery | null => {
	const wanted = name.trim();
	return Object.values(storedQueries).find((storedQuery) => sameName(storedQuery.name, wanted)) ?? null;
};

const saved = (storedQueries: StoredQueries, storedQuery: StoredQuery): StoredQueryResult => ({
	ok: true,
	storedQueries: { ...storedQueries, [storedQuery.id]: storedQuery },
	storedQuery,
});

export const addStoredQuery = (storedQueries: StoredQueries, { id, name, fetchXml, now }: NewStoredQuery): StoredQueryResult => {
	const trimmed = name.trim();
	if (trimmed === "") {
		return EMPTY_NAME;
	}
	const existing = findStoredQueryByName(storedQueries, trimmed);
	if (existing) {
		return nameTaken(existing);
	}
	return saved(storedQueries, { id, name: trimmed, fetchXml, createdAt: now, updatedAt: now });
};

export const overwriteStoredQuery = (storedQueries: StoredQueries, name: string, fetchXml: string, now: number): StoredQueryResult => {
	const existing = findStoredQueryByName(storedQueries, name);
	if (!existing) {
		return name.trim() === "" ? EMPTY_NAME : notFound();
	}
	return saved(storedQueries, { ...existing, fetchXml, updatedAt: now });
};

export const renameStoredQuery = (storedQueries: StoredQueries, id: string, name: string, now: number): StoredQueryResult => {
	const current = Object.hasOwn(storedQueries, id) ? storedQueries[id] : undefined;
	if (!current) {
		return notFound();
	}
	const trimmed = name.trim();
	if (trimmed === "") {
		return EMPTY_NAME;
	}
	const existing = findStoredQueryByName(storedQueries, trimmed);
	if (existing && existing.id !== id) {
		return nameTaken(existing);
	}
	if (current.name === trimmed) {
		return { ok: true, storedQueries, storedQuery: current };
	}
	return saved(storedQueries, { ...current, name: trimmed, updatedAt: now });
};

export const deleteStoredQuery = (storedQueries: StoredQueries, id: string): StoredQueries => {
	if (!Object.hasOwn(storedQueries, id)) {
		return storedQueries;
	}
	return Object.fromEntries(Object.entries(storedQueries).filter(([key]) => key !== id));
};

export const sortStoredQueries = (storedQueries: StoredQueries): StoredQuery[] =>
	Object.values(storedQueries).sort(
		(left, right) =>
			left.name.localeCompare(right.name, undefined, { sensitivity: "base" }) || left.name.localeCompare(right.name) || left.createdAt - right.createdAt
	);

export const filterStoredQueries = (storedQueries: readonly StoredQuery[], text: string): StoredQuery[] => {
	const term = filterTerm(text);
	if (term === "") {
		return [...storedQueries];
	}
	return storedQueries.filter(
		(storedQuery) =>
			includesText(storedQuery.name, term) || includesText(storedQuery.fetchXml, term) || includesText(fetchXmlTableName(storedQuery.fetchXml), term)
	);
};

export const matchesStored = (storedQuery: StoredQuery, currentXml: string): boolean => sameFetchXml(storedQuery.fetchXml, currentXml);
