import { describe, expect, it } from "vitest";

import { buildPlan, DEFAULT_PLAN_OPTIONS, rowId } from "./plan";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

describe("buildPlan", () => {
	it("assigns create, update, and skip actions by target existence", () => {
		const plan = buildPlan(
			[{ accountid: A.toUpperCase() }, { accountid: B }, { accountid: "nope" }],
			"accountid",
			new Set([B]),
			null,
			DEFAULT_PLAN_OPTIONS
		);
		expect(plan.rows.map((row) => [row.id, row.action])).toEqual([
			[A, "create"],
			[B, "update"],
			[null, "skip"],
		]);
		expect(plan.counts).toEqual({ create: 1, update: 1, skip: 1, delete: 0 });
		expect(plan.deletes).toEqual([]);
	});

	it("honours switched-off operations and plans sync deletes", () => {
		const plan = buildPlan([{ accountid: A }, { accountid: B }], "accountid", new Set([B]), new Set([B, C]), {
			create: false,
			update: false,
			deleteMissing: true,
		});
		expect(plan.rows.map((row) => row.action)).toEqual(["skip", "skip"]);
		expect(plan.rows[0]?.reason).toMatch(/creates are off/);
		expect(plan.deletes).toEqual([C]);
		expect(plan.counts).toEqual({ create: 0, update: 0, skip: 2, delete: 1 });
	});

	it("reads guid ids only", () => {
		expect(rowId({ accountid: `{${A}}` }, "accountid")).toBe(A);
		expect(rowId({ accountid: 5 }, "accountid")).toBeNull();
	});
});
