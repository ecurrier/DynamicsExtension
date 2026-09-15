import { describe, expect, it } from "vitest";

import { adminCenterUrl, controlEditorUrl, makerPortalUrl, recordUrl, webResourceUrl } from "./cloudUrls";

describe("cloudUrls", () => {
	it("builds maker portal urls per cloud", () => {
		expect(makerPortalUrl("Commercial")).toBe("https://make.powerapps.com/");
		expect(makerPortalUrl("GCC", "env-1")).toBe("https://make.gov.powerapps.us/environments/env-1");
		expect(makerPortalUrl("GCCHigh", "env-1")).toBe("https://make.high.powerapps.us/environments/env-1");
		expect(makerPortalUrl("DOD")).toBe("https://make.apps.appsplatform.us/");
		expect(makerPortalUrl(null, "x")).toBe("https://make.powerapps.com/environments/x");
	});

	it("builds admin center urls per cloud", () => {
		expect(adminCenterUrl("Commercial", "env-1")).toBe("https://admin.powerplatform.microsoft.com/environments/environment/env-1/hub");
		expect(adminCenterUrl("GCC")).toBe("https://gcc.admin.powerplatform.microsoft.us/");
		expect(adminCenterUrl("GCCHigh")).toBe("https://high.admin.powerplatform.microsoft.us/");
		expect(adminCenterUrl("DOD", "e")).toBe("https://admin.appsplatform.us/environments/environment/e/hub");
	});

	it("builds control editor and record urls", () => {
		expect(controlEditorUrl("Commercial", "env", "sol", { entityName: "account", controlType: "form/edit", id: "form-id" })).toBe(
			"https://make.powerapps.com/e/env/s/sol/entity/account/form/edit/form-id"
		);
		expect(recordUrl("https://org.crm.dynamics.com/main.aspx?appid=1", "contact", "abc")).toBe(
			"https://org.crm.dynamics.com/main.aspx?appid=1&pagetype=entityrecord&etn=contact&id=abc"
		);
	});
});

describe("webResourceUrl", () => {
	it("builds a maker link to a web resource inside a solution", () => {
		expect(webResourceUrl("Commercial", "env", "sol", "wr-1")).toBe("https://make.powerapps.com/e/env/s/sol/webresource/wr-1");
	});

	it("follows the sovereign cloud the environment is in", () => {
		expect(webResourceUrl("GCCHigh", "env", "sol", "wr-1")).toBe("https://make.high.powerapps.us/e/env/s/sol/webresource/wr-1");
	});
});
