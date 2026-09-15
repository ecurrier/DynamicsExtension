import { describe, expect, it } from "vitest";

import { COMMON_PROPERTIES, editablePropertiesFor, mixedTypeReason, propertiesForType } from "./attributeProperties";

describe("propertiesForType", () => {
	it("offers a maximum length for text", () => {
		expect(propertiesForType("String")).toContain("maxLength");
		expect(propertiesForType("Memo")).toContain("maxLength");
	});

	it("offers a range for whole numbers, but no decimal places", () => {
		expect(propertiesForType("Integer")).toEqual([...COMMON_PROPERTIES, "minValue", "maxValue"]);
	});

	it("offers a range and decimal places for decimals and money", () => {
		expect(propertiesForType("Decimal")).toEqual([...COMMON_PROPERTIES, "minValue", "maxValue", "precision"]);
		expect(propertiesForType("Money")).toContain("precision");
	});

	it("offers only the common properties for a type with nothing extra", () => {
		expect(propertiesForType("Boolean")).toEqual(COMMON_PROPERTIES);
		expect(propertiesForType("Lookup")).toEqual(COMMON_PROPERTIES);
	});
});

describe("editablePropertiesFor", () => {
	it("uses the type's own properties when the selection is all one type", () => {
		expect(editablePropertiesFor(["String", "String"])).toContain("maxLength");
	});

	it("keeps a property both types share, rather than dropping it because the types differ", () => {
		expect(editablePropertiesFor(["String", "Memo"])).toContain("maxLength");
	});

	it("drops a property only one type has, so a length is never sent to a number", () => {
		expect(editablePropertiesFor(["String", "Integer"])).toEqual(COMMON_PROPERTIES);
	});

	it("keeps the range shared by two numeric types but drops the precision only one has", () => {
		expect(editablePropertiesFor(["Integer", "Decimal"])).toEqual([...COMMON_PROPERTIES, "minValue", "maxValue"]);
	});

	it("handles an empty selection", () => {
		expect(editablePropertiesFor([])).toEqual(COMMON_PROPERTIES);
	});
});

describe("mixedTypeReason", () => {
	it("names the types and the properties that were dropped", () => {
		const reason = mixedTypeReason(["String", "Integer"]);
		expect(reason).toContain("String and Integer");
		expect(reason).toContain("maximum length");
	});

	it("says nothing when the types differ but share every property they offer", () => {
		expect(mixedTypeReason(["String", "Memo"])).toBeNull();
	});

	it("says nothing when the selection is consistent", () => {
		expect(mixedTypeReason(["String", "String"])).toBeNull();
		expect(mixedTypeReason([])).toBeNull();
	});
});
