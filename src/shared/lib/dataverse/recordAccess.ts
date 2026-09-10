import { type AccessPrivilege, type AccessRole, type AccessShare, type AccessTeam, type RecordAccessReport, type RecordAccessRequest } from "@/shared/types";

import { resolveEntityRef } from "./entityRef";
import { requireGuid } from "./guards";
import { type DataverseHttp } from "./http";
import { normalizeGuid } from "../guid";

const TEAM_TYPE_LABELS: Record<number, string> = {
	0: "Owner",
	1: "Access",
	2: "Microsoft Entra security group",
	3: "Microsoft Entra office group",
};

const ANNOTATED = { Prefer: 'odata.include-annotations="*"' };

interface PrincipalAccessResponse {
	AccessRights?: string | null;
}

interface UserRecord {
	fullname?: string | null;
	_businessunitid_value?: string | null;
	businessunitid?: { name?: string | null } | null;
}

interface RoleRecord {
	roleid: string;
	name?: string | null;
	businessunitid?: { name?: string | null } | null;
}

interface TeamRecord {
	teamid: string;
	name?: string | null;
	teamtype?: number | null;
	isdefault?: boolean | null;
}

interface RolePrivilegeRecord {
	PrivilegeName?: string | null;
	Depth?: string | null;
	BusinessUnitId?: string | null;
}

interface UserPrivilegesResponse {
	RolePrivileges?: RolePrivilegeRecord[] | null;
}

interface SharedPrincipalRecord {
	AccessMask?: string | null;
	Principal?: Record<string, unknown> | null;
}

interface SharedPrincipalsResponse {
	PrincipalAccesses?: SharedPrincipalRecord[] | null;
}

type OwnerRecord = Record<string, unknown>;

const describe = (reason: unknown): string => (reason instanceof Error ? reason.message : String(reason));

export const parseAccessRights = (value: string | null | undefined): string[] => {
	const rights = (value ?? "")
		.split(",")
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0 && entry !== "None");
	return [...new Set(rights)];
};

const privilegeMatchesEntity = (privilegeName: string, schemaName: string): boolean => privilegeName.toLowerCase().endsWith(schemaName.toLowerCase());

const stringValue = (record: OwnerRecord, key: string): string | null => {
	const value = record[key];
	return typeof value === "string" ? value : null;
};

const principalName = (principal: Record<string, unknown> | null | undefined): string => {
	if (!principal) {
		return "Unknown principal";
	}
	const name = principal.fullname ?? principal.name ?? principal.title;
	return typeof name === "string" ? name : "Unknown principal";
};

const principalId = (principal: Record<string, unknown> | null | undefined): string => {
	if (!principal) {
		return "";
	}
	for (const key of ["systemuserid", "teamid", "ownerid"]) {
		const value = principal[key];
		if (typeof value === "string") {
			return normalizeGuid(value);
		}
	}
	return "";
};

const principalType = (principal: Record<string, unknown> | null | undefined): string => {
	const type = principal?.["@odata.type"];
	if (typeof type === "string") {
		return type.replace("#Microsoft.Dynamics.CRM.", "");
	}
	return "principal";
};

export interface RecordAccessOperations {
	getRecordAccess: (request: RecordAccessRequest) => Promise<RecordAccessReport>;
}

export const recordAccessOperations = (http: DataverseHttp): RecordAccessOperations => ({
	getRecordAccess: async ({ entityLogicalName, recordId, systemUserId }) => {
		const entity = await resolveEntityRef(http, entityLogicalName);
		const record = requireGuid(recordId, "Record");
		const userId = requireGuid(systemUserId, "User");
		const target = encodeURIComponent(JSON.stringify({ "@odata.id": `${entity.entitySetName}(${record})` }));

		const accessPromise = http.get<PrincipalAccessResponse>(
			`systemusers(${userId})/Microsoft.Dynamics.CRM.RetrievePrincipalAccess(Target=@t)?@t=${target}`
		);
		const userPromise = http.get<UserRecord>(`systemusers(${userId})?$select=fullname,_businessunitid_value&$expand=businessunitid($select=name)`);
		const rolesPromise = http.get<{ value?: RoleRecord[] }>(
			`systemusers(${userId})/systemuserroles_association?$select=roleid,name&$expand=businessunitid($select=name)`
		);
		const teamsPromise = http.get<{ value?: TeamRecord[] }>(`systemusers(${userId})/teammembership_association?$select=teamid,name,teamtype,isdefault`);
		const privilegesPromise = http.get<UserPrivilegesResponse>(`systemusers(${userId})/Microsoft.Dynamics.CRM.RetrieveUserPrivileges`).then(
			(response) => ({ rows: response?.RolePrivileges ?? [], error: null as string | null }),
			(reason: unknown) => ({ rows: [] as RolePrivilegeRecord[], error: describe(reason) })
		);
		const sharesPromise = http
			.get<SharedPrincipalsResponse>(`${entity.entitySetName}(${record})/Microsoft.Dynamics.CRM.RetrieveSharedPrincipalsAndAccess()`)
			.then(
				(response) => ({ rows: response?.PrincipalAccesses ?? [], error: null as string | null }),
				(reason: unknown) => ({ rows: [] as SharedPrincipalRecord[], error: describe(reason) })
			);
		const ownerPromise = http
			.request<OwnerRecord>("GET", `${entity.entitySetName}(${record})?$select=_ownerid_value,_owningbusinessunit_value`, undefined, ANNOTATED)
			.catch(() => null);

		const [access, user, roles, teams, privileges, shares, owner] = await Promise.all([
			accessPromise,
			userPromise,
			rolesPromise,
			teamsPromise,
			privilegesPromise,
			sharesPromise,
			ownerPromise,
		]);

		const teamRows = teams?.value ?? [];
		const teamRoles = await Promise.all(
			teamRows.map((team) =>
				http.get<{ value?: RoleRecord[] }>(`teams(${normalizeGuid(team.teamid)})/teamroles_association?$select=roleid,name`).then(
					(response) => ({ team, rows: response?.value ?? [] }),
					() => ({ team, rows: [] as RoleRecord[] })
				)
			)
		);

		const directRoles = (roles?.value ?? []).map<AccessRole>((role) => ({
			id: normalizeGuid(role.roleid),
			name: role.name ?? "",
			businessUnitName: role.businessunitid?.name ?? null,
			viaTeam: null,
		}));
		const inheritedRoles = teamRoles.flatMap(({ team, rows }) =>
			rows.map<AccessRole>((role) => ({
				id: normalizeGuid(role.roleid),
				name: role.name ?? "",
				businessUnitName: null,
				viaTeam: team.name ?? "Team",
			}))
		);

		const ownerId = owner ? stringValue(owner, "_ownerid_value") : null;

		return {
			entityLogicalName: entity.logicalName,
			recordId: record,
			systemUserId: userId,
			userName: user?.fullname ?? "Unknown user",
			userBusinessUnitName: user?.businessunitid?.name ?? null,
			rights: parseAccessRights(access?.AccessRights),
			ownerId: ownerId ? normalizeGuid(ownerId) : null,
			ownerName: owner ? stringValue(owner, "_ownerid_value@OData.Community.Display.V1.FormattedValue") : null,
			ownerType: owner ? stringValue(owner, "_ownerid_value@Microsoft.Dynamics.CRM.lookuplogicalname") : null,
			ownerIsCurrentUser: !!ownerId && normalizeGuid(ownerId) === userId,
			recordBusinessUnitName: owner ? stringValue(owner, "_owningbusinessunit_value@OData.Community.Display.V1.FormattedValue") : null,
			roles: [...directRoles, ...inheritedRoles],
			teams: teamRows.map<AccessTeam>((team) => ({
				id: normalizeGuid(team.teamid),
				name: team.name ?? "",
				teamTypeLabel: TEAM_TYPE_LABELS[team.teamtype ?? -1] ?? "Team",
				isDefault: team.isdefault === true,
			})),
			privileges: privileges.rows
				.filter((privilege) => !!privilege.PrivilegeName && privilegeMatchesEntity(privilege.PrivilegeName, entity.schemaName))
				.map<AccessPrivilege>((privilege) => ({
					name: privilege.PrivilegeName ?? "",
					depthLabel: privilege.Depth ?? "Unknown",
					inheritedFromTeam: false,
				}))
				.sort((left, right) => left.name.localeCompare(right.name)),
			shares: shares.rows.map<AccessShare>((share) => ({
				principalId: principalId(share.Principal),
				principalName: principalName(share.Principal),
				principalType: principalType(share.Principal),
				rights: parseAccessRights(share.AccessMask),
			})),
			sharesUnavailable: shares.error,
			privilegesUnavailable: privileges.error,
		};
	},
});
