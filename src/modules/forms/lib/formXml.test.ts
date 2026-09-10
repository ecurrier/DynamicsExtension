import { describe, expect, it } from "vitest";

import { type SystemForm } from "@/shared/types";

import { countLines, formLabel, formSummary } from "./formXml";

const form: SystemForm = {
	id: "f1",
	name: "Account",
	type: 2,
	typeLabel: "Main",
	isManaged: true,
	isCustomizable: true,
	isActive: true,
};

describe("formXml helpers", () => {
	it("labels forms with type and activation state", () => {
		expect(formLabel(form)).toBe("Account (Main)");
		expect(formLabel({ ...form, isActive: false })).toBe("Account (Main, inactive)");
	});

	it("summarises a form", () => {
		expect(formSummary(form, 1)).toBe("Main form · Active · Managed · 1 line");
		expect(formSummary({ ...form, isManaged: false, isActive: false }, 12)).toBe("Main form · Inactive · Unmanaged · 12 lines");
	});

	it("counts lines", () => {
		expect(countLines("")).toBe(0);
		expect(countLines("a")).toBe(1);
		expect(countLines("a\nb\nc")).toBe(3);
	});
});
