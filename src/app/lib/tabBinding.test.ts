import { describe, expect, it } from "vitest";

import { type PageTarget } from "@/shared/types";

import { pageTargetChanged, tabChoices } from "./tabBinding";

const target = (overrides: Partial<PageTarget> = {}): PageTarget => ({
	kind: "form",
	entityLogicalName: "account",
	recordId: "record-1",
	formId: "form-1",
	formName: "Account",
	viewId: null,
	...overrides,
});

describe("pageTargetChanged", () => {
	it("reports no change when the identity is the same", () => {
		expect(pageTargetChanged(target(), target())).toBe(false);
	});

	it("ignores the page kind and the form name", () => {
		expect(pageTargetChanged(target(), target({ kind: "view", formName: "Account Renamed" }))).toBe(false);
	});

	it("reports a change when the record changes", () => {
		expect(pageTargetChanged(target(), target({ recordId: "record-2" }))).toBe(true);
	});

	it("reports a change when the table changes", () => {
		expect(pageTargetChanged(target(), target({ entityLogicalName: "contact" }))).toBe(true);
	});

	it("reports a change when the form changes on the same record", () => {
		expect(pageTargetChanged(target(), target({ formId: "form-2" }))).toBe(true);
	});

	it("reports a change when the view changes", () => {
		expect(pageTargetChanged(target({ viewId: "view-1" }), target({ viewId: "view-2" }))).toBe(true);
	});

	it("reports a change when a record is opened from a view", () => {
		expect(pageTargetChanged(target({ recordId: null, viewId: "view-1" }), target({ recordId: "record-1", viewId: null }))).toBe(true);
	});

	it("reports a change when the target appears or disappears", () => {
		expect(pageTargetChanged(null, target())).toBe(true);
		expect(pageTargetChanged(target(), null)).toBe(true);
	});

	it("reports no change when there is no target either side", () => {
		expect(pageTargetChanged(null, null)).toBe(false);
	});
});

describe("tabChoices", () => {
	it("labels tabs by title", () => {
		expect(tabChoices([{ id: 4, title: "Contoso Ltd - Account", url: "https://org.crm.dynamics.com/main.aspx" }])).toEqual([
			{ id: 4, label: "Contoso Ltd - Account" },
		]);
	});

	it("falls back to the host, then to the tab id", () => {
		expect(
			tabChoices([
				{ id: 5, title: null, url: "https://org.crm.dynamics.com/main.aspx" },
				{ id: 6, title: null, url: null },
			])
		).toEqual([
			{ id: 5, label: "org.crm.dynamics.com" },
			{ id: 6, label: "Tab 6" },
		]);
	});

	it("drops tabs that could not be described", () => {
		expect(tabChoices([null, { id: 7, title: "Sales Hub", url: null }, null])).toEqual([{ id: 7, label: "Sales Hub" }]);
	});
});
