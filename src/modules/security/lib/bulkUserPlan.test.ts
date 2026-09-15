import { describe, expect, it } from "vitest";

import { type LogicalRole, type SystemUser } from "@/shared/types";

import { bulkUserPlan, bulkUserSummary, disabledUsers } from "./bulkUserPlan";

const user = (id: string, fullName = `User ${id}`, isDisabled = false): SystemUser => ({
	id,
	fullName,
	azureAdObjectId: null,
	domainName: `${id}@contoso.com`,
	isDisabled,
});

const role = (id: string, name: string): LogicalRole => ({ id, name, businessUnitId: "bu1", copies: 1 });

describe("bulkUserPlan", () => {
	it("produces one item per user and role pair", () => {
		const plan = bulkUserPlan([user("u1"), user("u2")], [role("r1", "Salesperson"), role("r2", "Basic User")], "add");
		expect(plan.items.map((item) => item.id)).toEqual(["u1:r1", "u1:r2", "u2:r1", "u2:r2"]);
	});

	it("names the user and the role so a failure is identifiable", () => {
		const plan = bulkUserPlan([user("u1", "Jane Doe")], [role("r1", "Salesperson")], "add");
		expect(plan.items[0]).toMatchObject({ label: "Jane Doe", detail: "Add Salesperson" });
	});

	it("reads differently for a removal", () => {
		const plan = bulkUserPlan([user("u1")], [role("r1", "Salesperson")], "remove");
		expect(plan.title).toBe("Remove roles from users");
		expect(plan.action).toBe("Remove from");
		expect(plan.items[0]?.detail).toBe("Remove Salesperson");
	});

	it("falls back to the sign-in name when a user has no full name", () => {
		expect(bulkUserPlan([user("u1", "")], [role("r1", "Salesperson")], "add").items[0]?.label).toBe("u1@contoso.com");
	});

	it("is empty when either side of the pairing is empty", () => {
		expect(bulkUserPlan([], [role("r1", "Salesperson")], "add").items).toEqual([]);
		expect(bulkUserPlan([user("u1")], [], "add").items).toEqual([]);
	});
});

describe("bulkUserSummary", () => {
	it("counts the pairs, not the users", () => {
		expect(bulkUserSummary([user("u1"), user("u2"), user("u3")], [role("r1", "A"), role("r2", "B")], "add")).toBe(
			"2 roles granted to 3 users, 6 changes in all."
		);
	});

	it("uses singulars where they belong", () => {
		expect(bulkUserSummary([user("u1")], [role("r1", "A")], "remove")).toBe("1 role removed from 1 user, 1 change in all.");
	});

	it("asks for a selection when there is nothing to do", () => {
		expect(bulkUserSummary([], [], "add")).toBe("Pick at least one user and one role.");
	});
});

describe("disabledUsers", () => {
	it("picks out the disabled users so they can be flagged before a run", () => {
		expect(disabledUsers([user("u1"), user("u2", "Bob", true)]).map((entry) => entry.id)).toEqual(["u2"]);
	});
});
