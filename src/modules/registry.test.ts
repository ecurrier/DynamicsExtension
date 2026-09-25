import { describe, expect, it } from "vitest";

import { DEFAULT_AREA, resolveArea } from "./registry";

describe("resolveArea", () => {
	it("sends a remembered Update Fields Area to Record Columns", () => {
		expect(resolveArea("webapi.update-fields").id).toBe("webapi.record-columns");
	});

	it("falls back to the default Area for unknown ids", () => {
		expect(resolveArea("nope").id).toBe(DEFAULT_AREA);
		expect(resolveArea(null).id).toBe(DEFAULT_AREA);
	});
});
