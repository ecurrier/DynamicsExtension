import { describe, expect, it } from "vitest";

import { fetchXmlTableName, normalizeFetchXml, sameFetchXml } from "./fetchXmlKey";

describe("normalizeFetchXml", () => {
	it("ignores indentation, line breaks and quote style between elements", () => {
		const formatted = `<fetch top="5">\n\t<entity name="account">\n\t\t<attribute name="name" />\n\t</entity>\n</fetch>\n`;
		const compact = "<fetch top='5'><entity name='account'><attribute name='name'/></entity></fetch>";
		expect(normalizeFetchXml(formatted)).toBe(normalizeFetchXml(compact));
		expect(sameFetchXml(formatted, compact)).toBe(true);
	});

	it("keeps differences that change the Query", () => {
		expect(sameFetchXml('<fetch top="5"><entity name="account" /></fetch>', '<fetch top="6"><entity name="account" /></fetch>')).toBe(false);
		expect(sameFetchXml('<fetch><entity name="account" /></fetch>', '<fetch><entity name="contact" /></fetch>')).toBe(false);
	});

	it("falls back to the trimmed text when the XML does not parse", () => {
		expect(normalizeFetchXml("  <fetch><entity name='account'>  \n")).toBe("<fetch><entity name='account'>");
		expect(sameFetchXml("<fetch><entity", "  <fetch><entity  ")).toBe(true);
		expect(sameFetchXml("<fetch><entity", "<fetch> <entity")).toBe(false);
	});
});

describe("fetchXmlTableName", () => {
	it("reads the root Table from Fetch XML that parses", () => {
		expect(fetchXmlTableName('<fetch><entity name="account"><link-entity name="contact" from="a" to="b" /></entity></fetch>')).toBe("account");
	});

	it("falls back to the first entity name when the XML does not parse", () => {
		expect(fetchXmlTableName("<fetch><entity name='contact'><attribute name=")).toBe("contact");
	});

	it("returns null when there is no Table to name", () => {
		expect(fetchXmlTableName("<fetch />")).toBeNull();
		expect(fetchXmlTableName("not xml")).toBeNull();
		expect(fetchXmlTableName("")).toBeNull();
	});
});
