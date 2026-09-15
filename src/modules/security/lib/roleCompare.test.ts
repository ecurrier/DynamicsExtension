import { describe, expect, it } from "vitest";

import { type LogicalRole, type RolePrivilege } from "@/shared/types";

import { compareRoleMatrix, differingRows, roleCompareToText } from "./roleCompare";

const role = (id: string, name: string): LogicalRole => ({ id, name, businessUnitId: "bu1", copies: 1 });

const priv = (roleId: string, table: string, accessType: RolePrivilege["accessType"], depth: RolePrivilege["depth"]): RolePrivilege => ({
	roleId,
	privilegeId: `p-${accessType}-${table}`,
	name: `prv${accessType}${table}`,
	accessType,
	tableSchemaName: table,
	depth,
});

const roles = [role("r1", "Salesperson"), role("r2", "Manager")];

describe("compareRoleMatrix", () => {
	it("builds one row per table and privilege, with a cell per role", () => {
		const rows = compareRoleMatrix(roles, [priv("r1", "Account", "Read", "User"), priv("r2", "Account", "Read", "Organization")]);
		expect(rows).toEqual([{ id: "Account:Read", tableSchemaName: "Account", accessType: "Read", depths: { r1: "User", r2: "Organization" } }]);
	});

	it("fills a role that does not hold the privilege at all with None", () => {
		const rows = compareRoleMatrix(roles, [priv("r1", "Account", "Write", "User")]);
		expect(rows[0]?.depths).toEqual({ r1: "User", r2: "None" });
	});

	it("ignores privileges that do not belong to a table", () => {
		const odd: RolePrivilege = {
			roleId: "r1",
			privilegeId: "p9",
			name: "prvActOnBehalfOfAnotherUser",
			accessType: null,
			tableSchemaName: null,
			depth: "User",
		};
		expect(compareRoleMatrix(roles, [odd])).toEqual([]);
	});

	it("orders by table, then privilege", () => {
		const rows = compareRoleMatrix(roles, [
			priv("r1", "Contact", "Read", "User"),
			priv("r1", "Account", "Write", "User"),
			priv("r1", "Account", "Read", "User"),
		]);
		expect(rows.map((row) => row.id)).toEqual(["Account:Read", "Account:Write", "Contact:Read"]);
	});
});

describe("differingRows", () => {
	it("keeps only rows where the roles disagree", () => {
		const rows = compareRoleMatrix(roles, [
			priv("r1", "Account", "Read", "User"),
			priv("r2", "Account", "Read", "User"),
			priv("r1", "Account", "Write", "User"),
			priv("r2", "Account", "Write", "Organization"),
		]);
		expect(differingRows(rows, roles).map((row) => row.id)).toEqual(["Account:Write"]);
	});

	it("treats a role missing the privilege entirely as a difference", () => {
		const rows = compareRoleMatrix(roles, [priv("r1", "Account", "Read", "User")]);
		expect(differingRows(rows, roles)).toHaveLength(1);
	});

	it("returns nothing when the roles are identical", () => {
		const rows = compareRoleMatrix(roles, [priv("r1", "Account", "Read", "User"), priv("r2", "Account", "Read", "User")]);
		expect(differingRows(rows, roles)).toEqual([]);
	});
});

describe("roleCompareToText", () => {
	it("writes a header and a line per row", () => {
		const rows = compareRoleMatrix(roles, [priv("r1", "Account", "Read", "User"), priv("r2", "Account", "Read", "Organization")]);
		expect(roleCompareToText(rows, roles)).toBe("Table\tPrivilege\tSalesperson\tManager\nAccount\tRead\tUser\tOrganization");
	});
});
