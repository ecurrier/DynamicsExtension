import { describe, expect, it } from "vitest";

import { buildImpersonationRule, impersonationHeaderFor } from "./impersonationRule";

describe("impersonation rules", () => {
	it("prefers the Entra object id and falls back to the system user id", () => {
		expect(impersonationHeaderFor({ id: "user-1", fullName: "Jane", azureAdObjectId: "aad-1" })).toEqual({
			header: "CallerObjectId",
			value: "aad-1",
		});
		expect(impersonationHeaderFor({ id: "user-1", fullName: "Jane", azureAdObjectId: null })).toEqual({
			header: "MSCRMCallerID",
			value: "user-1",
		});
	});

	it("scopes the header rule to the tab and the org Web API", () => {
		expect(buildImpersonationRule(42, "https://org.crm.dynamics.com", { header: "CallerObjectId", value: "aad-1" })).toEqual({
			id: 42,
			priority: 1,
			action: {
				type: "modifyHeaders",
				requestHeaders: [{ header: "CallerObjectId", operation: "set", value: "aad-1" }],
			},
			condition: {
				tabIds: [42],
				urlFilter: "https://org.crm.dynamics.com/api/data/v*",
				resourceTypes: ["xmlhttprequest", "main_frame", "sub_frame"],
			},
		});
	});
});
