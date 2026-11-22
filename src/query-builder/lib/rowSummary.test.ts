import { describe, expect, it } from "vitest";

import { LOADED, parse, PENDING } from "@/test/queryTree";

import { rowSummary, summaryText } from "./rowSummary";

const QUERY = parse(
	[
		'<fetch top="50" version="1.0" mapping="logical" distinct="true">',
		'  <entity name="account">',
		'    <attribute name="name" alias="n" />',
		"    <all-attributes />",
		'    <order attribute="name" descending="true" />',
		'    <order alias="n" />',
		'    <filter type="or" hint="union">',
		'      <condition attribute="name" operator="like" value="%Contoso%" />',
		'      <condition attribute="statecode" operator="in"><value>0</value><value>1</value></condition>',
		'      <condition attribute="name" operator="not-null" />',
		'      <condition entityname="pc" attribute="fullname" operator="eq" valueof="name" />',
		"      <filter />",
		"    </filter>",
		'    <link-entity name="contact" from="contactid" to="primarycontactid" link-type="outer" alias="pc" />',
		"    <!-- a   note\n   over two lines -->",
		'    <mystery kind="x" />',
		"  </entity>",
		"</fetch>",
	].join("\n")
);

const text = (path: number[], metadata = PENDING, lead: "logical" | "display" = "logical") => summaryText(rowSummary(QUERY, path, metadata, lead));

describe("rowSummary", () => {
	it("uses Fetch XML's own words", () => {
		expect(text([])).toBe("fetch · top 50 · distinct true");
		expect(text([0])).toBe("account");
		expect(text([0, 0])).toBe("name · alias n");
		expect(text([0, 1])).toBe("all-attributes");
		expect(text([0, 2])).toBe("name descending");
		expect(text([0, 3])).toBe("alias n ascending");
		expect(text([0, 4])).toBe("OR · hint union");
		expect(text([0, 4, 0])).toBe("name like %Contoso%");
		expect(text([0, 4, 1])).toBe("statecode in 0, 1");
		expect(text([0, 4, 2])).toBe("name not-null");
		expect(text([0, 4, 3])).toBe("pc.fullname eq valueof name");
		expect(text([0, 4, 4])).toBe("AND");
		expect(text([0, 5])).toBe("contact · link-type outer · alias pc");
	});

	it("shows a comment on one line and an unknown element by its tag", () => {
		expect(text([0, 6])).toBe("a note over two lines");
		expect(text([0, 7])).toBe("<mystery>");
	});

	it("puts display names beside logical names once metadata has loaded", () => {
		expect(text([0], LOADED)).toBe("account (Account)");
		expect(text([0, 4, 0], LOADED)).toBe("name (Account Name) like %Contoso%");
		expect(text([0, 4, 3], LOADED)).toBe("pc.fullname (Full Name) eq valueof name");
		expect(text([0, 5], LOADED)).toBe("contact (Contact) · link-type outer · alias pc");
	});

	it("leads with display names when the toggle says so", () => {
		expect(text([0], LOADED, "display")).toBe("Account (account)");
		expect(text([0, 4, 0], LOADED, "display")).toBe("Account Name (name) like %Contoso%");
	});

	it("shows a Choice value's label with its stored value", () => {
		expect(text([0, 4, 1], LOADED)).toBe("statecode (Status) in Active · 0, Inactive · 1");
	});

	it("marks missing names in the XML's own form", () => {
		const empty = parse('<fetch><entity><condition operator="eq" value="1" /></entity></fetch>');
		expect(summaryText(rowSummary(empty, [0], PENDING, "logical"))).toBe('name=""');
		expect(summaryText(rowSummary(empty, [0, 0], PENDING, "logical"))).toBe('attribute="" eq 1');
	});
});
