import { type BusinessUnit, type RoleChangeSet, type SecurityRole, type SystemUser } from "@/shared/types";

import { roleDiff } from "./roleDiff";

export interface RolesViewModelInput {
	selectedUser: SystemUser | null;
	selectedBusinessUnitId: string | null;
	businessUnits: BusinessUnit[];
	allRoles: SecurityRole[];
	userRoles: SecurityRole[];
	staged: { key: string; roleIds: string[] } | null;
	requireRemovalConfirmation: boolean;
}

export interface RolesViewModel {
	businessUnitId: string | null;
	stagingKey: string;
	stagedMatchesSelection: boolean;
	roles: SecurityRole[];
	assignedIds: Set<string>;
	stagedIds: Set<string>;
	diff: { associate: string[]; disassociate: string[] };
	hasChanges: boolean;
	needsRemovalConfirmation: boolean;
	canApply: boolean;
	userRolesArgs: { systemUserId: string; businessUnitId: string };
	userRolesEnabled: boolean;
	changeSet: RoleChangeSet | null;
}

export const stagingKey = (userId: string | null | undefined, businessUnitId: string | null | undefined): string => `${userId ?? ""}:${businessUnitId ?? ""}`;

export const resolveBusinessUnitId = (selectedBusinessUnitId: string | null, businessUnits: BusinessUnit[]): string | null =>
	selectedBusinessUnitId ?? (businessUnits.length === 1 ? (businessUnits[0]?.id ?? null) : null);

export const rolesViewModel = ({
	selectedUser,
	selectedBusinessUnitId,
	businessUnits,
	allRoles,
	userRoles,
	staged,
	requireRemovalConfirmation,
}: RolesViewModelInput): RolesViewModel => {
	const businessUnitId = resolveBusinessUnitId(selectedBusinessUnitId, businessUnits);
	const key = stagingKey(selectedUser?.id, businessUnitId);
	const stagedMatchesSelection = staged?.key === key;
	const roles = allRoles.filter((role) => role.businessUnitId === businessUnitId);
	const assignedIds = new Set(userRoles.map((role) => role.id));
	const stagedIds = new Set(stagedMatchesSelection && staged ? staged.roleIds : [...assignedIds]);
	const diff = roleDiff([...assignedIds], [...stagedIds]);
	const hasChanges = diff.associate.length > 0 || diff.disassociate.length > 0;
	return {
		businessUnitId,
		stagingKey: key,
		stagedMatchesSelection,
		roles,
		assignedIds,
		stagedIds,
		diff,
		hasChanges,
		needsRemovalConfirmation: requireRemovalConfirmation && diff.disassociate.length > 0,
		canApply: !!selectedUser && hasChanges,
		userRolesArgs: { systemUserId: selectedUser?.id ?? "", businessUnitId: businessUnitId ?? "" },
		userRolesEnabled: !!selectedUser && !!businessUnitId,
		changeSet: selectedUser ? { systemUserId: selectedUser.id, associateRoleIds: diff.associate, disassociateRoleIds: diff.disassociate } : null,
	};
};
