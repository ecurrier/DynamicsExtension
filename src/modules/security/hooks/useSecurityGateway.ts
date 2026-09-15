import { type ConnectionTarget, defineGateway, useGateway } from "@/shared/connections";
import { securityOperations } from "@/shared/lib";

export const securityGateway = defineGateway({
	namespace: "security",
	operations: [
		"getSecurityRoles",
		"getBusinessUnits",
		"searchSystemUsers",
		"listSystemUsers",
		"getUserSecurityRoles",
		"getSystemUserRoles",
		"getRolePrivileges",
		"addPrivilegesRole",
		"applySecurityRoleChanges",
	],
	pageOnly: ["getCurrentUser"],
	factory: securityOperations,
	timeouts: { applySecurityRoleChanges: 120_000, addPrivilegesRole: 120_000 },
});

export const useSecurityGateway = (connection: ConnectionTarget) => useGateway(securityGateway, connection);
