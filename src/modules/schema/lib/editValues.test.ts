import { describe, expect, it } from "vitest";

import { attributeEditFrom, EMPTY_EDIT_VALUES } from "./editValues";

describe("attributeEditFrom", () => {
	it("keeps every property that was left empty", () => {
		expect(attributeEditFrom(EMPTY_EDIT_VALUES)).toEqual({});
	});

	it("trims text and parses numbers", () => {
		expect(attributeEditFrom({ ...EMPTY_EDIT_VALUES, label: "  Region ", requiredLevel: "Recommended", maxLength: " 200 " })).toEqual({
			label: "Region",
			requiredLevel: "Recommended",
			maxLength: 200,
		});
	});

	it("drops a number it cannot read rather than sending it", () => {
		expect(attributeEditFrom({ ...EMPTY_EDIT_VALUES, precision: "two" })).toEqual({});
	});
});
