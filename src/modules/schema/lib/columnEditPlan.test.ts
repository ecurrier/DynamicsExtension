import { describe, expect, it } from "vitest";

import { type AttributeMatch } from "@/shared/types";

import { columnEditPlan, columnEditSummary, customisableReason, majorityType, tablesToPublish, typeMismatches } from "./columnEditPlan";

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

describe("columnEditPlan with type-specific properties", () => {
	it("plans a maximum length change for text columns", () => {
		const plan = columnEditPlan([match({ maxLength: 100 })], { maxLength: 200 });
		expect(plan.items[0]?.args).toMatchObject({ maxLength: 200 });
		expect(plan.items[0]?.detail).toBe("Maximum length 100 to 200");
	});

	it("drops a property the selected types cannot accept, rather than sending it and failing", () => {
		const mixed = [match({ attributeType: "String" }), match({ tableLogicalName: "contact", attributeType: "Integer" })];
		const plan = columnEditPlan(mixed, { label: "Sales region", maxLength: 200 });
		expect(plan.items).toHaveLength(2);
		for (const item of plan.items) {
			expect(item.args.maxLength).toBeUndefined();
			expect(item.args.label).toBe("Sales region");
		}
	});

	it("plans nothing when the only requested property is one the types cannot accept", () => {
		const mixed = [match({ attributeType: "String" }), match({ tableLogicalName: "contact", attributeType: "Integer" })];
		expect(columnEditPlan(mixed, { maxLength: 200 }).items).toEqual([]);
	});

	it("skips a column already at the requested numeric range", () => {
		const numeric = match({ attributeType: "Integer", minValue: 0, maxValue: 10 });
		expect(columnEditPlan([numeric], { minValue: 0, maxValue: 10 }).items).toEqual([]);
		expect(columnEditPlan([numeric], { minValue: 0, maxValue: 20 }).items).toHaveLength(1);
	});

	it("reads sensibly when the current value is unset", () => {
		const plan = columnEditPlan([match({ attributeType: "Decimal", precision: null })], { precision: 2 });
		expect(plan.items[0]?.detail).toBe("Decimal places unset to 2");
	});
});
