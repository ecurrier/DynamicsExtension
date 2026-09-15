import { describe, expect, it } from "vitest";

import { type AttributeMatch } from "@/shared/types";

import { columnEditPlan, columnEditSummary, customisableReason, majorityType, tablesToPublish, typeMismatches } from "./columnEditPlan";

const match = (overrides: Partial<AttributeMatch> = {}): AttributeMatch => ({
	tableLogicalName: "account",
	tableDisplayName: "Account",
	columnLogicalName: "new_region",
	attributeType: "String",
	label: "Region",
	description: "Sales region",
	requiredLevel: "None",
	isManaged: false,
	isCustomizable: true,
	metadataId: "m1",
	...overrides,
});

describe("majorityType and typeMismatches", () => {
	it("flags the odd one out rather than hiding it", () => {
		const matches = [match(), match({ tableLogicalName: "contact" }), match({ tableLogicalName: "lead", attributeType: "Memo" })];
		expect(majorityType(matches)).toBe("String");
		expect([...typeMismatches(matches)]).toEqual(["lead"]);
	});

	it("flags nothing when every table agrees", () => {
		expect(typeMismatches([match(), match({ tableLogicalName: "contact" })]).size).toBe(0);
	});
});

describe("customisableReason", () => {
	it("explains a locked column and stays silent for an editable one", () => {
		expect(customisableReason(match({ isCustomizable: false }))).toContain("locked by its managed solution");
		expect(customisableReason(match())).toBeNull();
	});
});

describe("columnEditPlan", () => {
	it("skips tables already matching the requested values", () => {
		const matches = [match(), match({ tableLogicalName: "contact", label: "Old" })];
		const plan = columnEditPlan(matches, { label: "Region" });
		expect(plan.items.map((item) => item.id)).toEqual(["contact:new_region"]);
	});

	it("never plans a write against a column that cannot be customised", () => {
		const matches = [match({ isCustomizable: false, label: "Old" })];
		expect(columnEditPlan(matches, { label: "Region" }).items).toEqual([]);
	});

	it("describes what each change does", () => {
		const plan = columnEditPlan([match({ label: "Old" })], { label: "Region" });
		expect(plan.items[0]?.detail).toBe('Label "Old" to "Region"');
	});

	it("carries only the edited properties into the write", () => {
		const plan = columnEditPlan([match({ requiredLevel: "None" })], { requiredLevel: "Recommended" });
		expect(plan.items[0]?.args).toMatchObject({ requiredLevel: "Recommended", tableLogicalName: "account", metadataId: "m1" });
		expect(plan.items[0]?.args.label).toBeUndefined();
	});
});

describe("tablesToPublish", () => {
	it("takes the distinct tables from the items that succeeded", () => {
		expect(tablesToPublish(["account:new_region", "contact:new_region", "account:other"])).toEqual(["account", "contact"]);
	});

	it("is empty when nothing succeeded", () => {
		expect(tablesToPublish([])).toEqual([]);
	});
});

describe("columnEditSummary", () => {
	it("separates what will change from what is locked and what already matches", () => {
		const matches = [match({ label: "Old" }), match({ tableLogicalName: "contact", isCustomizable: false }), match({ tableLogicalName: "lead" })];
		expect(columnEditSummary(matches, { label: "Region" })).toBe("1 table will change, 1 locked by a managed solution, 1 already match.");
	});

	it("asks for a search when there is nothing yet", () => {
		expect(columnEditSummary([], {})).toBe("Search for a column to begin.");
	});
});
