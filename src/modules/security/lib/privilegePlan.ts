import { type BulkRunPlan, type LogicalRole, type PrivilegeDepth, type RolePrivilege } from "@/shared/types";

export interface PrivilegeCell {
	id: string;
	roleId: string;
	roleName: string;
	privilegeId: string;
	privilegeName: string;
	tableSchemaName: string;
	accessType: string;
	depth: PrivilegeDepth;
}

export interface PrivilegeChangeArgs {
	roleId: string;
	privilegeId: string;
	depth: PrivilegeDepth;
}

export const privilegeCells = (roles: LogicalRole[], privileges: RolePrivilege[], tables: string[]): PrivilegeCell[] => {
	const names = new Map(roles.map((role) => [role.id, role.name]));
	const wanted = new Set(tables);
	return privileges
		.filter(
			(privilege) => privilege.tableSchemaName !== null && privilege.accessType !== null && (wanted.size === 0 || wanted.has(privilege.tableSchemaName))
		)
		.map((privilege) => ({
			id: `${privilege.roleId}:${privilege.privilegeId}`,
			roleId: privilege.roleId,
			roleName: names.get(privilege.roleId) ?? privilege.roleId,
			privilegeId: privilege.privilegeId,
			privilegeName: privilege.name,
			tableSchemaName: privilege.tableSchemaName!,
			accessType: privilege.accessType!,
			depth: privilege.depth,
		}))
		.sort((left, right) =>
			left.roleName === right.roleName
				? left.tableSchemaName === right.tableSchemaName
					? left.accessType.localeCompare(right.accessType)
					: left.tableSchemaName.localeCompare(right.tableSchemaName)
				: left.roleName.localeCompare(right.roleName)
		);
};

export const depthFilter = (cells: PrivilegeCell[], depths: PrivilegeDepth[]): PrivilegeCell[] =>
	depths.length === 0 ? cells : cells.filter((cell) => depths.includes(cell.depth));

export const privilegeDepthPlan = (cells: PrivilegeCell[], target: PrivilegeDepth): BulkRunPlan<PrivilegeChangeArgs> => ({
	title: `Set privilege depth to ${target}`,
	action: "Change",
	items: cells
		.filter((cell) => cell.depth !== target)
		.map((cell) => ({
			id: cell.id,
			label: `${cell.roleName} · ${cell.tableSchemaName}`,
			detail: `${cell.accessType}: ${cell.depth} to ${target}`,
			args: { roleId: cell.roleId, privilegeId: cell.privilegeId, depth: target },
		})),
});

export const privilegePlanSummary = (cells: PrivilegeCell[], target: PrivilegeDepth): string => {
	const changing = cells.filter((cell) => cell.depth !== target).length;
	const already = cells.length - changing;
	if (cells.length === 0) {
		return "Select privileges to change.";
	}
	const head = changing === 1 ? "1 privilege will change" : `${changing} privileges will change`;
	return already === 0 ? `${head}.` : `${head}; ${already} already at ${target} and will be left alone.`;
};
