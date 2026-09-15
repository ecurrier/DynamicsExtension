import { describe, expect, it } from "vitest";

import { defaultSolutionName } from "./solutions";

describe("defaultSolutionName", () => {
	it("recognises the default solution whatever its casing or padding", () => {
		expect(defaultSolutionName("Default Solution")).toBe(true);
		expect(defaultSolutionName("default solution")).toBe(true);
		expect(defaultSolutionName("  Default Solution  ")).toBe(true);
	});

	it("does not mistake a solution that merely mentions default", () => {
		expect(defaultSolutionName("Contoso Default Solution")).toBe(false);
		expect(defaultSolutionName("Default")).toBe(false);
		expect(defaultSolutionName("")).toBe(false);
	});
});
