import { describe, expect, it } from "vitest";

import { type LogicalRole, type RolePrivilege } from "@/shared/types";

import { depthFilter, privilegeCells, privilegeDepthPlan, privilegePlanSummary } from "./privilegePlan";

const role = (id: string, name: string): LogicalRole => ({ id, name, businessUnitId: "bu1", copies: 1 });

const priv = (roleId: string, table: string, accessType: RolePrivilege["accessType"], depth: RolePrivilege["depth"]): RolePrivilege => ({
	roleId,
	privilegeId: `p-${accessType}-${table}`,
	name: `prv${accessType}${table}`,
	accessType,
	tableSchemaName: table,
	depth,
});

const roles = [role("r1", "Salesperson")];

describe("privilegeCells", () => {
	it("turns privileges into selectable cells", () => {
		expect(privilegeCells(roles, [priv("r1", "Account", "Read", "Organization")], [])).toEqual([
			{
				id: "r1:p-Read-Account",
				roleId: "r1",
				roleName: "Salesperson",
				privilegeId: "p-Read-Account",
				privilegeName: "prvReadAccount",
				tableSchemaName: "Account",
				accessType: "Read",
				depth: "Organization",
			},
		]);
	});

	it("narrows to the chosen tables when some are given", () => {
		const cells = privilegeCells(roles, [priv("r1", "Account", "Read", "User"), priv("r1", "Contact", "Read", "User")], ["Contact"]);
		expect(cells.map((cell) => cell.tableSchemaName)).toEqual(["Contact"]);
	});

	it("drops privileges with no table", () => {
		const odd: RolePrivilege = { roleId: "r1", privilegeId: "p9", name: "prvOther", accessType: null, tableSchemaName: null, depth: "User" };
		expect(privilegeCells(roles, [odd], [])).toEqual([]);
	});
});

describe("depthFilter", () => {
	it("keeps everything when no depth is chosen", () => {
		const cells = privilegeCells(roles, [priv("r1", "Account", "Read", "User")], []);
		expect(depthFilter(cells, [])).toHaveLength(1);
	});

	it("keeps only the chosen depths", () => {
		const cells = privilegeCells(roles, [priv("r1", "Account", "Read", "User"), priv("r1", "Account", "Write", "Organization")], []);
		expect(depthFilter(cells, ["Organization"]).map((cell) => cell.accessType)).toEqual(["Write"]);
	});
});

describe("privilegeDepthPlan", () => {
	it("skips privileges already at the target depth", () => {
		const cells = privilegeCells(roles, [priv("r1", "Account", "Read", "Organization"), priv("r1", "Account", "Write", "User")], []);
		const plan = privilegeDepthPlan(cells, "Organization");
		expect(plan.items.map((item) => item.id)).toEqual(["r1:p-Write-Account"]);
		expect(plan.items[0]?.detail).toBe("Write: User to Organization");
	});

	it("names the role and table so a failure is identifiable", () => {
		const cells = privilegeCells(roles, [priv("r1", "Account", "Read", "User")], []);
		expect(privilegeDepthPlan(cells, "BusinessUnit").items[0]?.label).toBe("Salesperson · Account");
	});
});

describe("privilegePlanSummary", () => {
	it("says how many will change and how many are already there", () => {
		const cells = privilegeCells(roles, [priv("r1", "Account", "Read", "Organization"), priv("r1", "Account", "Write", "User")], []);
		expect(privilegePlanSummary(cells, "Organization")).toBe("1 privilege will change; 1 already at Organization and will be left alone.");
	});

	it("omits the already-there clause when everything changes", () => {
		const cells = privilegeCells(roles, [priv("r1", "Account", "Write", "User")], []);
		expect(privilegePlanSummary(cells, "Organization")).toBe("1 privilege will change.");
	});

	it("asks for a selection when nothing is selected", () => {
		expect(privilegePlanSummary([], "User")).toBe("Select privileges to change.");
	});
});
