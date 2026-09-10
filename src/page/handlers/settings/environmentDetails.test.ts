import { describe, expect, it } from "vitest";

import { type GlobalContextPort, type OrganizationInfo } from "@/page/xrm";

import { buildEnvironmentDetails, resolveCloudType } from "./environmentDetails";

const organization = (overrides: Partial<OrganizationInfo> = {}): OrganizationInfo => ({
	uniqueName: "contoso",
	bapEnvironmentId: "bap-1",
	isSovereignCloud: false,
	organizationGeo: "EMEA",
	organizationId: "org-1",
	organizationTenant: "tenant-1",
	blockedAttachments: "exe;bat",
	baseCurrencyName: "Euro",
	...overrides,
});

const context = (info: OrganizationInfo, clientUrl = "https://contoso.crm.dynamics.com"): GlobalContextPort => ({
	clientUrl: () => clientUrl,
	organization: () => info,
});

describe("resolveCloudType", () => {
	it("treats a non-sovereign organization as commercial regardless of geography", () => {
		expect(resolveCloudType(organization({ isSovereignCloud: false, organizationGeo: "USG" }))).toBe("Commercial");
	});

	it("separates GCC High from GCC by geography", () => {
		expect(resolveCloudType(organization({ isSovereignCloud: true, organizationGeo: "USG" }))).toBe("GCCHigh");
		expect(resolveCloudType(organization({ isSovereignCloud: true, organizationGeo: "USL" }))).toBe("GCC");
	});
});

describe("buildEnvironmentDetails", () => {
	it("maps organization settings onto environment details", () => {
		const details = buildEnvironmentDetails(context(organization()), "https://portal.example.com");
		expect(details).toMatchObject({
			environmentName: "contoso",
			environmentId: "bap-1",
			environmentType: "Commercial",
			powerPagesUrl: "https://portal.example.com",
			geographicalRegion: "EMEA",
			tenantId: "tenant-1",
			blockedAttachments: "exe;bat",
			baseCurrency: "Euro",
		});
	});

	it("falls back to an empty environment id when the organization has no BAP id", () => {
		const details = buildEnvironmentDetails(context(organization({ bapEnvironmentId: null })), null);
		expect(details.environmentId).toBe("");
		expect(details.powerPagesUrl).toBeNull();
	});
});
