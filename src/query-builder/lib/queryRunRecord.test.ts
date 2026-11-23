import { describe, expect, it } from "vitest";

import { errorOutcome, historyConnection, historyConnectionLabel, hostOf, recordsOutcome } from "./queryRunRecord";

describe("historyConnection", () => {
	it("keeps the Environment id of an Environment connection", () => {
		expect(historyConnection({ kind: "environment", environmentId: "env-dev" }, "https://x.crm.dynamics.com/main.aspx")).toEqual({
			kind: "environment",
			environmentId: "env-dev",
		});
	});

	it("keeps the host of the page for the page Connection", () => {
		expect(historyConnection({ kind: "page" }, "https://org.crm.dynamics.com/main.aspx?etn=account")).toEqual({
			kind: "page",
			host: "org.crm.dynamics.com",
		});
	});

	it("uses an empty host when the tab has no address", () => {
		expect(historyConnection({ kind: "page" }, null)).toEqual({ kind: "page", host: "" });
		expect(hostOf("not a url")).toBeNull();
	});
});

describe("historyConnectionLabel", () => {
	it("names a page Connection by its host", () => {
		expect(historyConnectionLabel({ kind: "page", host: "org.crm.dynamics.com" }, "Current page")).toBe("org.crm.dynamics.com");
		expect(historyConnectionLabel({ kind: "page", host: "" }, "Current page")).toBe("Current page");
	});

	it("names an Environment connection by its Environment", () => {
		expect(historyConnectionLabel({ kind: "environment", environmentId: "env-dev" }, "Contoso Dev")).toBe("Contoso Dev");
	});
});

describe("outcomes", () => {
	it("counts the Records of the first page", () => {
		expect(recordsOutcome({ rows: [{}, {}], moreRecords: true })).toEqual({ kind: "records", count: 2, moreRecords: true });
	});

	it("keeps the error message", () => {
		expect(errorOutcome("Boom")).toEqual({ kind: "error", message: "Boom" });
	});
});
