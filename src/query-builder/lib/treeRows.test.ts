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
		expect(row("").switch).toEqual({ on: true, disabledReason: "fetch cannot be switched off" });
		expect(row("0").switch).toEqual({ on: true, disabledReason: "entity cannot be switched off" });
		expect(row("0.4.1").switch).toEqual({ on: false, disabledReason: "A comment cannot be switched off" });
		expect(row("0.4").switch.disabledReason).toBe("Remove the comments inside it first");
		expect(row("0.5").switch.disabledReason).toBe("Switch on or remove the switched-off nodes inside it first");
		expect(row("0.6").switch.disabledReason).toBe("condition is not valid inside entity, so switched off it would come back as a plain comment");
		expect(row("0.0").switch).toEqual({ on: true, disabledReason: null });
		expect(row("0.2").switch).toEqual({ on: false, disabledReason: null });
	});

	it("marks switched-off rows and everything under them inactive", () => {
		expect(row("0.2").switchedOff).toBe(true);
		expect(row("0.2").inactive).toBe(true);
		const off = buildTreeRows(
			parse('<fetch><entity name="a"><!-- <filter><condition attribute="x" operator="null" /></filter> --></entity></fetch>'),
			PENDING,
			"logical"
		);
		const child = findRow(off, "0.0.0");
		expect(child?.inactive).toBe(true);
		expect(child?.switch.disabledReason).toBe("A node inside a switched-off node cannot be switched off");
		expect(child?.switch.on).toBe(false);
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
