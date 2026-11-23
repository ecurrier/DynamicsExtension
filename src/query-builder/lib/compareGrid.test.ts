import { describe, expect, it } from "vitest";

import { type ComparedSide, type StoredComparison } from "./compareFlow";
import {
	type CompareCellContext,
	arrowText,
	bucketNoun,
	compareColumnLayout,
	compareGridCell,
	compareGridColumns,
	compareGridRows,
	differenceColumnName,
	filterByDifference,
	gridCaption,
	pagerLabel,
	recordLabelColumn,
	truncateMiddle,
} from "./compareGrid";
import { compareQueryRuns, type MatchKey } from "./comparison";
import { type ResultColumn } from "./resultColumn";
import { type ResultGridColumn } from "./results";
import { displayWindow } from "./resultsView";

const FORMATTED = "@OData.Community.Display.V1.FormattedValue";
const LOOKUP_TABLE = "@Microsoft.Dynamics.CRM.lookuplogicalname";

const ID_1 = "11111111-1111-1111-1111-111111111111";
const ID_2 = "22222222-2222-2222-2222-222222222222";
const ID_3 = "33333333-3333-3333-3333-333333333333";
const ID_4 = "44444444-4444-4444-4444-444444444444";
const CONTACT = "99999999-9999-9999-9999-999999999999";

const grid = (key: string, label: string, type: ResultColumn["type"], primaryKey = false): ResultGridColumn => ({
	key,
	label,
	type,
	table: "account",
	column: key,
	primaryKey,
});

const COLUMNS: ResultGridColumn[] = [
	grid("accountid", "accountid", "uniqueidentifier", true),
	grid("accountnumber", "accountnumber", "text"),
	grid("name", "name", "text"),
	grid("revenue", "revenue", "number"),
	grid("_primarycontactid_value", "primarycontactid", "lookup"),
];

const PRIMARY_KEY_COLUMN = COLUMNS[0] as ResultGridColumn;

const side = (name: string): ComparedSide => ({ key: name, name, runId: 1, loaded: 2, partial: false });

const contact = { _primarycontactid_value: CONTACT, [`_primarycontactid_value${FORMATTED}`]: "Jo", [`_primarycontactid_value${LOOKUP_TABLE}`]: "contact" };

const FIRST = [
	{ accountid: ID_1, accountnumber: "A1", name: "Alpha", revenue: 1, ...contact },
	{ accountid: ID_2, accountnumber: "B1", name: "Beta", revenue: 2, ...contact },
	{ accountid: ID_3, accountnumber: "C1", name: "Gamma", revenue: 3, ...contact },
];

const SECOND = [
	{ accountid: ID_1, accountnumber: "A1", name: "Alpha", revenue: 5, [`revenue${FORMATTED}`]: "$5.00", ...contact },
	{ accountid: ID_2, accountnumber: "B2", name: "Beta", revenue: 2, ...contact },
	{ accountid: ID_4, accountnumber: "D1", name: "Delta", revenue: 4, ...contact },
];

const stored = (matchKey: MatchKey = { kind: "primaryKey" }): StoredComparison => {
	const comparedColumns = ["accountnumber", "name", "revenue", "_primarycontactid_value"].filter(
		(key) => matchKey.kind === "primaryKey" || !matchKey.columns.includes(key)
	);
	return {
		id: 1,
		comparison: compareQueryRuns(FIRST, SECOND, { columns: COLUMNS, primaryKey: "accountid", matchKey, comparedColumns }),
		first: side("Contoso Dev"),
		second: side("Contoso Test"),
		text: "",
		setup: { firstKey: null, secondKey: null, matchKeyKind: matchKey.kind, keyColumns: [], comparedColumns: null },
		matchKey,
		keyColumns:
			matchKey.kind === "columns"
				? COLUMNS.filter((column) => matchKey.columns.includes(column.key)).sort(
						(a, b) => matchKey.columns.indexOf(a.key) - matchKey.columns.indexOf(b.key)
					)
				: [],
		primaryKey: "accountid",
	};
};

const DEV_APP = "https://dev.crm.dynamics.com/main.aspx?forceUCI=1";
const TEST_APP = "https://test.crm.dynamics.com/main.aspx?forceUCI=1";

const cellContext = (matchKey: MatchKey = { kind: "primaryKey" }): CompareCellContext => ({
	matchKey,
	primaryKey: "accountid",
	primaryKeyColumn: PRIMARY_KEY_COLUMN,
	appUrls: { first: DEV_APP, second: TEST_APP },
});

const kinds = (columns: { kind: string; label: string }[]) => columns.map((column) => `${column.kind}:${column.label}`);

describe("compareGridColumns", () => {
	it("leads every paired bucket with an open column for each Connection, then the name and the GUID", () => {
		const context = { stored: stored(), columns: COLUMNS, primaryName: "name" };
		expect(kinds(compareGridColumns("different", context))).toEqual([
			"open:Contoso Dev",
			"open:Contoso Test",
			"label:name",
			"guid:accountid",
			"differs:Differs",
			"difference:accountnumber (1)",
			"difference:revenue (1)",
		]);
		expect(kinds(compareGridColumns("equal", context))).toEqual([
			"open:Contoso Dev",
			"open:Contoso Test",
			"label:name",
			"guid:accountid",
			"value:accountnumber",
			"value:revenue",
			"value:primarycontactid",
		]);
	});

	it("gives an only-in bucket one open column, for its own Connection", () => {
		const context = { stored: stored(), columns: COLUMNS, primaryName: "name" };
		expect(kinds(compareGridColumns("onlyInFirst", context)).slice(0, 3)).toEqual(["open:Contoso Dev", "label:name", "guid:accountid"]);
		expect(kinds(compareGridColumns("onlyInSecond", context)).slice(0, 3)).toEqual(["open:Contoso Test", "label:name", "guid:accountid"]);
		expect(kinds(compareGridColumns("onlyInSecond", context))).toHaveLength(6);
	});

	it("gives Ambiguous and No key both open columns", () => {
		const context = { stored: stored(), columns: COLUMNS, primaryName: "name" };
		expect(kinds(compareGridColumns("ambiguous", context)).slice(0, 2)).toEqual(["open:Contoso Dev", "open:Contoso Test"]);
		expect(kinds(compareGridColumns("noKey", context)).slice(0, 2)).toEqual(["open:Contoso Dev", "open:Contoso Test"]);
	});

	it("labels a chosen-Column Match Key with its values and leaves the GUID out of pairs", () => {
		const matchKey: MatchKey = { kind: "columns", columns: ["name"] };
		const context = { stored: stored(matchKey), columns: COLUMNS, primaryName: "name" };
		expect(kinds(compareGridColumns("different", context))).toEqual([
			"open:Contoso Dev",
			"open:Contoso Test",
			"label:name",
			"differs:Differs",
			"difference:accountnumber (1)",
			"difference:revenue (1)",
		]);
		expect(kinds(compareGridColumns("onlyInFirst", context)).slice(0, 3)).toEqual(["open:Contoso Dev", "label:name", "guid:accountid"]);
	});
});

describe("recordLabelColumn", () => {
	it("uses the primary name, then the first text Column, and nothing for a chosen-Column Match Key", () => {
		expect(recordLabelColumn(COLUMNS, { kind: "primaryKey" }, "accountid", "name")?.key).toBe("name");
		expect(recordLabelColumn(COLUMNS, { kind: "primaryKey" }, "accountid", null)?.key).toBe("accountnumber");
		expect(recordLabelColumn(COLUMNS, { kind: "primaryKey" }, "accountid", "missing")?.key).toBe("accountnumber");
		expect(recordLabelColumn([PRIMARY_KEY_COLUMN], { kind: "primaryKey" }, "accountid", null)).toBeNull();
		expect(recordLabelColumn(COLUMNS, { kind: "columns", columns: ["name"] }, "accountid", "name")).toBeNull();
	});

	it("leads with the GUID when there is no text Column", () => {
		const context = { stored: stored(), columns: [PRIMARY_KEY_COLUMN, COLUMNS[3] as ResultGridColumn], primaryName: null };
		expect(kinds(compareGridColumns("onlyInFirst", context))).toEqual(["open:Contoso Dev", "guid:accountid", "value:revenue"]);
	});
});

describe("compareGridCell", () => {
	it("links each open cell to the Record in its own Connection", () => {
		const value = stored();
		const columns = compareGridColumns("different", { stored: value, columns: COLUMNS, primaryName: "name" });
		const [row] = compareGridRows("different", value.comparison);
		const cells = columns.map((column) => (row ? compareGridCell(row, column, cellContext()) : null));
		expect(cells[0]).toEqual({ text: "Open", href: `${DEV_APP}&pagetype=entityrecord&etn=account&id=${ID_1}` });
		expect(cells[1]).toEqual({ text: "Open", href: `${TEST_APP}&pagetype=entityrecord&etn=account&id=${ID_1}` });
		expect(cells[2]).toEqual({ text: "Alpha", href: null });
		expect(cells[3]).toEqual({ text: ID_1, href: null });
		expect(cells[4]).toEqual({ text: "1", href: null });
		expect(cells[5]).toEqual({ text: "", href: null });
		expect(cells[6]).toEqual({ text: "1 → $5.00", href: null });
	});

	it("leaves the open cell empty when the Record is not there or its primary key is not known", () => {
		const value = stored();
		const ambiguousColumns = compareGridColumns("noKey", { stored: value, columns: COLUMNS, primaryName: "name" });
		const row = { id: "x", first: { accountid: ID_3 }, second: null, differences: null };
		expect(compareGridCell(row, ambiguousColumns[0]!, cellContext()).href).toContain(ID_3);
		expect(compareGridCell(row, ambiguousColumns[1]!, cellContext())).toEqual({ text: "", href: null });
		expect(compareGridCell(row, ambiguousColumns[0]!, { ...cellContext(), primaryKeyColumn: null })).toEqual({ text: "", href: null });
		expect(compareGridCell(row, ambiguousColumns[0]!, { ...cellContext(), appUrls: { first: null, second: TEST_APP } })).toEqual({ text: "", href: null });
		expect(compareGridCell({ ...row, first: { accountid: "not a guid" } }, ambiguousColumns[0]!, cellContext())).toEqual({ text: "", href: null });
	});

	it("keeps lookup values as links into the Record's own Connection", () => {
		const value = stored();
		const columns = compareGridColumns("onlyInSecond", { stored: value, columns: COLUMNS, primaryName: "name" });
		const [row] = compareGridRows("onlyInSecond", value.comparison);
		const lookup = columns.find((column) => column.id === "value-_primarycontactid_value");
		expect(row && lookup ? compareGridCell(row, lookup, cellContext()) : null).toEqual({
			text: "Jo",
			href: `${TEST_APP}&pagetype=entityrecord&etn=contact&id=${CONTACT}`,
		});
	});

	it("shows the chosen-Column Match Key values as the label", () => {
		const matchKey: MatchKey = { kind: "columns", columns: ["name", "accountnumber"] };
		const value = stored(matchKey);
		const columns = compareGridColumns("onlyInFirst", { stored: value, columns: COLUMNS, primaryName: "name" });
		const [row] = compareGridRows("onlyInFirst", value.comparison);
		expect(columns[1]?.label).toBe("name · accountnumber");
		expect(row && columns[1] ? compareGridCell(row, columns[1], cellContext(matchKey)).text : null).toBe("Beta · B1");
	});
});

describe("compareGridRows", () => {
	it("makes one row for each pair or Record, on the side it came from", () => {
		const { comparison } = stored();
		expect(compareGridRows("different", comparison)).toHaveLength(2);
		expect(compareGridRows("onlyInFirst", comparison).map((row) => [row.first?.accountid, row.second])).toEqual([[ID_3, null]]);
		expect(compareGridRows("onlyInSecond", comparison).map((row) => [row.first, row.second?.accountid])).toEqual([[null, ID_4]]);
		expect(compareGridRows("equal", comparison)).toHaveLength(0);
	});

	it("lists both sides of Ambiguous and No key", () => {
		const matchKey: MatchKey = { kind: "columns", columns: ["revenue"] };
		const comparison = compareQueryRuns(
			[{ accountid: ID_1, revenue: 1 }, { accountid: ID_2, revenue: 1 }, { accountid: ID_3 }],
			[{ accountid: ID_4, revenue: 1 }],
			{ columns: COLUMNS, primaryKey: "accountid", matchKey, comparedColumns: ["name"] }
		);
		expect(compareGridRows("ambiguous", comparison).map((row) => (row.first ? "first" : "second"))).toEqual(["first", "first", "second"]);
		expect(compareGridRows("noKey", comparison).map((row) => row.first?.accountid)).toEqual([ID_3]);
	});
});

describe("the Column filter", () => {
	it("keeps the pairs that differ in the Column, and the caption says so", () => {
		const rows = compareGridRows("different", stored().comparison);
		expect(filterByDifference(rows, null)).toHaveLength(2);
		const revenue = filterByDifference(rows, "revenue");
		expect(revenue.map((row) => row.first?.accountid)).toEqual([ID_1]);
		expect(gridCaption(displayWindow(revenue.length, 0), revenue.length, "Pairs", "revenue")).toBe("Pairs 1-1 of 1. Filter: revenue.");
		expect(gridCaption(displayWindow(rows.length, 0), rows.length, "Pairs")).toBe("Pairs 1-2 of 2");
	});

	it("captions a range and an empty list", () => {
		expect(gridCaption(displayWindow(120, 1), 120, "Records")).toBe("Records 51-100 of 120");
		expect(gridCaption(displayWindow(0, 0), 0, "Pairs", "revenue")).toBe("No Pairs. Filter: revenue.");
	});
});

describe("truncateMiddle", () => {
	it("keeps the start and the end of a GUID", () => {
		expect(truncateMiddle(ID_1)).toBe("11111111…1111");
		expect(truncateMiddle("short")).toBe("short");
	});
});

describe("compareColumnLayout", () => {
	it("pins the open and label Columns after the toggle and lets the rest scroll", () => {
		const columns = compareGridColumns("different", { stored: stored(), columns: COLUMNS, primaryName: "name" });
		expect(compareColumnLayout(columns, 28).map((layout) => layout.left)).toEqual([28, 124, 220, null, null, null, null]);
		expect(compareColumnLayout(columns, 0).map((layout) => layout.width)).toEqual([96, 96, 220, 150, 64, 220, 220]);
	});
});

describe("bucket row texts", () => {
	it("explains the arrow, names the noun and the filter, and labels the pager with the range", () => {
		expect(arrowText("Current page", "Contoso Test")).toBe("Each cell shows Current page → Contoso Test.");
		expect(bucketNoun("different")).toBe("Pairs");
		expect(bucketNoun("equal")).toBe("Pairs");
		expect(bucketNoun("onlyInFirst")).toBe("Records");
		const columns = compareGridColumns("different", { stored: stored(), columns: COLUMNS, primaryName: "name" });
		expect(differenceColumnName(columns, "revenue")).toBe("revenue");
		expect(differenceColumnName(columns, null)).toBeNull();
		expect(differenceColumnName(columns, "name")).toBeNull();
		expect(pagerLabel("Next", "Pairs", "Pairs 1-14 of 14. Filter: revenue.")).toBe("Next pairs. Pairs 1-14 of 14. Filter: revenue.");
		expect(pagerLabel("Previous", "Records", "Records 1-50 of 74")).toBe("Previous records. Records 1-50 of 74.");
	});
});
