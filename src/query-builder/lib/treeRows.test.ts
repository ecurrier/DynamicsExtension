import { describe, expect, it } from "vitest";

import { parse, PENDING } from "@/test/queryTree";

import { branchKeys, buildTreeRows, findRow, type TreeRow } from "./treeRows";

const QUERY = parse(
	[
		"<fetch>",
		'  <entity name="account">',
		'    <attribute name="name" />',
		'    <order attribute="name" />',
		'    <!-- <order attribute="accountnumber" /> -->',
		'    <order attribute="revenue" descending="true" />',
		"    <filter>",
		'      <condition attribute="statecode" operator="in"><value>0</value><value>1</value></condition>',
		"      <!-- free text -->",
		"    </filter>",
		'    <link-entity name="contact" from="contactid" to="primarycontactid">',
		'      <!-- <attribute name="fullname" /> -->',
		"    </link-entity>",
		'    <condition attribute="name" operator="null" />',
		"    <mystery />",
		"  </entity>",
		"</fetch>",
	].join("\n")
);

const rows = buildTreeRows(QUERY, PENDING, "logical");

const row = (key: string): TreeRow => {
	const found = findRow(rows, key);
	if (!found) {
		throw new Error(`no row ${key}`);
	}
	return found;
};

describe("buildTreeRows", () => {
	it("lists the Query in document order, leaving value elements to their condition", () => {
		expect(row("0").children.map((child) => child.kind)).toEqual(["attribute", "order", "order", "order", "filter", "link-entity", "condition", "unknown"]);
		expect(row("0.4.0").children).toEqual([]);
		expect(row("0.4.1").kind).toBe("comment");
		expect(branchKeys(rows)).toEqual(["", "0", "0.4", "0.5"]);
	});

	it("keeps a known element's kind where it is misplaced and marks an unknown one", () => {
		expect(row("0.6").kind).toBe("condition");
		expect(row("0.7").kind).toBe("unknown");
		expect(row("0.7").tag).toBe("mystery");
	});

	it("disables the switch with the reason the edit operation gives", () => {
		expect(row("").exclusion).toEqual({ included: true, disabledReason: "You cannot Exclude fetch" });
		expect(row("0").exclusion).toEqual({ included: true, disabledReason: "You cannot Exclude entity" });
		expect(row("0.4.1").exclusion).toEqual({ included: false, disabledReason: "You cannot Exclude a comment" });
		expect(row("0.4").exclusion.disabledReason).toBe("First, delete the comments inside this row");
		expect(row("0.5").exclusion.disabledReason).toBe("First, Include or delete the Excluded rows inside this row");
		expect(row("0.6").exclusion.disabledReason).toBe("condition is not valid inside entity. If you Exclude it, it becomes a plain comment");
		expect(row("0.0").exclusion).toEqual({ included: true, disabledReason: null });
		expect(row("0.2").exclusion).toEqual({ included: false, disabledReason: null });
	});

	it("marks Excluded rows and everything under them inactive", () => {
		expect(row("0.2").excluded).toBe(true);
		expect(row("0.2").inactive).toBe(true);
		const excludedTree = buildTreeRows(
			parse('<fetch><entity name="a"><!-- <filter><condition attribute="x" operator="null" /></filter> --></entity></fetch>'),
			PENDING,
			"logical"
		);
		const child = findRow(excludedTree, "0.0.0");
		expect(child?.inactive).toBe(true);
		expect(child?.exclusion.disabledReason).toBe("You cannot Exclude a row inside an Excluded row");
		expect(child?.exclusion.included).toBe(false);
	});

	it("numbers the active order rows when there is more than one", () => {
		expect(row("0.1").precedence).toBe(1);
		expect(row("0.2").precedence).toBeNull();
		expect(row("0.3").precedence).toBe(2);
		const single = buildTreeRows(parse('<fetch><entity name="a"><order attribute="x" /></entity></fetch>'), PENDING, "logical");
		expect(findRow(single, "0.0")?.precedence).toBeNull();
	});

	it("keeps fetch and entity fixed and offers moves within the siblings", () => {
		expect(row("").fixed).toBe(true);
		expect(row("0").fixed).toBe(true);
		expect(row("0").canMoveUp).toBe(false);
		expect(row("0.0").canMoveUp).toBe(false);
		expect(row("0.0").canMoveDown).toBe(true);
		expect(row("0.7").canMoveDown).toBe(false);
	});

	it("offers the children the catalogue allows, minus those at their limit", () => {
		expect(row("0").addKinds).toEqual(["all-attributes", "attribute", "order", "link-entity"]);
		expect(row("0.4").addKinds).toEqual(["condition", "filter", "link-entity"]);
		expect(row("0.4.0").addKinds).toEqual([]);
		expect(row("").addKinds).toEqual([]);
		expect(row("0.7").addKinds).toEqual([]);
		expect(row("0.4.1").addKinds).toEqual([]);
	});
});
