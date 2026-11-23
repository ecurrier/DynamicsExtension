import { describe, expect, it } from "vitest";

import { hasUnsavedWork, NO_ORIGIN, queryBaseline } from "./unsavedWork";

const QUERY = '<fetch>\n  <entity name="account">\n    <attribute name="name" />\n  </entity>\n</fetch>';
const SAME_QUERY = "<fetch><entity name='account'><attribute name='name'/></entity></fetch>";
const EDITED = '<fetch top="5">\n  <entity name="account">\n    <attribute name="name" />\n  </entity>\n</fetch>';
const NOTHING = { run: null, stored: null, loaded: null };

describe("hasUnsavedWork", () => {
	it("is false when there is no Query", () => {
		expect(hasUnsavedWork("", NOTHING)).toBe(false);
		expect(hasUnsavedWork("  \n", NOTHING)).toBe(false);
	});

	it("is true for a Query that was never run, stored or loaded", () => {
		expect(hasUnsavedWork(QUERY, NOTHING)).toBe(true);
	});

	it("is false when the Query is the one last run", () => {
		expect(hasUnsavedWork(QUERY, { ...NOTHING, run: QUERY })).toBe(false);
	});

	it("is false when the Query is the one last stored", () => {
		expect(hasUnsavedWork(QUERY, { ...NOTHING, stored: QUERY })).toBe(false);
	});

	it("is false when the Query is the one loaded from a starting point", () => {
		expect(hasUnsavedWork(QUERY, { ...NOTHING, loaded: QUERY })).toBe(false);
	});

	it("ignores formatting and quote style", () => {
		expect(hasUnsavedWork(QUERY, { ...NOTHING, run: SAME_QUERY })).toBe(false);
	});

	it("is true when the Query has edits since each of them", () => {
		expect(hasUnsavedWork(EDITED, { run: QUERY, stored: QUERY, loaded: QUERY })).toBe(true);
	});

	it("compares text that does not parse as written", () => {
		expect(hasUnsavedWork("<fetch><entity", { ...NOTHING, run: "<fetch><entity" })).toBe(false);
		expect(hasUnsavedWork("<fetch><entity name", { ...NOTHING, run: "<fetch><entity" })).toBe(true);
	});
});

describe("queryBaseline", () => {
	it("uses the Stored Query text only when the Query came from a Stored Query", () => {
		expect(queryBaseline("a", NO_ORIGIN, "b")).toEqual({ run: "a", stored: null, loaded: null });
		expect(queryBaseline(null, { storedQueryId: "id", loadedText: "c" }, "b")).toEqual({ run: null, stored: "b", loaded: "c" });
	});
});
