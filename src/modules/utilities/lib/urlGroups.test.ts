import { describe, expect, it } from "vitest";

import { groupUrls } from "./urlGroups";

describe("groupUrls", () => {
	it("orders groups so the record comes before debug links", () => {
		const groups = groupUrls([
			{ name: "Command checker", url: "a", group: "Debug" },
			{ name: "Current Record", url: "b", group: "Record" },
			{ name: "Web API record", url: "c", group: "Developer" },
			{ name: "Owner", url: "d", group: "Lookups" },
		]);
		expect(groups.map((group) => group.name)).toEqual(["Record", "Lookups", "Developer", "Debug"]);
	});

	it("keeps the original index so the dropdown can select by position", () => {
		const groups = groupUrls([
			{ name: "Debug", url: "a", group: "Debug" },
			{ name: "Record", url: "b", group: "Record" },
		]);
		expect(groups[0]?.urls[0]?.index).toBe(1);
		expect(groups[1]?.urls[0]?.index).toBe(0);
	});

	it("defaults an ungrouped url to Record", () => {
		expect(groupUrls([{ name: "x", url: "y" }])).toEqual([{ name: "Record", urls: [{ index: 0, url: { name: "x", url: "y" } }] }]);
	});
});
