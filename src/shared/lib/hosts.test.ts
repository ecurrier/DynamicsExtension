import { describe, expect, it } from "vitest";

import { isOrgUrl, ORG_HOST_PATTERNS } from "./hosts";

describe("ORG_HOST_PATTERNS", () => {
	it("matches the host permissions in the manifest", () => {
		expect(ORG_HOST_PATTERNS).toEqual(["https://*.dynamics.com/*", "https://*.microsoftdynamics.us/*", "https://*.appsplatform.us/*"]);
	});
});

describe("isOrgUrl", () => {
	it("accepts commercial and sovereign cloud org urls", () => {
		expect(isOrgUrl("https://contoso.crm.dynamics.com/main.aspx?etn=account")).toBe(true);
		expect(isOrgUrl("https://contoso.crm.microsoftdynamics.us/main.aspx")).toBe(true);
		expect(isOrgUrl("https://contoso.crm.appsplatform.us/main.aspx")).toBe(true);
	});

	it("rejects other sites", () => {
		expect(isOrgUrl("https://make.powerapps.com/environments/1")).toBe(false);
		expect(isOrgUrl("https://example.com/dynamics.com")).toBe(false);
	});

	it("rejects a look-alike host that only contains the suffix", () => {
		expect(isOrgUrl("https://dynamics.com.evil.example/main.aspx")).toBe(false);
	});

	it("rejects anything that is not https", () => {
		expect(isOrgUrl("http://contoso.crm.dynamics.com/main.aspx")).toBe(false);
		expect(isOrgUrl("chrome-extension://abc/sidepanel.html")).toBe(false);
	});

	it("rejects nothing, empty, and unparseable urls", () => {
		expect(isOrgUrl(null)).toBe(false);
		expect(isOrgUrl(undefined)).toBe(false);
		expect(isOrgUrl("")).toBe(false);
		expect(isOrgUrl("not a url")).toBe(false);
	});
});
