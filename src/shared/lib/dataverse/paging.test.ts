import { describe, expect, it } from "vitest";

import { createFakeHttp } from "@/test/fakeHttp";

import { getAllPages, nextLinkPath } from "./paging";

const API = "https://org.crm.dynamics.com/api/data/v9.2/";

describe("paging", () => {
	it("turns a next link into a relative path and rejects foreign links", () => {
		expect(nextLinkPath(API, `${API}accounts?$skiptoken=abc`)).toBe("accounts?$skiptoken=abc");
		expect(() => nextLinkPath(API, "https://evil.example/accounts")).toThrow(/not under the Web API root/);
	});

	it("follows next links until the last page and keeps headers", async () => {
		const { http, calls } = createFakeHttp({
			"accounts?$skiptoken=2": { value: [3] },
			"accounts?": { value: [1, 2], "@odata.nextLink": `${API}accounts?$skiptoken=2` },
		});
		await expect(getAllPages<number>(http, "accounts?$select=name", { Prefer: "x" })).resolves.toEqual({
			rows: [1, 2, 3],
			truncated: false,
		});
		expect(calls.map((call) => call.path)).toEqual(["accounts?$select=name", "accounts?$skiptoken=2"]);
		expect(calls.every((call) => call.headers?.Prefer === "x")).toBe(true);
	});

	it("stops at the row cap and reports truncation", async () => {
		const { http, calls } = createFakeHttp({
			"accounts?": { value: [1, 2, 3], "@odata.nextLink": `${API}accounts?$skiptoken=2` },
		});
		await expect(getAllPages<number>(http, "accounts?", undefined, 2)).resolves.toEqual({
			rows: [1, 2],
			truncated: true,
		});
		expect(calls).toHaveLength(1);
	});
});
