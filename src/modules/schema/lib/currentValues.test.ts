import { describe, expect, it } from "vitest";

import { type AttributeMatch } from "@/shared/types";

import { countPropertyChanges, typeCounts } from "./columnEditPlan";
import { describeCurrentValues } from "./currentValues";

const match = (overrides: Partial<AttributeMatch> = {}): AttributeMatch => ({
	tableLogicalName: "account",
	tableDisplayName: "Account",
	columnLogicalName: "new_region",
	attributeType: "String",
	metadataType: null,
	label: "Region",
	description: "Sales region",
	requiredLevel: "None",
	isManaged: false,
	isCustomizable: true,
	metadataId: "m1",
	maxLength: 100,
	minValue: null,
	maxValue: null,
	precision: null,
	...overrides,
});

const account = match();
const contact = match({ tableLogicalName: "contact", tableDisplayName: "Contact", label: "Area", description: "", requiredLevel: "Recommended" });
const incident = match({ tableLogicalName: "incident", tableDisplayName: "Case" });

describe("describeCurrentValues", () => {
	it("names the tables behind each value, the most common first", () => {
		expect(describeCurrentValues([account, contact, incident], "label")).toBe("Region on Account and Case, Area on Contact");
	});

	it("quotes descriptions and calls out empty ones", () => {
		expect(describeCurrentValues([account, contact, incident], "description")).toBe("“Sales region” on Account and Case, empty on Contact");
	});

	it("says a value is shared rather than listing every table", () => {
		expect(describeCurrentValues([account, contact, incident], "maxLength")).toBe("100 on all 3");
		expect(describeCurrentValues([account], "label")).toBe("Region");
	});

	it("counts the tables once a value is shared by more than three", () => {
		const many = ["a", "b", "c", "d"].map((name) => match({ tableLogicalName: name, tableDisplayName: name.toUpperCase(), label: "Same" }));
		expect(describeCurrentValues([...many, contact], "label")).toBe("Same on 4 tables, Area on Contact");
	});

	it("shortens long values and marks unset numbers", () => {
		const long = match({ description: "A description that runs on for far longer than anyone would read in a hint" });
		expect(describeCurrentValues([long], "description")).toBe("“A description that runs on for far…”");
		expect(describeCurrentValues([match({ maxLength: null })], "maxLength")).toBe("not set");
	});
});

describe("countPropertyChanges", () => {
	it("is null until a value is entered for the property", () => {
		expect(countPropertyChanges([account, contact], {}, "label")).toBeNull();
	});

	it("counts only the tables whose current value differs", () => {
		expect(countPropertyChanges([account, contact, incident], { label: "Region" }, "label")).toBe(1);
		expect(countPropertyChanges([account, contact, incident], { requiredLevel: "Recommended" }, "requiredLevel")).toBe(2);
	});

	it("ignores columns locked by a managed solution", () => {
		expect(countPropertyChanges([match({ isCustomizable: false, label: "Old" })], { label: "Region" }, "label")).toBe(0);
	});
});

describe("typeCounts", () => {
	it("lists each type with its count, the majority first", () => {
		const lead = match({ tableLogicalName: "lead", attributeType: "Memo" });
		expect(typeCounts([account, contact, lead, incident])).toEqual([
			{ type: "String", count: 3, majority: true },
			{ type: "Memo", count: 1, majority: false },
		]);
	});
});
