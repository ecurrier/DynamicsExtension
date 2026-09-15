import { describe, expect, it } from "vitest";

import { PRIVILEGE_ACCESS_TYPES, PRIVILEGE_DEPTHS } from "@/shared/types";

import { chipColor, MANAGED_COLORS, PRIVILEGE_ACCESS_COLORS, PRIVILEGE_DEPTH_COLORS } from "./palettes";

describe("chip palettes", () => {
	it("colours every privilege depth, so no value renders as an unexplained grey", () => {
		for (const depth of PRIVILEGE_DEPTHS) {
			expect(PRIVILEGE_DEPTH_COLORS[depth]).toBeDefined();
		}
	});

	it("colours every access type", () => {
		for (const accessType of PRIVILEGE_ACCESS_TYPES) {
			expect(PRIVILEGE_ACCESS_COLORS[accessType]).toBeDefined();
		}
	});

	it("escalates depth from subtle to danger, so reach reads as risk", () => {
		expect([PRIVILEGE_DEPTH_COLORS.None, PRIVILEGE_DEPTH_COLORS.Organization]).toEqual(["subtle", "danger"]);
	});

	it("falls back rather than throwing on a value the palette does not know", () => {
		expect(chipColor(PRIVILEGE_DEPTH_COLORS, "SomethingNew")).toBe("subtle");
		expect(chipColor(MANAGED_COLORS, "")).toBe("subtle");
	});
});
