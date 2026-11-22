import { describe, expect, it } from "vitest";

import { type FetchXmlDocument, nodeAtPath, serializeFetchXml } from "@/shared/lib/fetchxml";
import { LOADED, parse, PENDING } from "@/test/queryTree";

import { addChild, ALREADY_TIDY, type ChangeResult, moveRow, type QueryChange, removeRow, tidyQuery, toggleRow, uniqueAlias } from "./treeEdits";

const ok = (result: ChangeResult): QueryChange => {
	if (!result.ok) {
		throw new Error(result.reason);
	}
	return result.change;
};

const xml = (document: FetchXmlDocument): string => serializeFetchXml(document);

const ENTITY =
	'<fetch><entity name="account"><attribute name="name" /><filter><condition attribute="name" operator="null" /></filter><link-entity name="contact" from="contactid" to="primarycontactid" alias="contact" /></entity></fetch>';

describe("addChild", () => {
	it("puts a new attribute after the last attribute, not at the end", () => {
		const change = ok(addChild(parse(ENTITY), [0], "attribute", LOADED));
		expect(change.select).toEqual([0, 1]);
		expect(change.shift).toEqual({ kind: "insert", parent: [0], index: 1 });
		expect(nodeAtPath(change.document, [0, 1])).toMatchObject({ name: "attribute", attributes: [{ name: "name", value: "accountid" }] });
	});

	it("starts a condition on the Table's primary name with eq", () => {
		const change = ok(addChild(parse(ENTITY), [0, 1], "condition", LOADED));
		expect(nodeAtPath(change.document, [0, 1, 1])).toMatchObject({
			attributes: [
				{ name: "attribute", value: "name" },
				{ name: "operator", value: "eq" },
				{ name: "value", value: "" },
			],
		});
	});

	it("uses the link-entity's own Table inside a link-entity", () => {
		const change = ok(addChild(parse(ENTITY), [0, 2], "attribute", LOADED));
		expect(nodeAtPath(change.document, [0, 2, 0])).toMatchObject({ attributes: [{ name: "name", value: "fullname" }] });
	});

	it("gives a filter the opposite type to its parent filter", () => {
		const document = parse('<fetch><entity name="account"><filter type="or" /></entity></fetch>');
		expect(nodeAtPath(ok(addChild(document, [0, 0], "filter", PENDING)).document, [0, 0, 0])).toMatchObject({
			attributes: [{ name: "type", value: "and" }],
		});
		const nested = parse('<fetch><entity name="account"><filter /></entity></fetch>');
		expect(nodeAtPath(ok(addChild(nested, [0, 0], "filter", PENDING)).document, [0, 0, 0])).toMatchObject({ attributes: [{ name: "type", value: "or" }] });
	});

	it("joins a link-entity on the first relationship with an alias nobody uses", () => {
		const change = ok(addChild(parse(ENTITY), [0], "link-entity", LOADED));
		expect(change.select).toEqual([0, 3]);
		expect(xml(change.document)).toContain('<link-entity name="contact" from="contactid" to="primarycontactid" link-type="outer" alias="contact2" />');
	});

	it("falls back to empty, valid-shaped elements while metadata is pending", () => {
		const document = parse('<fetch><entity name="account"><filter /></entity></fetch>');
		expect(xml(ok(addChild(document, [0, 0], "condition", PENDING)).document)).toContain('<condition attribute="" operator="eq" value="" />');
		expect(xml(ok(addChild(document, [0, 0], "link-entity", PENDING)).document)).toContain(
			'<link-entity name="" from="" to="" link-type="any" alias="link" />'
		);
		expect(xml(ok(addChild(document, [0], "order", PENDING)).document)).toContain('<order attribute="" />');
	});

	it("refuses a kind that is over its limit", () => {
		expect(addChild(parse(ENTITY), [0], "filter", PENDING)).toEqual({ ok: false, reason: "filter cannot be added inside entity" });
	});
});

describe("uniqueAlias", () => {
	it("adds a number until the alias is free", () => {
		const document = parse('<fetch><entity name="a"><link-entity name="b" alias="contact" /><attribute name="x" alias="Contact2" /></entity></fetch>');
		expect(uniqueAlias(document, "contact")).toBe("contact3");
		expect(uniqueAlias(document, "account")).toBe("account");
	});
});

describe("removeRow", () => {
	it("selects the next sibling, then the previous one, then the parent", () => {
		const document = parse(ENTITY);
		expect(ok(removeRow(document, [0, 0])).select).toEqual([0, 0]);
		expect(ok(removeRow(document, [0, 2])).select).toEqual([0, 1]);
		expect(ok(removeRow(document, [0, 1, 0])).select).toEqual([0, 1]);
	});

	it("refuses fetch and entity", () => {
		expect(removeRow(parse(ENTITY), [0]).ok).toBe(false);
		expect(removeRow(parse(ENTITY), []).ok).toBe(false);
	});
});

describe("moveRow", () => {
	it("moves a row among its siblings and keeps it selected", () => {
		const change = ok(moveRow(parse(ENTITY), [0, 0], 1));
		expect(change.select).toEqual([0, 1]);
		expect(nodeAtPath(change.document, [0, 1])).toMatchObject({ name: "attribute" });
	});

	it("refuses to move past the ends", () => {
		expect(moveRow(parse(ENTITY), [0, 0], -1).ok).toBe(false);
	});
});

describe("toggleRow", () => {
	it("switches a row off and back on", () => {
		const off = ok(toggleRow(parse(ENTITY), [0, 0]));
		expect(xml(off.document)).toContain('<!-- <attribute name="name" /> -->');
		const on = ok(toggleRow(parse(xml(off.document)), [0, 0]));
		expect(xml(on.document)).toContain('    <attribute name="name" />');
	});

	it("refuses a row that would come back as a plain comment", () => {
		const document = parse('<fetch><entity name="a"><condition attribute="x" operator="null" /></entity></fetch>');
		expect(toggleRow(document, [0, 0])).toEqual({
			ok: false,
			reason: "condition is not valid inside entity, so switched off it would come back as a plain comment",
		});
	});
});

describe("tidyQuery", () => {
	it("regroups an interleaved Query and maps every path", () => {
		const document = parse('<fetch><entity name="a"><filter /><attribute name="x" /></entity></fetch>');
		const change = ok(tidyQuery(document));
		expect(nodeAtPath(change.document, [0, 0])).toMatchObject({ name: "attribute" });
		expect(change.shift.kind).toBe("map");
		expect(change.select).toBeNull();
	});

	it("says so when the Query is already in order", () => {
		expect(tidyQuery(parse(ENTITY))).toEqual({ ok: false, reason: ALREADY_TIDY });
	});
});
