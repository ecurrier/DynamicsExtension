import { describe, expect, it } from "vitest";

import { resolveOrgOrigin } from "./url";

describe("resolveOrgOrigin", () => {
	it("prefers the client url and strips paths", () => {
		expect(resolveOrgOrigin("https://org.crm.dynamics.com/main.aspx?appid=1", "https://other.example/")).toBe("https://org.crm.dynamics.com");
	});

	it("falls back to the tab url and tolerates garbage", () => {
		expect(resolveOrgOrigin(null, "https://org.crm.dynamics.com/main.aspx")).toBe("https://org.crm.dynamics.com");
		expect(resolveOrgOrigin("not a url", undefined)).toBeNull();
	});
});
