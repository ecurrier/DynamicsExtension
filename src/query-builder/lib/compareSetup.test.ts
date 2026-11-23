import { describe, expect, it } from "vitest";

import { parseFetchXml } from "@/shared/lib/fetchxml";

import {
	chooseCompareSide,
	compareAvailability,
	compareColumns,
	comparePair,
	type CompareSetup,
	DEFAULT_COMPARE_SETUP,
	effectiveComparedColumns,
	keyColumnChoices,
	primaryKeyOf,
	resolveCompareSetup,
	sameCompareSetup,
} from "./compareSetup";
import { type ResultGridColumn } from "./results";

const parse = (text: string) => {
	const result = parseFetchXml(text);
	if (!result.ok) {
		throw new Error("The test Query does not parse");
	}
	return result.document;
};

const column = (key: string, type: ResultGridColumn["type"] = "text", extra: Partial<ResultGridColumn> = {}): ResultGridColumn => ({
	key,
	label: key,
	type,
	table: key.includes(".") ? "contact" : "account",
	column: key,
	primaryKey: false,
	...extra,
});

const COLUMNS: ResultGridColumn[] = [
	column("accountid", "uniqueidentifier", { primaryKey: true }),
	column("name"),
	column("revenue", "number"),
	column("createdon", "date"),
	column("pc.fullname"),
];

const KEYS = ["page", "environment:env-test", "environment:env-staging"];

describe("compareAvailability", () => {
	it("accepts a plain Query", () => {
		expect(compareAvailability(parse('<fetch><entity name="account" /></fetch>'))).toEqual({ ok: true });
	});

	it("refuses an aggregate Query and a Query with top, each with one sentence", () => {
		const aggregate = compareAvailability(parse('<fetch aggregate="true"><entity name="account" /></fetch>'));
		const top = compareAvailability(parse('<fetch top="10"><entity name="account" /></fetch>'));
		expect(aggregate.ok).toBe(false);
		expect(top.ok).toBe(false);
		expect(aggregate.ok ? "" : aggregate.reason).toContain('aggregate="true"');
		expect(top.ok ? "" : top.reason).toContain("top");
	});

	it("refuses when there is no Query", () => {
		expect(compareAvailability(null).ok).toBe(false);
	});
});

describe("comparePair", () => {
	it("defaults to the first two Connections", () => {
		expect(comparePair(DEFAULT_COMPARE_SETUP, KEYS)).toEqual(["page", "environment:env-test"]);
	});

	it("keeps chosen Connections and never pairs a Connection with itself", () => {
		expect(comparePair({ firstKey: KEYS[2] ?? null, secondKey: KEYS[2] ?? null }, KEYS)).toEqual(["environment:env-staging", "page"]);
	});

	it("falls back when a chosen Connection was removed", () => {
		expect(comparePair({ firstKey: "environment:gone", secondKey: "environment:env-staging" }, KEYS)).toEqual(["page", "environment:env-staging"]);
	});

	it("is null with fewer than two Connections", () => {
		expect(comparePair(DEFAULT_COMPARE_SETUP, ["page"])).toBeNull();
	});
});

describe("chooseCompareSide", () => {
	it("swaps the sides when the other side's Connection is chosen", () => {
		const next = chooseCompareSide(DEFAULT_COMPARE_SETUP, KEYS, "first", "environment:env-test");
		expect(comparePair(next, KEYS)).toEqual(["environment:env-test", "page"]);
	});

	it("replaces one side and keeps the other", () => {
		const next = chooseCompareSide(DEFAULT_COMPARE_SETUP, KEYS, "second", "environment:env-staging");
		expect(comparePair(next, KEYS)).toEqual(["page", "environment:env-staging"]);
	});
});

describe("columns for the setup", () => {
	it("derives result columns from both Query Runs", () => {
		const query = parse('<fetch><entity name="account"><attribute name="name" /></entity></fetch>');
		const columns = compareColumns(query, [{ accountid: "1", name: "A" }], [{ accountid: "2", name: "B", revenue: 3 }], {});
		expect(columns.map((entry) => entry.key)).toEqual(["name", "accountid", "revenue"]);
	});

	it("finds the primary key from the columns, then the metadata, then the Table name", () => {
		expect(primaryKeyOf(COLUMNS, "account", {})).toBe("accountid");
		expect(primaryKeyOf([], "account", {})).toBe("accountid");
		expect(primaryKeyOf([], null, {})).toBeNull();
	});

	it("offers only root-Table Columns other than the primary key for the Match Key", () => {
		expect(keyColumnChoices(COLUMNS, "accountid").map((entry) => entry.key)).toEqual(["name", "revenue", "createdon"]);
	});

	it("suggests compared Columns until the user picks them, and leaves Match Key Columns out", () => {
		const columnsKey = { kind: "columns", columns: ["name"] } as const;
		expect(effectiveComparedColumns(DEFAULT_COMPARE_SETUP, COLUMNS, "accountid", columnsKey)).toEqual(["revenue", "pc.fullname"]);
		const picked: CompareSetup = { ...DEFAULT_COMPARE_SETUP, comparedColumns: ["name", "createdon", "missing"] };
		expect(effectiveComparedColumns(picked, COLUMNS, "accountid", columnsKey)).toEqual(["createdon"]);
	});
});

describe("resolveCompareSetup", () => {
	const context = { keys: KEYS, columns: COLUMNS, primaryKey: "accountid" };

	it("resolves the primary key Match Key with the suggested Columns", () => {
		const result = resolveCompareSetup(DEFAULT_COMPARE_SETUP, context);
		expect(result).toEqual({
			ok: true,
			setup: {
				firstKey: "page",
				secondKey: "environment:env-test",
				primaryKey: "accountid",
				matchKey: { kind: "primaryKey" },
				keyColumns: [],
				comparedColumns: ["name", "revenue", "createdon", "pc.fullname"],
			},
		});
	});

	it("needs a Column for a chosen-Column Match Key", () => {
		const result = resolveCompareSetup({ ...DEFAULT_COMPARE_SETUP, matchKeyKind: "columns" }, context);
		expect(result).toEqual({ ok: false, reason: "Select one or more Columns for the Match Key." });
	});

	it("drops Match Key Columns that are not in the results", () => {
		const result = resolveCompareSetup({ ...DEFAULT_COMPARE_SETUP, matchKeyKind: "columns", keyColumns: ["pc.fullname", "name"] }, context);
		expect(result.ok && result.setup.matchKey).toEqual({ kind: "columns", columns: ["name"] });
		expect(result.ok && result.setup.keyColumns.map((entry) => entry.key)).toEqual(["name"]);
	});

	it("needs a compared Column", () => {
		expect(resolveCompareSetup({ ...DEFAULT_COMPARE_SETUP, comparedColumns: [] }, context)).toEqual({
			ok: false,
			reason: "Select one or more Columns to compare.",
		});
	});

	it("needs two Connections", () => {
		expect(resolveCompareSetup(DEFAULT_COMPARE_SETUP, { ...context, keys: ["page"] }).ok).toBe(false);
	});
});

describe("sameCompareSetup", () => {
	it("compares lists by value", () => {
		expect(sameCompareSetup({ ...DEFAULT_COMPARE_SETUP, keyColumns: ["name"] }, { ...DEFAULT_COMPARE_SETUP, keyColumns: ["name"] })).toBe(true);
		expect(sameCompareSetup({ ...DEFAULT_COMPARE_SETUP, comparedColumns: null }, { ...DEFAULT_COMPARE_SETUP, comparedColumns: [] })).toBe(false);
	});
});
