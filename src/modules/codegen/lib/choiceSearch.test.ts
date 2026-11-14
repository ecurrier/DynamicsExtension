import { describe, expect, it } from "vitest";

import { choiceMatches, choiceOptionLabel } from "./choiceSearch";

const choice = { name: "contoso_status", displayName: "Order Status", isGlobal: true, tableLogicalName: null, columnLogicalName: null, options: [] };

describe("choiceMatches", () => {
	it("matches the display name, whatever the case", () => {
		expect(choiceMatches(choice, "order")).toBe(true);
		expect(choiceMatches(choice, "ORDER STATUS")).toBe(true);
	});

	it("matches the logical name, which is what a developer knows it by", () => {
		expect(choiceMatches(choice, "contoso_")).toBe(true);
		expect(choiceMatches(choice, "status")).toBe(true);
	});

	it("keeps everything when the term is empty", () => {
		expect(choiceMatches(choice, "")).toBe(true);
		expect(choiceMatches(choice, "   ")).toBe(true);
	});

	it("rejects a term in neither name", () => {
		expect(choiceMatches(choice, "invoice")).toBe(false);
	});
});

describe("choiceOptionLabel", () => {
	it("shows the logical name beside the display name", () => {
		expect(choiceOptionLabel(choice)).toBe("Order Status (contoso_status)");
	});

	it("shows the logical name alone when there is no display name", () => {
		expect(choiceOptionLabel({ ...choice, displayName: "" })).toBe("contoso_status");
	});
});
