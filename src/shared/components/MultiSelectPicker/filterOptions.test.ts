import { describe, expect, it } from "vitest";

import { filterOptions, optionLabel, type PickerOption } from "./filterOptions";

const options: PickerOption[] = [
	{ value: "account", label: "Account", description: "Business that buys from you" },
	{ value: "contact", label: "Contact", description: "A person" },
	{ value: "new_project", label: "Project", description: "Custom table" },
];

describe("filterOptions", () => {
	it("matches on the label", () => {
		expect(filterOptions(options, "acc").map((option) => option.value)).toEqual(["account"]);
	});

	it("matches on the description, so a user who knows the concept but not the name still finds it", () => {
		expect(filterOptions(options, "person").map((option) => option.value)).toEqual(["contact"]);
	});

	it("matches on the logical name, which is what a developer types", () => {
		expect(filterOptions(options, "new_").map((option) => option.value)).toEqual(["new_project"]);
	});

	it("returns everything for an empty query", () => {
		expect(filterOptions(options, "")).toHaveLength(3);
	});

	it("returns nothing when nothing matches", () => {
		expect(filterOptions(options, "zzz")).toEqual([]);
	});
});

describe("optionLabel", () => {
	it("resolves a selected value to its label for the tag", () => {
		expect(optionLabel(options, "new_project")).toBe("Project");
	});

	it("falls back to the raw value when the option is gone", () => {
		expect(optionLabel(options, "vanished")).toBe("vanished");
	});
});
