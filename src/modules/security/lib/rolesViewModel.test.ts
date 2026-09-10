import { describe, expect, it } from "vitest";

import { type BusinessUnit, type SecurityRole, type SystemUser } from "@/shared/types";

import { rolesViewModel, type RolesViewModelInput, stagingKey } from "./rolesViewModel";

const USER: SystemUser = {
	id: "user-1",
	fullName: "Jane",
	azureAdObjectId: null,
	domainName: null,
	isDisabled: false,
};
const UNIT: BusinessUnit = { id: "bu-1", name: "Contoso" };
const OTHER_UNIT: BusinessUnit = { id: "bu-2", name: "Fabrikam" };

const role = (id: string, businessUnitId: string | null = UNIT.id): SecurityRole => ({
	id,
	name: id.toUpperCase(),
	businessUnitId,
});

const input = (overrides: Partial<RolesViewModelInput> = {}): RolesViewModelInput => ({
	selectedUser: USER,
	selectedBusinessUnitId: UNIT.id,
	businessUnits: [UNIT],
	allRoles: [role("a"), role("b"), role("c", OTHER_UNIT.id)],
	userRoles: [role("a")],
	staged: null,
	requireRemovalConfirmation: true,
	...overrides,
});

describe("business unit resolution", () => {
	it("falls back to the only business unit when none is selected", () => {
		expect(rolesViewModel(input({ selectedBusinessUnitId: null })).businessUnitId).toBe(UNIT.id);
	});

	it("does not guess when several business units exist", () => {
		const model = rolesViewModel(input({ selectedBusinessUnitId: null, businessUnits: [UNIT, OTHER_UNIT] }));
		expect(model.businessUnitId).toBeNull();
		expect(model.userRolesEnabled).toBe(false);
	});

	it("only offers roles belonging to the resolved business unit", () => {
		expect(rolesViewModel(input()).roles.map((entry) => entry.id)).toEqual(["a", "b"]);
	});
});

describe("staging key fallback", () => {
	it("uses staged roles when the staging key matches the selection", () => {
		const model = rolesViewModel(input({ staged: { key: stagingKey(USER.id, UNIT.id), roleIds: ["a", "b"] } }));
		expect(model.stagedMatchesSelection).toBe(true);
		expect([...model.stagedIds]).toEqual(["a", "b"]);
		expect(model.diff).toEqual({ associate: ["b"], disassociate: [] });
	});

	it("silently discards staged roles captured against a different user", () => {
		const model = rolesViewModel(input({ staged: { key: stagingKey("someone-else", UNIT.id), roleIds: ["a", "b"] } }));
		expect(model.stagedMatchesSelection).toBe(false);
		expect([...model.stagedIds]).toEqual(["a"]);
		expect(model.hasChanges).toBe(false);
	});

	it("silently discards staged roles captured against a different business unit", () => {
		const model = rolesViewModel(input({ staged: { key: stagingKey(USER.id, OTHER_UNIT.id), roleIds: [] } }));
		expect(model.stagedMatchesSelection).toBe(false);
		expect(model.hasChanges).toBe(false);
	});
});

describe("removal confirmation gate", () => {
	it("requires confirmation when a role is being removed", () => {
		const model = rolesViewModel(input({ staged: { key: stagingKey(USER.id, UNIT.id), roleIds: [] } }));
		expect(model.diff).toEqual({ associate: [], disassociate: ["a"] });
		expect(model.needsRemovalConfirmation).toBe(true);
	});

	it("does not require confirmation for additions alone", () => {
		const model = rolesViewModel(input({ staged: { key: stagingKey(USER.id, UNIT.id), roleIds: ["a", "b"] } }));
		expect(model.needsRemovalConfirmation).toBe(false);
	});

	it("honours the setting being turned off", () => {
		const model = rolesViewModel(input({ staged: { key: stagingKey(USER.id, UNIT.id), roleIds: [] }, requireRemovalConfirmation: false }));
		expect(model.diff.disassociate).toEqual(["a"]);
		expect(model.needsRemovalConfirmation).toBe(false);
	});
});

describe("apply guard", () => {
	it("cannot apply without a selected user", () => {
		const model = rolesViewModel(input({ selectedUser: null }));
		expect(model.canApply).toBe(false);
		expect(model.changeSet).toBeNull();
	});

	it("cannot apply when nothing changed", () => {
		expect(rolesViewModel(input()).canApply).toBe(false);
	});

	it("builds a change set addressed to the selected user", () => {
		const model = rolesViewModel(input({ staged: { key: stagingKey(USER.id, UNIT.id), roleIds: ["b"] } }));
		expect(model.canApply).toBe(true);
		expect(model.changeSet).toEqual({
			systemUserId: USER.id,
			associateRoleIds: ["b"],
			disassociateRoleIds: ["a"],
		});
	});

	it("sends an empty user id to the roles query when no user is selected", () => {
		expect(rolesViewModel(input({ selectedUser: null })).userRolesArgs.systemUserId).toBe("");
	});
});
