import { describe, expect, it } from "vitest";

import { type EntitySummary, type RecordCounts } from "@/shared/types";

import { recordCountsViewModel } from "./recordCountsViewModel";

const tables = [
	{ logicalName: "account", displayName: "Account" },
	{ logicalName: "contact", displayName: "Contact" },
] as EntitySummary[];

const counts = {
	counts: [
		{ entityLogicalName: "account", count: 12 },
		{ entityLogicalName: "contact", count: 30 },
		{ entityLogicalName: "orphan", count: 5 },
	],
} as RecordCounts;

describe("recordCountsViewModel", () => {
	it("joins counts to display names and falls back to the logical name", () => {
		const model = recordCountsViewModel(tables, counts, "");
		expect(model.rows.map((row) => row.displayName)).toEqual(["Account", "Contact", "orphan"]);
	});

	it("totals every row, not just the filtered ones", () => {
		const model = recordCountsViewModel(tables, counts, "account");
		expect(model.filtered).toHaveLength(1);
		expect(model.total).toBe(47);
	});

	it("matches the filter against both logical and display names, case-insensitively", () => {
		expect(recordCountsViewModel(tables, counts, "CONTA").filtered.map((row) => row.logicalName)).toEqual(["contact"]);
		expect(recordCountsViewModel(tables, counts, "orph").filtered.map((row) => row.logicalName)).toEqual(["orphan"]);
	});

	it("ignores surrounding whitespace in the filter", () => {
		expect(recordCountsViewModel(tables, counts, "   ").filtered).toHaveLength(3);
	});

	it('distinguishes "nothing run yet" from "nothing matched"', () => {
		expect(recordCountsViewModel(tables, null, "").emptyMessage).toBe("Run a count to see row totals");
		expect(recordCountsViewModel(tables, counts, "zzz").emptyMessage).toBe("No tables match that filter");
	});
});
