export type PrivilegeDepth = "None" | "User" | "BusinessUnit" | "ParentChild" | "Organization";

export const PRIVILEGE_DEPTHS: readonly PrivilegeDepth[] = ["None", "User", "BusinessUnit", "ParentChild", "Organization"];

export type PrivilegeAccessType = "Create" | "Read" | "Write" | "Delete" | "Append" | "AppendTo" | "Assign" | "Share";

export const PRIVILEGE_ACCESS_TYPES: readonly PrivilegeAccessType[] = ["Create", "Read", "Write", "Delete", "Append", "AppendTo", "Assign", "Share"];

export interface ParsedPrivilege {
	accessType: PrivilegeAccessType;
	tableSchemaName: string;
}

export interface RolePrivilege {
	roleId: string;
	privilegeId: string;
	name: string;
	accessType: PrivilegeAccessType | null;
	tableSchemaName: string | null;
	depth: PrivilegeDepth;
}

export interface LogicalRole {
	id: string;
	name: string;
	businessUnitId: string | null;
	copies: number;
}

export interface PrivilegeDepthChange {
	roleId: string;
	roleName: string;
	privilegeId: string;
	privilegeName: string;
	tableSchemaName: string;
	accessType: PrivilegeAccessType;
	from: PrivilegeDepth;
	to: PrivilegeDepth;
}
