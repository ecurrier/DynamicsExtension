import { describe, expect, it } from "vitest";

import { controlIsRestricted, controlStateTags } from "./controlState";

describe("controlStateTags", () => {
	it("returns one tag per restriction", () => {
		expect(controlStateTags({ visible: false, disabled: true, requiredLevel: "required" })).toEqual(["Hidden", "Read-only", "Required"]);
	});

	it("flags a read-only required control with no value as empty", () => {
		expect(controlStateTags({ visible: true, disabled: true, requiredLevel: "required", hasValue: false })).toEqual(["Read-only", "Required", "Empty"]);
		expect(controlStateTags({ visible: true, disabled: true, requiredLevel: "required", hasValue: true })).toEqual(["Read-only", "Required"]);
	});

	it("reports recommended separately from required and nothing for an open control", () => {
		expect(controlStateTags({ visible: true, disabled: false, requiredLevel: "recommended" })).toEqual(["Recommended"]);
		expect(controlStateTags({ visible: true, disabled: false, requiredLevel: "none" })).toEqual([]);
	});
});

describe("controlIsRestricted", () => {
	it("is true only when the control is hidden or read-only", () => {
		expect(controlIsRestricted({ visible: false, disabled: false })).toBe(true);
		expect(controlIsRestricted({ visible: true, disabled: true })).toBe(true);
		expect(controlIsRestricted({ visible: true, disabled: false, requiredLevel: "required" })).toBe(false);
	});
});
