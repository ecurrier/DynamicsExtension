import { describe, expect, it } from "vitest";

import { tabLabel, tabTooltip } from "./tabLabel";

describe("tabLabel", () => {
	it("prefers the tab title, which is what identifies the record", () => {
		expect(tabLabel({ title: "Contoso Ltd - Account: Sales Hub", url: "https://org.crm.dynamics.com/main.aspx" })).toBe("Contoso Ltd - Account: Sales Hub");
	});

	it("falls back to the host when the title is unavailable", () => {
		expect(tabLabel({ title: null, url: "https://org.crm.dynamics.com/main.aspx?etn=account" })).toBe("org.crm.dynamics.com");
		expect(tabLabel({ title: "   ", url: "https://org.crm.dynamics.com/" })).toBe("org.crm.dynamics.com");
	});

	it("truncates a very long title so the tooltip stays readable", () => {
		const label = tabLabel({ title: "x".repeat(200), url: null });
		expect(label).toHaveLength(70);
		expect(label?.endsWith("…")).toBe(true);
	});

	it("returns null when there is nothing to show", () => {
		expect(tabLabel(null)).toBeNull();
		expect(tabLabel({ title: null, url: null })).toBeNull();
		expect(tabLabel({ title: null, url: "not a url" })).toBeNull();
	});
});

describe("tabTooltip", () => {
	it("names the tab when it can", () => {
		expect(tabTooltip({ title: "Contoso Ltd - Account", url: null })).toBe("Go to the tab this window follows — Contoso Ltd - Account");
	});

	it("says so plainly when the tab has gone", () => {
		expect(tabTooltip(null)).toBe("The tab this window was opened from is no longer available");
	});

	it("still offers the action when the tab cannot be named", () => {
		expect(tabTooltip({ title: null, url: null })).toBe("Go to the tab this window follows");
	});
});
