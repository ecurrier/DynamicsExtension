import { describe, expect, it } from "vitest";

import { type FetchXmlDocument, metadataFrom, parseFetchXml, validate } from "@/shared/lib/fetchxml";
import { type QueryColumn, type QueryTable, type QueryTableSummary } from "@/shared/types";

import { connectionLacks, missingTables } from "./connectionLacks";

const column = (logicalName: string): QueryColumn => ({
	logicalName,
	displayName: logicalName,
	attributeType: "String",
	attributeTypeName: "StringType",
	columnType: "text",
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
	columns: columns.map(column),
	manyToOne: [],
	oneToMany: [],
	manyToMany: [],
});

const summary = (logicalName: string): QueryTableSummary => ({
	logicalName,
	displayName: logicalName,
	entitySetName: `${logicalName}s`,
	primaryIdAttribute: `${logicalName}id`,
	primaryNameAttribute: "name",
	isIntersect: false,
});

const parse = (text: string): FetchXmlDocument => {
	const result = parseFetchXml(text);
	if (!result.ok) {
		throw new Error("does not parse");
	}
	return result.document;
};

const lacksOf = (text: string, tables: readonly QueryTable[], missing: readonly string[] = []): string | null => {
	const document = parse(text);
	return connectionLacks(document, validate(document, metadataFrom(tables, missing)), "Contoso UAT");
};

const ACCOUNT = table("account", ["accountid", "name", "primarycontactid"]);
const CONTACT = table("contact", ["contactid", "fullname"]);

describe("what a Connection lacks", () => {
	it("names a Column the Environment does not have, with its Table and the Connection", () => {
		expect(lacksOf('<fetch><entity name="account"><attribute name="name" /><attribute name="contoso_region" /></entity></fetch>', [ACCOUNT])).toBe(
			"Column contoso_region does not exist on Table account in Contoso UAT.\nPower Tools did not send the Query to this Connection."
		);
	});

	it("names a Table the Environment does not have", () => {
		expect(lacksOf('<fetch><entity name="contoso_project" /></fetch>', [], ["contoso_project"])).toBe(
			"Table contoso_project does not exist in Contoso UAT.\nPower Tools did not send the Query to this Connection."
		);
	});

	it("finds Columns in link-entities, conditions, orders and valueof", () => {
		const message = lacksOf(
			[
				"<fetch><entity name='account'>",
				"<order attribute='contoso_rank' />",
				"<filter><condition attribute='name' operator='eq' valueof='contoso_alias' /></filter>",
				"<link-entity name='contact' from='contactid' to='primarycontactid' alias='pc'><attribute name='contoso_tier' /></link-entity>",
				"</entity></fetch>",
			].join(""),
			[ACCOUNT, CONTACT]
		);
		expect(message?.split("\n")).toEqual([
			"Column contoso_rank does not exist on Table account in Contoso UAT.",
			"Column contoso_alias does not exist on Table account in Contoso UAT.",
			"Column contoso_tier does not exist on Table contact in Contoso UAT.",
			"Power Tools did not send the Query to this Connection.",
		]);
	});

	it("names each missing Column once and counts the rest", () => {
		const attributes = ["a1", "a2", "a3", "a4", "a5", "a1"].map((name) => `<attribute name="${name}" />`).join("");
		expect(lacksOf(`<fetch><entity name="account">${attributes}</entity></fetch>`, [ACCOUNT])?.split("\n")).toEqual([
			"Column a1 does not exist on Table account in Contoso UAT.",
			"Column a2 does not exist on Table account in Contoso UAT.",
			"Column a3 does not exist on Table account in Contoso UAT.",
			"The Query uses 2 more Tables or Columns that do not exist in Contoso UAT.",
			"Power Tools did not send the Query to this Connection.",
		]);
	});

	it("does not block the Query Run for other problems or for Excluded rows", () => {
		expect(lacksOf('<fetch top="5" page="2"><entity name="account"><attribute name="name" /></entity></fetch>', [ACCOUNT])).toBeNull();
		expect(lacksOf('<fetch><entity name="account"><!-- <attribute name="contoso_region" /> --></entity></fetch>', [ACCOUNT])).toBeNull();
	});

	it("does not block the Query Run while a Table's metadata is not known", () => {
		expect(lacksOf('<fetch><entity name="account"><attribute name="contoso_region" /></entity></fetch>', [])).toBeNull();
	});

	it("lists the Tables a Query names that are not in the Connection's Table list", () => {
		expect(missingTables(["account", "Contact", "contoso_project"], [summary("account"), summary("contact")])).toEqual(["contoso_project"]);
	});
});
