import { describe, expect, it } from "vitest";

import { clearsOnEscape } from "./clearOnEscape";

describe("clearsOnEscape", () => {
	it("clears a field that holds text", () => {
		expect(clearsOnEscape("Escape", "account")).toBe(true);
	});

	it("leaves an empty field alone, so Escape still closes the dialog around it", () => {
		expect(clearsOnEscape("Escape", "")).toBe(false);
	});

	it("ignores every other key", () => {
		expect(clearsOnEscape("Enter", "account")).toBe(false);
		expect(clearsOnEscape("a", "account")).toBe(false);
	});
});
