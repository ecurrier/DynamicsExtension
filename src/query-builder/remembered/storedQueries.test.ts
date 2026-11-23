import { describe, expect, it } from "vitest";

import { type StoredQueries, type StoredQuery } from "@/shared/storage";

import {
	addStoredQuery,
	deleteStoredQuery,
	filterStoredQueries,
	findStoredQueryByName,
	matchesStored,
	overwriteStoredQuery,
	renameStoredQuery,
	sortStoredQueries,
	type StoredQueryResult,
} from "./storedQueries";

const ACCOUNTS = '<fetch top="5"><entity name="account" /></fetch>';
const CONTACTS = '<fetch><entity name="contact"><attribute name="fullname" /></entity></fetch>';

const stored = (id: string, name: string, fetchXml = ACCOUNTS): StoredQuery => ({ id, name, fetchXml, createdAt: 1, updatedAt: 1 });

const list = (...items: StoredQuery[]): StoredQueries => Object.freeze(Object.fromEntries(items.map((item) => [item.id, Object.freeze(item)])));

const expectOk = (result: StoredQueryResult) => {
	if (!result.ok) {
		throw new Error(result.reason);
	}
	return result;
};

describe("addStoredQuery", () => {
	it("adds a Stored Query with a trimmed name and both times set", () => {
		const result = expectOk(addStoredQuery({}, { id: "a", name: "  Active accounts ", fetchXml: ACCOUNTS, now: 50 }));
		expect(result.storedQuery).toEqual({ id: "a", name: "Active accounts", fetchXml: ACCOUNTS, createdAt: 50, updatedAt: 50 });
		expect(result.storedQueries).toEqual({ a: result.storedQuery });
	});

	it("refuses an empty name", () => {
		expect(addStoredQuery({}, { id: "a", name: "   ", fetchXml: ACCOUNTS, now: 50 })).toMatchObject({ ok: false, refusal: "empty-name" });
	});

	it("refuses a name already taken, ignoring case, and names the existing one", () => {
		const existing = stored("a", "Active accounts");
		const result = addStoredQuery(list(existing), { id: "b", name: "ACTIVE ACCOUNTS", fetchXml: CONTACTS, now: 50 });
		expect(result).toMatchObject({ ok: false, refusal: "name-taken", existing });
	});

	it("does not change the list it is given", () => {
		const before = list(stored("a", "One"));
		addStoredQuery(before, { id: "b", name: "Two", fetchXml: CONTACTS, now: 50 });
		expect(Object.keys(before)).toEqual(["a"]);
	});
});

describe("overwriteStoredQuery", () => {
	it("replaces the Fetch XML of the Stored Query with that name, keeping its id, name and creation time", () => {
		const result = expectOk(overwriteStoredQuery(list(stored("a", "Active accounts"), stored("b", "Other")), " active ACCOUNTS ", CONTACTS, 90));
		expect(result.storedQuery).toEqual({ id: "a", name: "Active accounts", fetchXml: CONTACTS, createdAt: 1, updatedAt: 90 });
		expect(Object.keys(result.storedQueries)).toEqual(["a", "b"]);
		expect(result.storedQueries.b?.fetchXml).toBe(ACCOUNTS);
	});

	it("refuses a name that is empty or not stored", () => {
		expect(overwriteStoredQuery(list(stored("a", "One")), " ", CONTACTS, 90)).toMatchObject({ ok: false, refusal: "empty-name" });
		expect(overwriteStoredQuery(list(stored("a", "One")), "Two", CONTACTS, 90)).toMatchObject({ ok: false, refusal: "not-found" });
	});
});

describe("renameStoredQuery", () => {
	it("renames, trims and stamps the update time", () => {
		const result = expectOk(renameStoredQuery(list(stored("a", "One")), "a", "  Uno ", 70));
		expect(result.storedQuery).toEqual({ ...stored("a", "Uno"), updatedAt: 70 });
	});

	it("allows changing only the case of its own name", () => {
		const result = expectOk(renameStoredQuery(list(stored("a", "active accounts")), "a", "Active Accounts", 70));
		expect(result.storedQuery.name).toBe("Active Accounts");
	});

	it("leaves an unchanged name alone", () => {
		const before = list(stored("a", "One"));
		const result = expectOk(renameStoredQuery(before, "a", " One ", 70));
		expect(result.storedQueries).toBe(before);
		expect(result.storedQuery.updatedAt).toBe(1);
	});

	it("refuses an empty name, a name taken by another, and a missing Stored Query", () => {
		const before = list(stored("a", "One"), stored("b", "Two"));
		expect(renameStoredQuery(before, "a", "", 70)).toMatchObject({ ok: false, refusal: "empty-name" });
		expect(renameStoredQuery(before, "a", "two", 70)).toMatchObject({ ok: false, refusal: "name-taken", existing: { id: "b" } });
		expect(renameStoredQuery(before, "c", "Three", 70)).toMatchObject({ ok: false, refusal: "not-found" });
	});
});

describe("deleteStoredQuery", () => {
	it("removes by id without changing the list it is given", () => {
		const before = list(stored("a", "One"), stored("b", "Two"));
		expect(deleteStoredQuery(before, "a")).toEqual({ b: stored("b", "Two") });
		expect(Object.keys(before)).toEqual(["a", "b"]);
	});

	it("returns the same list when the id is not there", () => {
		const before = list(stored("a", "One"));
		expect(deleteStoredQuery(before, "z")).toBe(before);
	});
});

describe("sortStoredQueries", () => {
	it("orders alphabetically ignoring case", () => {
		const sorted = sortStoredQueries(list(stored("1", "beta"), stored("2", "Alpha"), stored("3", "gamma"), stored("4", "Delta")));
		expect(sorted.map((item) => item.name)).toEqual(["Alpha", "beta", "Delta", "gamma"]);
	});
});

describe("findStoredQueryByName", () => {
	it("finds by trimmed name ignoring case", () => {
		expect(findStoredQueryByName(list(stored("a", "One")), " ONE ")?.id).toBe("a");
		expect(findStoredQueryByName(list(stored("a", "One")), "Two")).toBeNull();
	});
});

describe("filterStoredQueries", () => {
	const items = [stored("a", "Active accounts"), stored("b", "People", CONTACTS)];

	it("returns everything for an empty filter", () => {
		expect(filterStoredQueries(items, "")).toEqual(items);
	});

	it("matches the name, the root Table and the Fetch XML, ignoring case", () => {
		expect(filterStoredQueries(items, "PEOPLE").map((item) => item.id)).toEqual(["b"]);
		expect(filterStoredQueries(items, "contact").map((item) => item.id)).toEqual(["b"]);
		expect(filterStoredQueries(items, "fullname").map((item) => item.id)).toEqual(["b"]);
		expect(filterStoredQueries(items, "account").map((item) => item.id)).toEqual(["a"]);
	});
});

describe("matchesStored", () => {
	it("treats insignificant whitespace as unchanged and real edits as changed", () => {
		const storedQuery = stored("a", "One");
		expect(matchesStored(storedQuery, `<fetch top='5'>\n\t<entity name='account' />\n</fetch>\n`)).toBe(true);
		expect(matchesStored(storedQuery, '<fetch top="10"><entity name="account" /></fetch>')).toBe(false);
	});
});
