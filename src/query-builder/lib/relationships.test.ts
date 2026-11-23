import { describe, expect, it } from "vitest";

import { nodeAtPath, serializeFetchXml, type XmlElement } from "@/shared/lib/fetchxml";
import { type QueryTable, type QueryTableSummary } from "@/shared/types";
import { ACCOUNT, parse } from "@/test/queryTree";

import { rankPickerOptions } from "./pickerSearch";
import { linkRelationships, matchingRelationship, pickRelationship, relationshipOptions } from "./relationships";

const PARENT: QueryTable = {
	...ACCOUNT,
	manyToOne: [
		...ACCOUNT.manyToOne,
		{
			schemaName: "account_parent_account",
			lookupColumn: "parentaccountid",
			referencedTable: "account",
			referencedColumn: "accountid",
			navigationProperty: null,
		},
	],
	oneToMany: [
		{
			schemaName: "account_parent_account",
			referencedColumn: "accountid",
			referencingTable: "account",
			referencingColumn: "parentaccountid",
			navigationProperty: null,
		},
		{
			schemaName: "contact_customer_accounts",
			referencedColumn: "accountid",
			referencingTable: "contact",
			referencingColumn: "parentcustomerid",
			navigationProperty: null,
		},
	],
};

const TABLES: QueryTableSummary[] = [
	{
		logicalName: "account",
		displayName: "Account",
		entitySetName: "accounts",
		primaryIdAttribute: "accountid",
		primaryNameAttribute: "name",
		isIntersect: false,
	},
	{
		logicalName: "contact",
		displayName: "Contact",
		entitySetName: "contacts",
		primaryIdAttribute: "contactid",
		primaryNameAttribute: "fullname",
		isIntersect: false,
	},
];

describe("linkRelationships", () => {
	it("lists both directions with name, from and to for the link-entity", () => {
		expect(linkRelationships(PARENT).map(({ direction, name, from, to }) => ({ direction, name, from, to }))).toEqual([
			{ direction: "many-to-one", name: "contact", from: "contactid", to: "primarycontactid" },
			{ direction: "many-to-one", name: "account", from: "accountid", to: "parentaccountid" },
			{ direction: "one-to-many", name: "account", from: "parentaccountid", to: "accountid" },
			{ direction: "one-to-many", name: "contact", from: "parentcustomerid", to: "accountid" },
		]);
	});

	it("is searchable by the other Table's display name and the joining Column", () => {
		const options = relationshipOptions(linkRelationships(PARENT), TABLES, "logical");
		expect(rankPickerOptions(options, "Contact").map((option) => option.value)).toEqual([
			"contact|contactid|primarycontactid",
			"contact|parentcustomerid|accountid",
		]);
		expect(rankPickerOptions(options, "parentcustomer").map((option) => option.value)).toEqual(["contact|parentcustomerid|accountid"]);
		expect(options[0]).toMatchObject({ text: "contact", secondary: "primarycontactid = contact.contactid · many-to-one · Contact" });
		expect(relationshipOptions(linkRelationships(PARENT), TABLES, "display")[0]).toMatchObject({ text: "Contact" });
	});

	it("matches a link-entity to its relationship, or to none for a custom join", () => {
		const document = parse(
			'<fetch><entity name="account"><link-entity name="contact" from="contactid" to="primarycontactid"/><link-entity name="contact" from="contactid" to="ownerid"/></entity></fetch>'
		);
		const relationships = linkRelationships(PARENT);
		expect(matchingRelationship(relationships, nodeAtPath(document, [0, 0]) as XmlElement)?.schemaName).toBe("account_primary_contact");
		expect(matchingRelationship(relationships, nodeAtPath(document, [0, 1]) as XmlElement)).toBeUndefined();
	});

	it("sets name, from and to in one edit", () => {
		const document = parse('<fetch><entity name="account"><link-entity name="" from="" to="" link-type="outer" alias="x"/></entity></fetch>');
		const relationship = linkRelationships(PARENT)[3];
		if (!relationship) {
			throw new Error("missing");
		}
		const result = pickRelationship(document, [0, 0], relationship);
		expect(result.ok && serializeFetchXml(result.change.document, { minify: true })).toContain(
			'<link-entity name="contact" from="parentcustomerid" to="accountid" link-type="outer" alias="x"/>'
		);
	});
});
