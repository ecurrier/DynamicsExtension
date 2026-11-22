import { describe, expect, it } from "vitest";

import { type FetchXmlDocument, parseFetchXml } from "@/shared/lib/fetchxml";
import { type QueryTableSummary } from "@/shared/types";

import { findTable, rootTableName } from "./rootTable";

const parse = (text: string): FetchXmlDocument => {
	const result = parseFetchXml(text);
	if (!result.ok) {
		throw new Error(result.errors[0]?.message);
	}
	return result.document;
};

describe("rootTableName", () => {
	it("reads the name of the entity under fetch", () => {
		expect(rootTableName(parse('<fetch top="5"><!-- note --><entity name=" account "><attribute name="name" /></entity></fetch>'))).toBe("account");
	});

	it("returns null when there is no entity or it has no name", () => {
		expect(rootTableName(parse("<fetch />"))).toBeNull();
		expect(rootTableName(parse("<fetch><entity /></fetch>"))).toBeNull();
		expect(rootTableName(parse('<fetch><entity name="" /></fetch>'))).toBeNull();
	});

	it("returns null when the root is not fetch", () => {
		expect(rootTableName(parse('<entity name="account" />'))).toBeNull();
	});
});

describe("findTable", () => {
	const tables: QueryTableSummary[] = [
		{
			logicalName: "account",
			displayName: "Account",
			entitySetName: "accounts",
			primaryIdAttribute: "accountid",
			primaryNameAttribute: "name",
			isIntersect: false,
		},
	];

	it("matches the logical name ignoring case", () => {
		expect(findTable(tables, "Account")?.entitySetName).toBe("accounts");
	});

	it("returns null for an unknown Table", () => {
		expect(findTable(tables, "nope")).toBeNull();
	});
});
