import { type LogicalRole, type PrivilegeDepth, type RolePrivilege } from "@/shared/types";

export interface RoleCompareRow {
	id: string;
	tableSchemaName: string;
	accessType: string;
	depths: Record<string, PrivilegeDepth>;
}

export const compareRoleMatrix = (roles: LogicalRole[], privileges: RolePrivilege[]): RoleCompareRow[] => {
	const rows = new Map<string, RoleCompareRow>();
	for (const privilege of privileges) {
		if (!privilege.tableSchemaName || !privilege.accessType) {
			continue;
		}
		const id = `${privilege.tableSchemaName}:${privilege.accessType}`;
		const row = rows.get(id) ?? { id, tableSchemaName: privilege.tableSchemaName, accessType: privilege.accessType, depths: {} };
		row.depths[privilege.roleId] = privilege.depth;
		rows.set(id, row);
	}
	for (const row of rows.values()) {
		for (const role of roles) {
			row.depths[role.id] = row.depths[role.id] ?? "None";
		}
	}
	return [...rows.values()].sort((left, right) =>
		left.tableSchemaName === right.tableSchemaName
			? left.accessType.localeCompare(right.accessType)
			: left.tableSchemaName.localeCompare(right.tableSchemaName)
	);
};

export const differingRows = (rows: RoleCompareRow[], roles: LogicalRole[]): RoleCompareRow[] =>
	rows.filter((row) => new Set(roles.map((role) => row.depths[role.id] ?? "None")).size > 1);

export const roleCompareToText = (rows: RoleCompareRow[], roles: LogicalRole[]): string =>
	[
		["Table", "Privilege", ...roles.map((role) => role.name)].join("\t"),
		...rows.map((row) => [row.tableSchemaName, row.accessType, ...roles.map((role) => row.depths[role.id] ?? "None")].join("\t")),
	].join("\n");
