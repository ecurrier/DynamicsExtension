import { describe, expect, it } from "vitest";

import { serializeFetchXml } from "@/shared/lib/fetchxml";
import { type QueryTableSummary } from "@/shared/types";
import { CONTACT, parse } from "@/test/queryTree";

import { changeRootTable, newQueryDocument, recordSearchFetchXml, recordSearchResults } from "./queryStart";
import { type ChangeResult, type QueryChange } from "./treeEdits";

const ok = (result: ChangeResult): QueryChange => {
	if (!result.ok) {
		throw new Error(result.reason);
	}
	return result.change;
};

const SUMMARY: QueryTableSummary = {
	logicalName: "contact",
	displayName: "Contact",
	entitySetName: "contacts",
	primaryIdAttribute: "contactid",
	primaryNameAttribute: "fullname",
	isIntersect: false,
};

describe("newQueryDocument", () => {
	it("starts a Query on the Table with its primary name Column", () => {
		expect(serializeFetchXml(newQueryDocument(SUMMARY), { minify: true })).toBe(
			'<fetch><entity name="contact"><attribute name="fullname"/></entity></fetch>'
		);
	});
});

describe("changeRootTable", () => {
	const QUERY = [
		'<fetch top="5"><entity name="account">',
		'<attribute name="name"/><attribute name="fullname"/><!-- note -->',
		'<order attribute="name"/><order attribute="contactid" descending="true"/>',
		'<filter><condition attribute="name" operator="eq" value="x"/><condition attribute="fullname" operator="null"/><condition entityname="pc" attribute="fullname" operator="null"/></filter>',
		'<filter type="or"><condition attribute="name" operator="null"/></filter>',
		'<link-entity name="contact" from="contactid" to="primarycontactid" alias="pc"><attribute name="fullname"/></link-entity>',
		'<custom-hint level="2"/>',
		"</entity></fetch>",
	].join("");

	it("keeps only what still applies to the new Table", () => {
		const change = ok(changeRootTable(parse(QUERY), "contact", CONTACT));
		expect(serializeFetchXml(change.document, { minify: true })).toBe(
			[
				'<fetch top="5"><entity name="contact">',
				'<attribute name="fullname"/><!-- note -->',
				'<order attribute="contactid" descending="true"/>',
				'<filter><condition attribute="fullname" operator="null"/></filter>',
				'<custom-hint level="2"/>',
				"</entity></fetch>",
			].join("")
		);
		expect(change.select).toEqual([0]);
	});

	it("only renames when the new Table's metadata could not be read", () => {
		const change = ok(changeRootTable(parse(QUERY), "contact", null));
		expect(serializeFetchXml(change.document, { minify: true })).toContain('<entity name="contact"><attribute name="name"/>');
	});

	it("refuses the same Table", () => {
		expect(changeRootTable(parse(QUERY), "Account", CONTACT).ok).toBe(false);
	});
});

describe("record search", () => {
	it("searches the primary name with an escaped like", () => {
		expect(recordSearchFetchXml(SUMMARY, " 50%_off ", 10)).toBe(
			'<fetch top="10"><entity name="contact"><attribute name="contactid"/><attribute name="fullname"/><attribute name="modifiedon"/><order attribute="fullname"/><filter><condition attribute="fullname" operator="like" value="%50[%][_]off%"/></filter></entity></fetch>'
		);
	});

	it("lists the most recently modified Records when nothing is typed", () => {
		expect(recordSearchFetchXml(SUMMARY, "")).toContain('<order attribute="modifiedon" descending="true"/></entity>');
	});

	it("sorts by name and leaves modifiedon out for a Table that has no such Column", () => {
		expect(recordSearchFetchXml(SUMMARY, "", 5, false)).toBe(
			'<fetch top="5"><entity name="contact"><attribute name="contactid"/><attribute name="fullname"/><order attribute="fullname"/></entity></fetch>'
		);
	});

	it("reads the id, name and modified time from the rows", () => {
		expect(
			recordSearchResults(SUMMARY, [{ contactid: "a", fullname: "Ann", modifiedon: "2026-01-01" }, { contactid: "b" }, { fullname: "no id" }])
		).toEqual([
			{ id: "a", name: "Ann", modifiedOn: "2026-01-01" },
			{ id: "b", name: "b", modifiedOn: null },
		]);
	});
});
