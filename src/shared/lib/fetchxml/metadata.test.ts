import { describe, expect, it } from "vitest";

import type { QueryColumn, QueryColumnType, QueryTable } from "@/shared/types";

import { aliasesIn, columnOf, columnTableAt, linkEntityFor, metadataFrom, resolveValueOf, tablesNamedIn, valueOfColumns, valueOfTargets } from "./metadata";
import { parseFetchXml } from "./parse";
import { type FetchXmlDocument } from "./types";

const parsed = (text: string): FetchXmlDocument => {
	const result = parseFetchXml(text);
	if (!result.ok) {
		throw new Error(result.errors.map((error) => error.message).join("; "));
	}
	return result.document;
};

const column = (logicalName: string, columnType: QueryColumnType | null = "text"): QueryColumn => ({
	logicalName,
	displayName: logicalName,
	attributeType: "String",
	attributeTypeName: "StringType",
	columnType,
	attributeOf: null,
	isPrimaryId: false,
	isPrimaryName: false,
	isValidForRead: true,
	dateOnly: false,
	options: [],
	targets: [],
});

const table = (logicalName: string, columns: readonly string[]): QueryTable => ({
	logicalName,
	displayName: logicalName,
	entitySetName: `${logicalName}s`,
	primaryIdAttribute: `${logicalName}id`,
	primaryNameAttribute: "name",
	columns: columns.map((name) => column(name)),
	manyToOne: [],
	oneToMany: [],
	manyToMany: [],
});

const QUERY = parsed(
	[
		"<fetch>",
		'  <entity name="account">',
		'    <attribute name="name" alias="accountname" />',
		'    <order attribute="fullname" entityname="c" />',
		'    <filter type="and">',
		'      <condition attribute="lastname" entityname="c" operator="not-null" />',
		'      <condition attribute="name" operator="eq" valueof="c.fullname" />',
		'      <link-entity name="task" from="regardingobjectid" to="accountid" link-type="any" />',
		"    </filter>",
		'    <link-entity name="contact" from="parentcustomerid" to="accountid" alias="c">',
		'      <attribute name="fullname" alias="contactname" />',
		'      <link-entity name="systemuser" from="systemuserid" to="owninguser">',
		'        <attribute name="fullname" />',
		'        <filter><condition attribute="isdisabled" operator="eq" value="0" /></filter>',
		"      </link-entity>",
		"    </link-entity>",
		'    <!-- <link-entity name="lead" from="parentaccountid" to="accountid" alias="off" /> -->',
		"  </entity>",
		"</fetch>",
	].join("\n")
);

describe("metadataFrom", () => {
	it("reports loaded, missing and pending Tables, ignoring case", () => {
		const account = table("account", ["name"]);
		const metadata = metadataFrom([account], ["nosuch"]);
		expect(metadata("Account")).toEqual({ state: "loaded", table: account });
		expect(metadata("nosuch")).toEqual({ state: "missing" });
		expect(metadata("contact")).toEqual({ state: "pending" });
	});

	it("finds a Column by logical name", () => {
		expect(columnOf(table("account", ["name"]), "Name")?.logicalName).toBe("name");
		expect(columnOf(table("account", ["name"]), "other")).toBeUndefined();
	});
});

describe("tablesNamedIn", () => {
	it("lists each Table once, including link-entities under filters and inside Excluded rows", () => {
		expect(tablesNamedIn(QUERY)).toEqual(["account", "task", "contact", "systemuser", "lead"]);
	});

	it("skips elements with no name", () => {
		expect(tablesNamedIn(parsed('<fetch><entity><link-entity name="" /></entity></fetch>'))).toEqual([]);
	});
});

describe("columnTableAt", () => {
	it("uses the nearest enclosing entity or link-entity for attribute and condition", () => {
		expect(columnTableAt(QUERY, [0, 0], "name")).toEqual({ kind: "table", tableLogicalName: "account", tablePath: [0] });
		expect(columnTableAt(QUERY, [0, 3, 0], "name")).toEqual({ kind: "table", tableLogicalName: "contact", tablePath: [0, 3] });
		expect(columnTableAt(QUERY, [0, 3, 1, 1, 0], "attribute")).toEqual({ kind: "table", tableLogicalName: "systemuser", tablePath: [0, 3, 1] });
	});

	it("uses a link-entity's own Table for from and its parent's Table for to, through nesting and filters", () => {
		expect(columnTableAt(QUERY, [0, 3, 1], "from")).toEqual({ kind: "table", tableLogicalName: "systemuser", tablePath: [0, 3, 1] });
		expect(columnTableAt(QUERY, [0, 3, 1], "to")).toEqual({ kind: "table", tableLogicalName: "contact", tablePath: [0, 3] });
		expect(columnTableAt(QUERY, [0, 2, 2], "to")).toEqual({ kind: "table", tableLogicalName: "account", tablePath: [0] });
		expect(columnTableAt(QUERY, [0, 2, 2], "from")).toEqual({ kind: "table", tableLogicalName: "task", tablePath: [0, 2, 2] });
	});

	it("resolves entityname on a condition or order by alias", () => {
		expect(columnTableAt(QUERY, [0, 1], "attribute")).toEqual({ kind: "table", tableLogicalName: "contact", tablePath: [0, 3] });
		expect(columnTableAt(QUERY, [0, 2, 0], "attribute")).toEqual({ kind: "table", tableLogicalName: "contact", tablePath: [0, 3] });
	});

	it("resolves entityname by name for a link-entity without an alias, and not by name when it has one", () => {
		const document = parsed(
			[
				'<fetch><entity name="account">',
				'<filter><condition entityname="systemuser" attribute="a" operator="null" /><condition entityname="contact" attribute="a" operator="null" /></filter>',
				'<link-entity name="systemuser" from="systemuserid" to="ownerid" />',
				'<link-entity name="contact" from="contactid" to="primarycontactid" alias="pc" />',
				"</entity></fetch>",
			].join("")
		);
		expect(columnTableAt(document, [0, 0, 0], "attribute")).toEqual({ kind: "table", tableLogicalName: "systemuser", tablePath: [0, 1] });
		expect(columnTableAt(document, [0, 0, 1], "attribute")).toEqual({ kind: "unknown-entityname", entityName: "contact" });
	});

	it("does not resolve entityname to an Excluded link-entity", () => {
		const document = parsed(
			'<fetch><entity name="account"><order attribute="a" entityname="off" /><!-- <link-entity name="lead" from="a" to="b" alias="off" /> --></entity></fetch>'
		);
		expect(columnTableAt(document, [0, 0], "attribute")).toEqual({ kind: "unknown-entityname", entityName: "off" });
		expect(linkEntityFor(QUERY, "off")).toBeUndefined();
		expect(linkEntityFor(QUERY, "c")?.path).toEqual([0, 3]);
	});

	it("reports an unnamed holder and a path with no Table", () => {
		const document = parsed('<fetch><entity><attribute name="a" /></entity></fetch>');
		expect(columnTableAt(document, [0, 0], "name")).toEqual({ kind: "unnamed", tablePath: [0] });
		expect(columnTableAt(document, [], "top")).toEqual({ kind: "none" });
		expect(columnTableAt(document, [5], "name")).toEqual({ kind: "none" });
	});
});

describe("aliasesIn", () => {
	it("lists link-entity and attribute aliases in document order, leaving out Excluded rows", () => {
		expect(aliasesIn(QUERY)).toEqual([
			{ alias: "accountname", definedBy: "attribute", path: [0, 0], tableLogicalName: "account", columnLogicalName: "name" },
			{ alias: "c", definedBy: "link-entity", path: [0, 3], tableLogicalName: "contact", columnLogicalName: null },
			{ alias: "contactname", definedBy: "attribute", path: [0, 3, 0], tableLogicalName: "contact", columnLogicalName: "fullname" },
		]);
	});
});

describe("valueof scope", () => {
	it("offers the condition's own Table unprefixed and every other link-entity by alias or name", () => {
		expect(valueOfTargets(QUERY, [0, 2, 1])).toEqual([
			{ prefix: null, tableLogicalName: "account", tablePath: [0] },
			{ prefix: "task", tableLogicalName: "task", tablePath: [0, 2, 2] },
			{ prefix: "c", tableLogicalName: "contact", tablePath: [0, 3] },
			{ prefix: "systemuser", tableLogicalName: "systemuser", tablePath: [0, 3, 1] },
		]);
	});

	it("does not offer the condition's own link-entity twice", () => {
		const targets = valueOfTargets(QUERY, [0, 3, 1, 1, 0]);
		expect(targets[0]).toEqual({ prefix: null, tableLogicalName: "systemuser", tablePath: [0, 3, 1] });
		expect(targets.map((target) => target.prefix)).toEqual([null, "task", "c"]);
	});

	it("lists the Columns of loaded Tables as references", () => {
		const metadata = metadataFrom([table("account", ["name"]), table("contact", ["fullname"])]);
		expect(valueOfColumns(QUERY, [0, 2, 1], metadata).map((entry) => entry.reference)).toEqual(["name", "c.fullname"]);
	});

	it("resolves a reference to its Table and Column", () => {
		expect(resolveValueOf(QUERY, [0, 2, 1], "c.fullname")).toEqual({
			kind: "column",
			prefix: "c",
			tableLogicalName: "contact",
			tablePath: [0, 3],
			columnLogicalName: "fullname",
		});
		expect(resolveValueOf(QUERY, [0, 2, 1], "name")).toEqual({
			kind: "column",
			prefix: null,
			tableLogicalName: "account",
			tablePath: [0],
			columnLogicalName: "name",
		});
		expect(resolveValueOf(QUERY, [0, 2, 1], "x.name")).toEqual({ kind: "unknown-alias", alias: "x" });
	});
});
