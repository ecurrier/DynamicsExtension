import { type ConnectionTarget, defineGateway, useGateway } from "@/shared/connections";
import { securityOperations } from "@/shared/lib";

export const securityGateway = defineGateway({
	namespace: "security",
	operations: ["getSecurityRoles", "getBusinessUnits", "searchSystemUsers", "getUserSecurityRoles", "getSystemUserRoles", "applySecurityRoleChanges"],
	pageOnly: ["getCurrentUser"],
	factory: securityOperations,
	timeouts: { applySecurityRoleChanges: 120_000 },
});

export const useSecurityGateway = (connection: ConnectionTarget) => useGateway(securityGateway, connection);
