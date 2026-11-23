import { describe, expect, it, vi } from "vitest";

import { createGateway } from "@/shared/connections";
import { type Environment } from "@/shared/storage";
import { createFakeHttp } from "@/test/fakeHttp";

import { queryGateway } from "./useQueryGateway";

const fake = vi.hoisted(() => ({ http: null as unknown }));

const mocks = vi.hoisted(() => ({
	invoke: vi.fn(async () => ({ rows: [], moreRecords: false })),
	getEnvironmentHttp: vi.fn(async () => fake.http),
}));

vi.mock("@/messaging/client", async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	invoke: mocks.invoke,
}));

vi.mock("@/shared/connections/environmentHttp", () => ({ getEnvironmentHttp: mocks.getEnvironmentHttp }));

const environment: Environment = {
	id: "env-1",
	name: "Dev",
	environmentType: "Commercial",
	modelDrivenAppUrl: "https://org.crm.dynamics.com/",
	powerPagesUrl: "",
	environmentId: "",
	notes: "",
	servicePrincipalId: null,
	alert: null,
};

const REQUEST = { entitySetName: "accounts", fetchXml: '<fetch page="1" count="50"><entity name="account" /></fetch>' };

describe("queryGateway", () => {
	it("sends every operation to the page as a query command", async () => {
		const gateway = createGateway(queryGateway, { kind: "page", tabId: 4, ready: true });
		await gateway.ops.runQuery(REQUEST);
		await gateway.ops.getTable({ logicalName: "account" });
		await gateway.ops.listTables();
		await gateway.ops.listViews({ logicalName: "account" });
		expect(mocks.invoke).toHaveBeenNthCalledWith(1, 4, "query.runQuery", REQUEST, { timeoutMs: 120_000 });
		expect(mocks.invoke).toHaveBeenNthCalledWith(2, 4, "query.getTable", { logicalName: "account" }, { timeoutMs: 90_000 });
		expect(mocks.invoke).toHaveBeenNthCalledWith(3, 4, "query.listTables", undefined, { timeoutMs: 90_000 });
		expect(mocks.invoke).toHaveBeenNthCalledWith(4, 4, "query.listViews", { logicalName: "account" }, { timeoutMs: 90_000 });
	});

	it("lists views over the Environment's own http", async () => {
		const { http, calls } = createFakeHttp({
			"savedqueries?": {
				value: [{ savedqueryid: "aaaaaaaa-0000-0000-0000-000000000001", name: "Active Accounts", fetchxml: "<fetch />", querytype: 0 }],
			},
			"userqueries?": { value: [] },
		});
		fake.http = http;
		const gateway = createGateway(queryGateway, { kind: "environment", environment });
		await expect(gateway.ops.listViews({ logicalName: "account" })).resolves.toMatchObject({
			views: [{ name: "Active Accounts", kind: "system" }],
			personalViewsUnavailable: null,
		});
		expect(mocks.getEnvironmentHttp).toHaveBeenCalledWith(environment, { timeoutMs: 90_000 });
		expect(calls.map((call) => call.path.split("?")[0])).toEqual(["savedqueries", "userqueries"]);
	});

	it("runs the operations over the Environment's own http", async () => {
		const { http, calls } = createFakeHttp({
			"accounts?fetchXml=": { "@Microsoft.Dynamics.CRM.morerecords": true, value: [{ name: "A" }] },
		});
		fake.http = http;
		const gateway = createGateway(queryGateway, { kind: "environment", environment });
		await expect(gateway.ops.runQuery(REQUEST)).resolves.toMatchObject({ rows: [{ name: "A" }], moreRecords: true });
		expect(mocks.getEnvironmentHttp).toHaveBeenCalledWith(environment, { timeoutMs: 120_000 });
		expect(calls[0]?.headers).toEqual({ Prefer: 'odata.include-annotations="*"' });
		expect(gateway.key("runQuery", REQUEST)).toEqual(["connection", "env-1", "query.runQuery", REQUEST]);
	});
});
