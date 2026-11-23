import { describe, expect, it } from "vitest";

import { webApiBaseUrl, webApiOptionRows, webApiUrl } from "./webApiUrl";

const NO_OPTIONS = { select: null, filter: null, orderby: null, top: null, expand: null, count: false, apply: null };

describe("webApiBaseUrl", () => {
	it("keeps only the origin of a page or Environment URL", () => {
		expect(webApiBaseUrl("https://org.crm.dynamics.com/main.aspx?appid=1&pagetype=entityrecord")).toBe("https://org.crm.dynamics.com/api/data/v9.2/");
	});

	it("adds https to a host name without a scheme", () => {
		expect(webApiBaseUrl("org.crm4.dynamics.com/")).toBe("https://org.crm4.dynamics.com/api/data/v9.2/");
	});

	it("gives null when there is no URL", () => {
		expect(webApiBaseUrl(null)).toBeNull();
		expect(webApiBaseUrl("  ")).toBeNull();
	});
});

describe("webApiUrl", () => {
	it("puts the path after the base URL", () => {
		expect(webApiUrl("https://org.crm.dynamics.com/api/data/v9.2/", "accounts?$select=name")).toBe(
			"https://org.crm.dynamics.com/api/data/v9.2/accounts?$select=name"
		);
	});

	it("gives null without a base URL or a path", () => {
		expect(webApiUrl(null, "accounts")).toBeNull();
		expect(webApiUrl("https://org.crm.dynamics.com/api/data/v9.2/", null)).toBeNull();
	});
});

describe("webApiOptionRows", () => {
	it("lists the options that are set, in the documented order", () => {
		expect(
			webApiOptionRows({ ...NO_OPTIONS, top: 10, select: "name", count: true, filter: "statecode eq 0", expand: "pc($select=fullname)", orderby: "name" })
		).toEqual([
			{ label: "$select", value: "name" },
			{ label: "$filter", value: "statecode eq 0" },
			{ label: "$orderby", value: "name" },
			{ label: "$top", value: "10" },
			{ label: "$expand", value: "pc($select=fullname)" },
			{ label: "$count", value: "true" },
		]);
	});

	it("lists $apply alone for an aggregate", () => {
		expect(webApiOptionRows({ ...NO_OPTIONS, apply: "aggregate($count as total)" })).toEqual([{ label: "$apply", value: "aggregate($count as total)" }]);
	});

	it("lists nothing when no option is set", () => {
		expect(webApiOptionRows(NO_OPTIONS)).toEqual([]);
	});
});
