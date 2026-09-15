import { describe, expect, it } from "vitest";

import { matchesFilter } from "./filterText";

describe("matchesFilter", () => {
	it("matches case-insensitively across every field", () => {
		expect(matchesFilter(["Contoso Ltd", "account"], "CONTOSO")).toBe(true);
		expect(matchesFilter(["Contoso Ltd", "account"], "account")).toBe(true);
	});

	it("requires every term to match, but they may match different fields", () => {
		expect(matchesFilter(["Contoso Ltd", "account"], "contoso account")).toBe(true);
		expect(matchesFilter(["Contoso Ltd", "account"], "contoso contact")).toBe(false);
	});

	it("treats an empty or whitespace query as matching everything", () => {
		expect(matchesFilter(["anything"], "")).toBe(true);
		expect(matchesFilter(["anything"], "   ")).toBe(true);
	});

	it("ignores null and undefined fields rather than throwing", () => {
		expect(matchesFilter([null, undefined, "Contoso"], "contoso")).toBe(true);
		expect(matchesFilter([null, undefined], "contoso")).toBe(false);
	});

	it("matches a prefix, which is how roles are searched", () => {
		expect(matchesFilter(["CON_Sales Manager"], "con_")).toBe(true);
	});
});
