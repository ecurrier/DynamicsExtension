import { describe, expect, it } from "vitest";

import { badgeText } from "./badgeText";

describe("badgeText", () => {
	it("reads a plain string", () => {
		expect(badgeText("Managed")).toBe("Managed");
	});

	it("joins the parts of an interpolated label", () => {
		expect(badgeText([3, " ", "Lookup"])).toBe("3 Lookup");
	});

	it("keeps the spaces inside a nested array", () => {
		expect(badgeText(["Team: ", ["Sales", " team"]])).toBe("Team: Sales team");
	});

	it("gives nothing for an empty or non-text child", () => {
		expect(badgeText(null)).toBeUndefined();
		expect(badgeText(undefined)).toBeUndefined();
		expect(badgeText("   ")).toBeUndefined();
		expect(badgeText(true)).toBeUndefined();
	});
});
