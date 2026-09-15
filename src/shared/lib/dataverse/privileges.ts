import { type LogicalRole, type ParsedPrivilege, type PrivilegeAccessType, type PrivilegeDepth, type RolePrivilege, type SecurityRole } from "@/shared/types";

import { fetchXmlPath, type DataverseHttp } from "./http";
import { normalizeGuid } from "../guid";

const PRIVILEGE_PREFIX = "prv";

const ACCESS_TYPES_LONGEST_FIRST: PrivilegeAccessType[] = ["AppendTo", "Append", "Assign", "Create", "Delete", "Read", "Share", "Write"];

const DEPTH_BY_MASK: Record<number, PrivilegeDepth> = { 0: "None", 1: "User", 2: "BusinessUnit", 4: "ParentChild", 8: "Organization" };

export const MASK_BY_DEPTH: Record<PrivilegeDepth, number> = { None: 0, User: 1, BusinessUnit: 2, ParentChild: 4, Organization: 8 };

export const depthFromMask = (mask: number | null | undefined): PrivilegeDepth => DEPTH_BY_MASK[mask ?? 0] ?? "None";

export const parsePrivilegeName = (name: string): ParsedPrivilege | null => {
	if (!name.startsWith(PRIVILEGE_PREFIX)) {
		return null;
	}
	const rest = name.slice(PRIVILEGE_PREFIX.length);
	const accessType = ACCESS_TYPES_LONGEST_FIRST.find((candidate) => rest.startsWith(candidate) && rest.length > candidate.length);
	return accessType ? { accessType, tableSchemaName: rest.slice(accessType.length) } : null;
};

export const privilegeMatchesTable = (privilegeName: string, tableSchemaName: string): boolean =>
	privilegeName.toLowerCase().endsWith(tableSchemaName.toLowerCase());

export const dedupeLogicalRoles = (roles: (SecurityRole & { parentRootRoleId?: string | null })[]): LogicalRole[] => {
	const groups = new Map<string, { role: SecurityRole; isRoot: boolean; copies: number }>();
	for (const role of roles) {
		const rootId = role.parentRootRoleId ? normalizeGuid(role.parentRootRoleId) : role.id;
		const isRoot = rootId === role.id;
		const existing = groups.get(rootId);
		if (!existing) {
			groups.set(rootId, { role, isRoot, copies: 1 });
			continue;
		}
		existing.copies += 1;
		if (isRoot && !existing.isRoot) {
			existing.role = role;
			existing.isRoot = true;
		}
	}
	return [...groups.entries()]
		.map(([rootId, entry]) => ({
			id: entry.isRoot ? rootId : entry.role.id,
			name: entry.role.name,
			businessUnitId: entry.role.businessUnitId,
			copies: entry.copies,
		}))
		.sort((left, right) => left.name.localeCompare(right.name));
};

const rolePrivilegeFetchXml = (roleIds: string[]): string => `
  <fetch>
    <entity name="privilege">
      <attribute name="privilegeid" />
      <attribute name="name" />
      <order attribute="name" descending="false" />
      <link-entity name="roleprivileges" from="privilegeid" to="privilegeid" intersect="true" alias="rp">
        <attribute name="privilegedepthmask" />
        <attribute name="roleid" />
        <filter type="and">
          <condition attribute="roleid" operator="in">
            ${roleIds.map((id) => `<value>${id}</value>`).join("")}
          </condition>
        </filter>
      </link-entity>
    </entity>
  </fetch>`;

interface RolePrivilegeRecord {
	privilegeid: string;
	name: string;
	"rp.privilegedepthmask"?: number | null;
	"rp.roleid"?: string | null;
}

export const toRolePrivilege = (record: RolePrivilegeRecord): RolePrivilege => {
	const parsed = parsePrivilegeName(record.name);
	return {
		roleId: record["rp.roleid"] ? normalizeGuid(record["rp.roleid"]) : "",
		privilegeId: normalizeGuid(record.privilegeid),
		name: record.name,
		accessType: parsed?.accessType ?? null,
		tableSchemaName: parsed?.tableSchemaName ?? null,
		depth: depthFromMask(record["rp.privilegedepthmask"]),
	};
};

export interface PrivilegeOperations {
	getRolePrivileges: (args: { roleIds: string[] }) => Promise<RolePrivilege[]>;
	addPrivilegesRole: (args: { roleId: string; privileges: { privilegeId: string; depth: PrivilegeDepth }[] }) => Promise<void>;
}

export const privilegeOperations = (http: DataverseHttp): PrivilegeOperations => ({
	getRolePrivileges: async ({ roleIds }) => {
		const ids = [...new Set(roleIds.map((id) => normalizeGuid(id)).filter((id) => id !== ""))];
		if (ids.length === 0) {
			return [];
		}
		const response = await http.get<{ value?: RolePrivilegeRecord[] }>(fetchXmlPath("privileges", rolePrivilegeFetchXml(ids)));
		return (response?.value ?? []).map(toRolePrivilege);
	},
	addPrivilegesRole: async ({ roleId, privileges }) => {
		if (privileges.length === 0) {
			return;
		}
		await http.post(`roles(${normalizeGuid(roleId)})/Microsoft.Dynamics.CRM.AddPrivilegesRole`, {
			Privileges: privileges.map((privilege) => ({
				"PrivilegeId@odata.type": "Edm.Guid",
				PrivilegeId: normalizeGuid(privilege.privilegeId),
				Depth: MASK_BY_DEPTH[privilege.depth],
			})),
		});
	},
});
