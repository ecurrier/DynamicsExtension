import { describe, expect, it } from "vitest";

import { escapeODataString, odataStringLiteral } from "./odata";

describe("odata", () => {
	it("doubles single quotes", () => {
		expect(escapeODataString("O'Neil's")).toBe("O''Neil''s");
		expect(escapeODataString("plain")).toBe("plain");
	});

	it("wraps literals in quotes", () => {
		expect(odataStringLiteral("it's")).toBe("'it''s'");
	});
});
