import { describe, expect, it } from "vitest";

import { type FetchXmlDocument, parseFetchXml } from "@/shared/lib/fetchxml";

import { rootTableOf, xrmFetchXmlSnippet } from "./javaScriptSnippet";

const documentOf = (text: string): FetchXmlDocument => {
	const result = parseFetchXml(text);
	if (!result.ok) {
		throw new Error("The fixture does not parse");
	}
	return result.document;
};

describe("rootTableOf", () => {
	it("reads the root Table of the Query", () => {
		expect(rootTableOf(documentOf('<fetch><entity name="new_thing" /></fetch>'))).toBe("new_thing");
	});

	it("gives null when entity has no name", () => {
		expect(rootTableOf(documentOf("<fetch><entity /></fetch>"))).toBeNull();
	});
});

describe("xrmFetchXmlSnippet", () => {
	it("builds a retrieveMultipleRecords call from the Query core's JavaScript string", () => {
		const snippet = xrmFetchXmlSnippet(documentOf("<fetch version='1.0'><entity name='contact'><attribute name='fullname' /></entity></fetch>"));
		expect(snippet).toBe(
			[
				'const fetchXml = `<fetch version="1.0">',
				'  <entity name="contact">',
				'    <attribute name="fullname" />',
				"  </entity>",
				"</fetch>`;",
				"const result = await Xrm.WebApi.retrieveMultipleRecords(",
				'  "contact",',
				"  `?fetchXml=${encodeURIComponent(fetchXml)}`,",
				");",
				"console.table(result.entities);",
			].join("\n")
		);
	});

	it("leaves Excluded rows out and escapes backticks", () => {
		const snippet = xrmFetchXmlSnippet(
			documentOf(
				'<fetch><entity name="account"><attribute name="name" /><!-- <attribute name="revenue" /> --><filter><condition attribute="name" operator="eq" value="a`b" /></filter></entity></fetch>'
			)
		);
		expect(snippet).not.toContain("revenue");
		expect(snippet).toContain("a\\`b");
	});

	it("gives null when the Query has no root Table", () => {
		expect(xrmFetchXmlSnippet(documentOf("<fetch><entity /></fetch>"))).toBeNull();
	});
});
