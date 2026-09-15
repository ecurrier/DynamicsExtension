import { type BulkRunPlan, type LogicalRole, type SystemUser } from "@/shared/types";

export type RoleDirection = "add" | "remove";

export interface BulkUserChange {
	systemUserId: string;
	roleId: string;
	direction: RoleDirection;
}

export const bulkUserPlan = (users: SystemUser[], roles: LogicalRole[], direction: RoleDirection): BulkRunPlan<BulkUserChange> => ({
	title: direction === "add" ? "Add roles to users" : "Remove roles from users",
	action: direction === "add" ? "Add to" : "Remove from",
	items: users.flatMap((user) =>
		roles.map((role) => ({
			id: `${user.id}:${role.id}`,
			label: user.fullName || user.domainName || user.id,
			detail: direction === "add" ? `Add ${role.name}` : `Remove ${role.name}`,
			args: { systemUserId: user.id, roleId: role.id, direction },
		}))
	),
});

export const bulkUserSummary = (users: SystemUser[], roles: LogicalRole[], direction: RoleDirection): string => {
	if (users.length === 0 || roles.length === 0) {
		return "Pick at least one user and one role.";
	}
	const userPart = users.length === 1 ? "1 user" : `${users.length} users`;
	const rolePart = roles.length === 1 ? "1 role" : `${roles.length} roles`;
	const total = users.length * roles.length;
	const verb = direction === "add" ? "granted to" : "removed from";
	return `${rolePart} ${verb} ${userPart}, ${total === 1 ? "1 change" : `${total} changes`} in all.`;
};

export const disabledUsers = (users: SystemUser[]): SystemUser[] => users.filter((user) => user.isDisabled);
