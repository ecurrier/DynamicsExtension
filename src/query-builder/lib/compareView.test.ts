import { describe, expect, it } from "vitest";

import { type ComparedSide } from "./compareFlow";
import {
	bucketLabel,
	COMPARISON_BUCKETS,
	defaultBucket,
	matchingText,
	matchKeyLabel,
	matchKeyText,
	noPairsHint,
	partialText,
	showsRaw,
	unreliableBuckets,
} from "./compareView";
import { compareQueryRuns, type ComparisonCounts } from "./comparison";
import { type ResultColumn } from "./resultColumn";

const FORMATTED = "@OData.Community.Display.V1.FormattedValue";

const counts = (values: Partial<ComparisonCounts>): ComparisonCounts => ({
	onlyInFirst: 0,
	onlyInSecond: 0,
	equal: 0,
	different: 0,
	ambiguous: 0,
	noKey: 0,
	...values,
});

const side = (name: string, loaded: number, partial = false): ComparedSide => ({ key: name, name, runId: 1, loaded, partial });

const COLUMNS: ResultColumn[] = [
	{ key: "accountid", label: "accountid", type: "uniqueidentifier" },
	{ key: "name", label: "name", type: "text" },
	{ key: "revenue", label: "revenue", type: "number" },
	{ key: "_primarycontactid_value", label: "primarycontactid", type: "lookup" },
];

describe("defaultBucket", () => {
	it("lists the buckets in tab order", () => {
		expect(COMPARISON_BUCKETS).toEqual(["different", "onlyInFirst", "onlyInSecond", "equal", "ambiguous", "noKey"]);
	});

	it("picks different first, then the only-in lists, then same", () => {
		expect(defaultBucket(counts({ different: 1, onlyInFirst: 2, equal: 3 }))).toBe("different");
		expect(defaultBucket(counts({ onlyInSecond: 2, equal: 3 }))).toBe("onlyInSecond");
		expect(defaultBucket(counts({ onlyInFirst: 1, onlyInSecond: 2 }))).toBe("onlyInFirst");
		expect(defaultBucket(counts({ equal: 3, ambiguous: 1 }))).toBe("equal");
		expect(defaultBucket(counts({ noKey: 1 }))).toBe("noKey");
		expect(defaultBucket(counts({}))).toBe("equal");
	});
});

describe("bucketLabel", () => {
	it("names the Connections", () => {
		expect(bucketLabel("onlyInFirst", "Contoso Dev", "Contoso Test")).toBe("Only in Contoso Dev");
		expect(bucketLabel("onlyInSecond", "Contoso Dev", "Contoso Test")).toBe("Only in Contoso Test");
		expect(bucketLabel("equal", "A", "B")).toBe("Same");
	});
});

describe("partial Comparisons", () => {
	it("says nothing when both sides are complete", () => {
		expect(partialText(side("Dev", 10), side("Test", 12))).toBeNull();
		expect(unreliableBuckets(side("Dev", 10), side("Test", 12)).size).toBe(0);
	});

	it("names each Connection when only one is cut off or the counts differ", () => {
		expect(partialText(side("Dev", 50000, true), side("Test", 12))).toBe("Partial. Compared the first 50,000 Records of Dev.");
		expect(partialText(side("Dev", 50000, true), side("Test", 1200, true))).toBe(
			"Partial. Compared the first 50,000 Records of Dev. Compared the first 1,200 Records of Test."
		);
	});

	it("says each Connection when both stop at the same count", () => {
		expect(partialText(side("Dev", 50000, true), side("Test", 50000, true))).toBe("Partial. Compared the first 50,000 Records of each Connection.");
	});

	it("marks the only-in list that the other side's missing Records can change", () => {
		expect([...unreliableBuckets(side("Dev", 5), side("Test", 5, true))]).toEqual(["onlyInFirst"]);
		expect([...unreliableBuckets(side("Dev", 5, true), side("Test", 5))]).toEqual(["onlyInSecond"]);
	});
});

describe("matchingText", () => {
	it("describes a primary key Match Key", () => {
		const comparison = compareQueryRuns([], [], { columns: COLUMNS, primaryKey: "accountid", matchKey: { kind: "primaryKey" }, comparedColumns: ["name"] });
		expect(matchingText({ comparison, keyColumns: [] })).toBe("Matched on the primary key. Ignored case and braces.");
	});

	it("describes a chosen-Column Match Key and how lookups compare", () => {
		const comparison = compareQueryRuns([], [], {
			columns: COLUMNS,
			primaryKey: "accountid",
			matchKey: { kind: "columns", columns: ["name"] },
			comparedColumns: ["revenue", "_primarycontactid_value"],
		});
		expect(matchingText({ comparison, keyColumns: [COLUMNS[1] as ResultColumn] })).toBe(
			"Matched on name. Ignored case and outer spaces. Compared lookups by name."
		);
	});

	it("leaves out the text rule for a number key", () => {
		const comparison = compareQueryRuns([], [], {
			columns: COLUMNS,
			primaryKey: "accountid",
			matchKey: { kind: "columns", columns: ["revenue"] },
			comparedColumns: ["name"],
		});
		expect(matchingText({ comparison, keyColumns: [COLUMNS[2] as ResultColumn] })).toBe("Matched on revenue.");
	});
});

describe("noPairsHint", () => {
	const byKey = (first: Record<string, unknown>[], second: Record<string, unknown>[]) =>
		compareQueryRuns(first, second, { columns: COLUMNS, primaryKey: "accountid", matchKey: { kind: "primaryKey" }, comparedColumns: ["name"] });

	it("suggests Columns when a primary key pairs nothing", () => {
		const comparison = byKey([{ accountid: "1", name: "A" }], [{ accountid: "2", name: "A" }]);
		expect(noPairsHint({ comparison, first: side("Dev", 1), second: side("Test", 1) })).toContain("use Columns for the Match Key");
	});

	it("says nothing when Records pair or a side is empty", () => {
		const paired = byKey([{ accountid: "1", name: "A" }], [{ accountid: "1", name: "B" }]);
		expect(noPairsHint({ comparison: paired, first: side("Dev", 1), second: side("Test", 1) })).toBeNull();
		const empty = byKey([{ accountid: "1", name: "A" }], []);
		expect(noPairsHint({ comparison: empty, first: side("Dev", 1), second: side("Test", 0) })).toBeNull();
	});
});

describe("matchKeyText and matchKeyLabel", () => {
	const record = { accountid: "9", name: "Contoso", revenue: 5, [`revenue${FORMATTED}`]: "$5.00" };

	it("shows the primary key or the friendly key values", () => {
		expect(matchKeyText(record, { kind: "primaryKey" }, "accountid")).toBe("9");
		expect(matchKeyText(record, { kind: "columns", columns: ["name", "revenue", "missing"] }, "accountid")).toBe("Contoso · $5.00 · (empty)");
	});

	it("names the Match Key", () => {
		expect(matchKeyLabel({ matchKey: { kind: "primaryKey" }, primaryKey: "accountid", keyColumns: [] })).toBe("accountid");
		expect(
			matchKeyLabel({
				matchKey: { kind: "columns", columns: ["name", "revenue"] },
				primaryKey: "accountid",
				keyColumns: [COLUMNS[1], COLUMNS[2]] as ResultColumn[],
			})
		).toBe("name · revenue");
	});
});

describe("showsRaw", () => {
	it("shows the raw value only when it adds something", () => {
		expect(showsRaw({ raw: 5, friendly: "$5.00" })).toBe(true);
		expect(showsRaw({ raw: "A", friendly: "A" })).toBe(false);
		expect(showsRaw({ raw: null, friendly: "" })).toBe(false);
	});
});
