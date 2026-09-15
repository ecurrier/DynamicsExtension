import { describe, expect, it } from "vitest";

import { type SecurityRole } from "@/shared/types";
import { createFakeHttp } from "@/test/fakeHttp";

import { dedupeLogicalRoles, depthFromMask, parsePrivilegeName, privilegeOperations, toRolePrivilege } from "./privileges";

const role = (id: string, name: string, businessUnitId: string | null, parentRootRoleId: string | null = null): SecurityRole => ({
	id,
	name,
	businessUnitId,
	parentRootRoleId,
});

describe("parsePrivilegeName", () => {
	it("splits the access type from the table", () => {
		expect(parsePrivilegeName("prvCreateAccount")).toEqual({ accessType: "Create", tableSchemaName: "Account" });
		expect(parsePrivilegeName("prvReadContact")).toEqual({ accessType: "Read", tableSchemaName: "Contact" });
	});

	it("prefers AppendTo over Append, which is a prefix of it", () => {
		expect(parsePrivilegeName("prvAppendToAccount")).toEqual({ accessType: "AppendTo", tableSchemaName: "Account" });
		expect(parsePrivilegeName("prvAppendAccount")).toEqual({ accessType: "Append", tableSchemaName: "Account" });
	});

	it("returns null for privileges that are not table privileges", () => {
		expect(parsePrivilegeName("prvActOnBehalfOfAnotherUser")).toBeNull();
		expect(parsePrivilegeName("someOtherName")).toBeNull();
	});

	it("returns null when there is no table left after the access type", () => {
		expect(parsePrivilegeName("prvRead")).toBeNull();
	});
});

describe("depthFromMask", () => {
	it("maps the platform masks onto depths", () => {
		expect(depthFromMask(0)).toBe("None");
		expect(depthFromMask(1)).toBe("User");
		expect(depthFromMask(2)).toBe("BusinessUnit");
		expect(depthFromMask(4)).toBe("ParentChild");
		expect(depthFromMask(8)).toBe("Organization");
	});

	it("treats an absent or unknown mask as no access", () => {
		expect(depthFromMask(null)).toBe("None");
		expect(depthFromMask(undefined)).toBe("None");
		expect(depthFromMask(3)).toBe("None");
	});
});

describe("dedupeLogicalRoles", () => {
	it("collapses business unit copies onto the root role and counts them", () => {
		const roles = [role("r1", "Salesperson", "bu-root", "r1"), role("r2", "Salesperson", "bu-child", "r1"), role("r3", "Salesperson", "bu-other", "r1")];
		expect(dedupeLogicalRoles(roles)).toEqual([{ id: "r1", name: "Salesperson", businessUnitId: "bu-root", copies: 3 }]);
	});

	it("keeps the root copy even when a child copy is seen first", () => {
		const roles = [role("r2", "Salesperson", "bu-child", "r1"), role("r1", "Salesperson", "bu-root", "r1")];
		expect(dedupeLogicalRoles(roles)[0]).toMatchObject({ id: "r1", businessUnitId: "bu-root", copies: 2 });
	});

	it("keeps a role that exists only in a child business unit", () => {
		const roles = [role("r9", "Local Only", "bu-child", null)];
		expect(dedupeLogicalRoles(roles)).toEqual([{ id: "r9", name: "Local Only", businessUnitId: "bu-child", copies: 1 }]);
	});

	it("keeps distinct roles apart and orders them by name", () => {
		const roles = [role("b", "Zeta", null, "b"), role("a", "Alpha", null, "a")];
		expect(dedupeLogicalRoles(roles).map((entry) => entry.name)).toEqual(["Alpha", "Zeta"]);
	});
});

describe("toRolePrivilege", () => {
	it("carries the role, depth and parsed table across", () => {
		expect(toRolePrivilege({ privilegeid: "p1", name: "prvWriteAccount", "rp.privilegedepthmask": 8, "rp.roleid": "r1" })).toEqual({
			roleId: "r1",
			privilegeId: "p1",
			name: "prvWriteAccount",
			accessType: "Write",
			tableSchemaName: "Account",
			depth: "Organization",
		});
	});

	it("keeps a non-table privilege rather than dropping it", () => {
		expect(toRolePrivilege({ privilegeid: "p2", name: "prvActOnBehalfOfAnotherUser", "rp.privilegedepthmask": 1, "rp.roleid": "r1" })).toMatchObject({
			accessType: null,
			tableSchemaName: null,
			depth: "User",
		});
	});
});

describe("privilegeOperations", () => {
	it("asks for every requested role in one query", async () => {
		const { http, calls } = createFakeHttp({ privileges: { value: [] } });
		await privilegeOperations(http).getRolePrivileges({ roleIds: ["r1", "r2"] });
		expect(calls).toHaveLength(1);
		expect(decodeURIComponent(calls[0]!.path)).toContain("<value>r1</value><value>r2</value>");
	});

	it("sends nothing when no roles were asked for", async () => {
		const { http, calls } = createFakeHttp();
		expect(await privilegeOperations(http).getRolePrivileges({ roleIds: [] })).toEqual([]);
		expect(calls).toEqual([]);
	});

	it("writes depth changes through AddPrivilegesRole, never a replace", async () => {
		const { http, calls } = createFakeHttp();
		await privilegeOperations(http).addPrivilegesRole({ roleId: "r1", privileges: [{ privilegeId: "p1", depth: "BusinessUnit" }] });
		expect(calls[0]?.path).toBe("roles(r1)/Microsoft.Dynamics.CRM.AddPrivilegesRole");
		expect(calls[0]?.body).toEqual({ Privileges: [{ "PrivilegeId@odata.type": "Edm.Guid", PrivilegeId: "p1", Depth: 2 }] });
	});

	it("sends nothing when there are no privileges to change", async () => {
		const { http, calls } = createFakeHttp();
		await privilegeOperations(http).addPrivilegesRole({ roleId: "r1", privileges: [] });
		expect(calls).toEqual([]);
	});
});
