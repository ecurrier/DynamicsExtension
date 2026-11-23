import { describe, expect, it } from "vitest";

import { attributesOf, nodeAtPath, type XmlElement } from "@/shared/lib/fetchxml";
import { parse } from "@/test/queryTree";

import { detailsEntries, rowBadges } from "./detailsEntries";

const element = (xml: string, path: number[]): XmlElement => nodeAtPath(parse(xml), path) as XmlElement;

describe("detailsEntries", () => {
	it("lists every documented attribute of the element, in catalogue order, with its value", () => {
		const entries = detailsEntries(element('<fetch><entity name="account"><attribute name="createdon" dategrouping="month" /></entity></fetch>', [0, 0]));
		expect(entries.map((entry) => entry.name)).toEqual(attributesOf("attribute").map((definition) => definition.name));
		expect(entries.find((entry) => entry.name === "dategrouping")).toMatchObject({ kind: "known", value: "month" });
		expect(entries.find((entry) => entry.name === "alias")).toMatchObject({ kind: "known", value: undefined });
	});

	it("shows undocumented attributes only when they are present", () => {
		const bare = detailsEntries(element('<fetch><entity name="account" /></fetch>', []));
		expect(bare.some((entry) => entry.name === "version")).toBe(false);
		const saved = detailsEntries(element('<fetch version="1.0" mapping="logical"><entity name="account" /></fetch>', []));
		expect(saved.filter((entry) => entry.name === "version" || entry.name === "mapping")).toHaveLength(2);
	});

	it("lists attributes the catalogue does not know as left as written, after the known ones", () => {
		const entries = detailsEntries(element('<fetch><entity name="account"><attribute name="name" custom="x" /></entity></fetch>', [0, 0]));
		expect(entries.at(-1)).toEqual({ kind: "unknown", name: "custom", value: "x" });
	});
});

describe("rowBadges", () => {
	it("badges the set attributes the row does not show", () => {
		const attribute = element(
			'<fetch><entity name="account"><attribute name="createdon" dategrouping="month" usertimezone="1" /></entity></fetch>',
			[0, 0]
		);
		expect(rowBadges(attribute, false)).toEqual([
			{ name: "dategrouping", text: "dategrouping=month", known: true },
			{ name: "usertimezone", text: "usertimezone", known: true },
		]);
	});

	it("shows aggregate settings on the row only in an aggregate Query", () => {
		const attribute = element('<fetch><entity name="account"><attribute name="name" aggregate="count" alias="n" /></entity></fetch>', [0, 0]);
		expect(rowBadges(attribute, false).map((badge) => badge.name)).toEqual(["aggregate"]);
		expect(rowBadges(attribute, true)).toEqual([]);
	});

	it("never badges the saved-view bookkeeping on fetch", () => {
		expect(rowBadges(element('<fetch version="1.0" mapping="logical" no-lock="true"><entity name="account" /></fetch>', []), false)).toEqual([
			{ name: "no-lock", text: "no-lock", known: true },
		]);
	});
});
