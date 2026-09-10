import { type GlobalContextPort, type OrganizationInfo } from "@/page/xrm";
import { normalizeHttpsUrl } from "@/shared/lib";
import { type CloudType, type EnvironmentDetails } from "@/shared/types";

export const resolveCloudType = (organization: OrganizationInfo): CloudType => {
	if (!organization.isSovereignCloud) {
		return "Commercial";
	}
	return organization.organizationGeo === "USG" ? "GCCHigh" : "GCC";
};

export const buildEnvironmentDetails = (context: GlobalContextPort, powerPagesUrl: string | null): EnvironmentDetails => {
	const organization = context.organization();
	return {
		environmentName: organization.uniqueName,
		environmentId: organization.bapEnvironmentId ?? "",
		environmentType: resolveCloudType(organization),
		modelDrivenAppUrl: normalizeHttpsUrl(context.clientUrl()),
		powerPagesUrl,
		geographicalRegion: organization.organizationGeo,
		organizationId: organization.organizationId,
		tenantId: organization.organizationTenant,
		blockedAttachments: organization.blockedAttachments,
		baseCurrency: organization.baseCurrencyName,
	};
};
