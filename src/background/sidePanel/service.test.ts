import { describe, expect, it } from "vitest";

import { sidePanelBehavior } from "./service";

describe("sidePanelBehavior", () => {
	it("is off for settings saved before the toggle existed", () => {
		expect(sidePanelBehavior({ openLastVisitedArea: true })).toBe(false);
	});

	it("is off when there are no settings at all", () => {
		expect(sidePanelBehavior(null)).toBe(false);
		expect(sidePanelBehavior(undefined)).toBe(false);
		expect(sidePanelBehavior({})).toBe(false);
	});

	it("follows the toggle once it is set", () => {
		expect(sidePanelBehavior({ openSidePanelOnActionClick: true })).toBe(true);
		expect(sidePanelBehavior({ openSidePanelOnActionClick: false })).toBe(false);
	});
});
