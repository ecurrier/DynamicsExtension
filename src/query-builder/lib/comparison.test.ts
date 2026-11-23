import { describe, expect, it } from "vitest";

import { compareQueryRuns, type ComparisonOptions, suggestComparedColumns } from "./comparison";
import { columnLogicalName, type QueryRunRecord, type ResultColumn } from "./resultColumn";

const FORMATTED = "@OData.Community.Display.V1.FormattedValue";
const LOOKUP_TABLE = "@Microsoft.Dynamics.CRM.lookuplogicalname";

const columns: ResultColumn[] = [
	{ key: "accountid", label: "Account", type: "uniqueidentifier" },
	{ key: "name", label: "Account Name", type: "text" },
	{ key: "revenue", label: "Annual Revenue", type: "number" },
	{ key: "foundedon", label: "Founded On", type: "date" },
	{ key: "industrycode", label: "Industry", type: "choice" },
	{ key: "donotemail", label: "Do not allow Emails", type: "boolean" },
	{ key: "_parentaccountid_value", label: "Parent Account", type: "lookup" },
	{ key: "contact.fullname", label: "Primary Contact (Full Name)", type: "text" },
	{ key: "versionnumber", label: "Version Number", type: "number" },
	{ key: "createdon", label: "Created On", type: "date" },
	{ key: "_modifiedby_value", label: "Modified By", type: "lookup" },
	{ key: "contact.createdon", label: "Primary Contact (Created On)", type: "date" },
];

const byPrimaryKey = (comparedColumns: string[] = ["name"]): ComparisonOptions => ({
	columns,
	primaryKey: "accountid",
	matchKey: { kind: "primaryKey" },
	comparedColumns,
});

const byColumns = (keyColumns: string[], comparedColumns: string[] = ["name"]): ComparisonOptions => ({
	columns,
	primaryKey: "accountid",
	matchKey: { kind: "columns", columns: keyColumns },
	comparedColumns,
});

const account = (id: string, values: Record<string, unknown> = {}): QueryRunRecord => ({ accountid: id, name: `Account ${id}`, ...values });

const parent = (id: string, name: string): Record<string, unknown> => ({
	_parentaccountid_value: id,
	[`_parentaccountid_value${FORMATTED}`]: name,
	[`_parentaccountid_value${LOOKUP_TABLE}`]: "account",
});

const ID_A = "a1b2c3d4-0000-0000-0000-00000000000a";
const ID_B = "a1b2c3d4-0000-0000-0000-00000000000b";

describe("compareQueryRuns buckets", () => {
	it("sorts Records into only in first, only in second, equal and different, with counts", () => {
		const first = [account("1"), account("2"), account("3", { name: "Old" })];
		const second = [account("2"), account("3", { name: "New" }), account("4")];

		const result = compareQueryRuns(first, second, byPrimaryKey());

		expect(result.onlyInFirst).toEqual([first[0]]);
		expect(result.onlyInSecond).toEqual([second[2]]);
		expect(result.equal).toEqual([{ first: first[1], second: second[0] }]);
		expect(result.different).toEqual([
			{
				first: first[2],
				second: second[1],
				differences: [{ column: "name", label: "Account Name", first: { raw: "Old", friendly: "Old" }, second: { raw: "New", friendly: "New" } }],
			},
		]);
		expect(result.counts).toEqual({ onlyInFirst: 1, onlyInSecond: 1, equal: 1, different: 1, ambiguous: 0, noKey: 0 });
	});

	it("does not mutate its inputs", () => {
		const first = [account("1"), account("1")];
		const second = [account("1", { name: "Other" })];
		const snapshot = JSON.stringify([first, second]);

		compareQueryRuns(first, second, byPrimaryKey());

		expect(JSON.stringify([first, second])).toBe(snapshot);
	});

	it("reports each differing column with friendly and raw values from both sides", () => {
		const first = [account(ID_A, { industrycode: 1, [`industrycode${FORMATTED}`]: "Accounting", revenue: 10 })];
		const second = [account(ID_A, { industrycode: 2, [`industrycode${FORMATTED}`]: "Agriculture", revenue: 10 })];

		const result = compareQueryRuns(first, second, byPrimaryKey(["industrycode", "revenue"]));

		expect(result.different[0]?.differences).toEqual([
			{
				column: "industrycode",
				label: "Industry",
				first: { raw: 1, friendly: "Accounting" },
				second: { raw: 2, friendly: "Agriculture" },
			},
		]);
	});
});

describe("compareQueryRuns match keys", () => {
	it("matches primary keys as GUIDs ignoring braces and case", () => {
		const first = [account(`{${ID_A.toUpperCase()}}`, { name: "Same" })];
		const second = [account(ID_A, { name: "Same" })];

		const result = compareQueryRuns(first, second, byPrimaryKey());

		expect(result.counts.equal).toBe(1);
		expect(result.keyMatching).toBe("guidIgnoringCaseAndBraces");
		expect(result.lookupsComparedBy).toBe("id");
	});

	it("pairs Records with differing GUIDs on a chosen-column key, trimming text and ignoring case", () => {
		const first = [account(ID_A, { name: "Contoso", revenue: 5 })];
		const second = [account(ID_B, { name: "  CONTOSO ", revenue: 7 })];

		const result = compareQueryRuns(first, second, byColumns(["name"], ["revenue", "accountid"]));

		expect(result.counts).toMatchObject({ onlyInFirst: 0, onlyInSecond: 0, different: 1 });
		expect(result.different[0]?.differences.map((difference) => difference.column)).toEqual(["revenue", "accountid"]);
		expect(result.keyMatching).toBe("typedWithTextTrimmedAndCaseInsensitive");
		expect(result.lookupsComparedBy).toBe("name");
	});

	it("never compares columns in the Match Key", () => {
		const primary = compareQueryRuns(
			[account(ID_A, { name: "Same" })],
			[account(ID_A.toUpperCase(), { name: "Same" })],
			byPrimaryKey(["accountid", "name"])
		);
		const chosen = compareQueryRuns([account(ID_A, { name: "X" })], [account(ID_B, { name: "x" })], byColumns(["name"], ["name"]));

		expect(primary.comparedColumns.map((column) => column.key)).toEqual(["name"]);
		expect(primary.counts.equal).toBe(1);
		expect(chosen.comparedColumns).toEqual([]);
		expect(chosen.counts.equal).toBe(1);
	});

	it("matches a key of several columns by each column's type", () => {
		const first = [account(ID_A, { name: "Contoso", foundedon: "2020-01-01T00:00:00Z", revenue: 1 })];
		const second = [
			account(ID_B, { name: "contoso", foundedon: "2020-01-01T00:00:00Z", revenue: 2 }),
			account("c", { name: "contoso", foundedon: "2021-01-01T00:00:00Z" }),
		];

		const result = compareQueryRuns(first, second, byColumns(["name", "foundedon"], ["revenue"]));

		expect(result.counts).toMatchObject({ different: 1, onlyInSecond: 1 });
	});

	it("matches lookups in a chosen-column key by the referenced Record's name", () => {
		const first = [account(ID_A, parent("p1", "Fabrikam"))];
		const second = [account(ID_B, parent("p2", "fabrikam "))];

		const result = compareQueryRuns(first, second, byColumns(["_parentaccountid_value"], []));

		expect(result.counts.equal).toBe(1);
	});
});

describe("compareQueryRuns lookups", () => {
	const first = [account(ID_A, { ...parent("11111111-0000-0000-0000-000000000001", "Fabrikam") })];
	const second = [account(ID_A, { ...parent("22222222-0000-0000-0000-000000000002", "Fabrikam") })];

	it("compares a lookup by id under a primary-key Match Key", () => {
		const result = compareQueryRuns(first, second, byPrimaryKey(["_parentaccountid_value"]));

		expect(result.counts.different).toBe(1);
		expect(result.different[0]?.differences[0]).toEqual({
			column: "_parentaccountid_value",
			label: "Parent Account",
			first: { raw: "11111111-0000-0000-0000-000000000001", friendly: "Fabrikam" },
			second: { raw: "22222222-0000-0000-0000-000000000002", friendly: "Fabrikam" },
		});
	});

	it("compares a lookup by name under a chosen-column Match Key", () => {
		const result = compareQueryRuns(first, second, byColumns(["name"], ["_parentaccountid_value"]));

		expect(result.counts.equal).toBe(1);
	});

	it("reports a lookup whose name differs under a chosen-column Match Key", () => {
		const renamed = [account(ID_A, { ...parent("22222222-0000-0000-0000-000000000002", "Northwind") })];

		const result = compareQueryRuns(first, renamed, byColumns(["name"], ["_parentaccountid_value"]));

		expect(result.counts.different).toBe(1);
	});

	it("compares lookup ids ignoring case and braces", () => {
		const upper = [account(ID_A, { ...parent("{11111111-0000-0000-0000-00000000000A}", "Fabrikam") })];
		const lower = [account(ID_A, { ...parent("11111111-0000-0000-0000-00000000000a", "Fabrikam") })];

		expect(compareQueryRuns(upper, lower, byPrimaryKey(["_parentaccountid_value"])).counts.equal).toBe(1);
	});
});

describe("compareQueryRuns ambiguous and empty keys", () => {
	it("sets aside a key repeated on one side as an ambiguous group with both sides' Records", () => {
		const first = [account("1", { name: "Contoso" }), account("2", { name: "contoso" }), account("3", { name: "Other" })];
		const second = [account("9", { name: "Contoso", revenue: 4 }), account("8", { name: "Other" })];

		const result = compareQueryRuns(first, second, byColumns(["name"], ["revenue"]));

		expect(result.ambiguous).toEqual([{ key: "contoso", first: [first[0], first[1]], second: [second[0]] }]);
		expect(result.counts).toEqual({ onlyInFirst: 0, onlyInSecond: 0, equal: 1, different: 0, ambiguous: 1, noKey: 0 });
	});

	it("sets aside a key repeated only on the second side", () => {
		const first = [account("1", { name: "Solo" })];
		const second = [account("2", { name: "Twin" }), account("3", { name: "Twin" })];

		const result = compareQueryRuns(first, second, byColumns(["name"], []));

		expect(result.ambiguous).toEqual([{ key: "twin", first: [], second: [second[0], second[1]] }]);
		expect(result.counts).toMatchObject({ onlyInFirst: 1, onlyInSecond: 0, ambiguous: 1 });
	});

	it("sets aside a key repeated on both sides as one group", () => {
		const first = [account("1", { name: "Twin" }), account("2", { name: "Twin" })];
		const second = [account("3", { name: "Twin" }), account("4", { name: "TWIN" })];

		const result = compareQueryRuns(first, second, byColumns(["name"], []));

		expect(result.ambiguous).toEqual([{ key: "twin", first, second }]);
		expect(result.counts).toMatchObject({ ambiguous: 1, equal: 0, different: 0 });
	});

	it("sets aside Records whose chosen-column key is empty as no key", () => {
		const first = [account("1", { name: null }), account("2", { name: "   " }), account("3", { name: "Kept" })];
		const second = [account("4", { name: "" }), { accountid: "5" }, account("6", { name: "Kept" })];

		const result = compareQueryRuns(first, second, byColumns(["name"], []));

		expect(result.noKey).toEqual({ first: [first[0], first[1]], second: [second[0], second[1]] });
		expect(result.counts).toMatchObject({ noKey: 4, equal: 1, onlyInFirst: 0, onlyInSecond: 0 });
	});

	it("keys on a partly empty multi-column key and sets aside only a wholly empty one", () => {
		const first = [account("1", { name: "Child", industrycode: null }), account("2", { name: null, industrycode: null })];
		const second = [account("3", { name: "child" })];

		const result = compareQueryRuns(first, second, byColumns(["name", "industrycode"], []));

		expect(result.counts).toMatchObject({ equal: 1, noKey: 1 });
	});
});

describe("compareQueryRuns value types", () => {
	const compare = (column: string, a: unknown, b: unknown): boolean =>
		compareQueryRuns([account(ID_A, { [column]: a })], [account(ID_A, { [column]: b })], byPrimaryKey([column])).counts.equal === 1;

	it("compares text exactly", () => {
		expect(compare("name", "Contoso", "Contoso")).toBe(true);
		expect(compare("name", "Contoso", "contoso")).toBe(false);
		expect(compare("name", "Contoso", "Contoso ")).toBe(false);
	});

	it("compares numbers and money numerically", () => {
		expect(compare("revenue", 100, 100.0)).toBe(true);
		expect(compare("revenue", 100, "100.00")).toBe(true);
		expect(compare("revenue", 100, 100.01)).toBe(false);
		expect(compare("revenue", 0, null)).toBe(false);
	});

	it("compares dates by their raw ISO value", () => {
		expect(compare("foundedon", "2024-05-01T10:00:00Z", "2024-05-01T10:00:00Z")).toBe(true);
		expect(compare("foundedon", "2024-05-01T10:00:00Z", "2024-05-01T11:00:00Z")).toBe(false);
	});

	it("compares Choices by option value, not label", () => {
		const first = [account(ID_A, { industrycode: 3, [`industrycode${FORMATTED}`]: "Brokers" })];
		const second = [account(ID_A, { industrycode: 3, [`industrycode${FORMATTED}`]: "Makler" })];

		expect(compareQueryRuns(first, second, byPrimaryKey(["industrycode"])).counts.equal).toBe(1);
		expect(compare("industrycode", 3, 4)).toBe(false);
		expect(compare("industrycode", "1,2", "2,1")).toBe(true);
	});

	it("compares yes/no by value", () => {
		expect(compare("donotemail", true, true)).toBe(true);
		expect(compare("donotemail", true, false)).toBe(false);
		expect(compare("donotemail", false, null)).toBe(false);
	});

	it("treats empty as equal to empty", () => {
		expect(compare("name", null, undefined)).toBe(true);
		expect(compare("name", "", null)).toBe(true);
		expect(compare("revenue", null, null)).toBe(true);
	});

	it("compares unique identifiers ignoring case and braces", () => {
		expect(compare("contact.fullname", "x", "x")).toBe(true);
		const guidColumns = [...columns, { key: "contact.contactid", label: "Contact", type: "uniqueidentifier" as const }];
		const result = compareQueryRuns([account(ID_A, { "contact.contactid": `{${ID_B.toUpperCase()}}` })], [account(ID_A, { "contact.contactid": ID_B })], {
			...byPrimaryKey(["contact.contactid"]),
			columns: guidColumns,
		});
		expect(result.counts.equal).toBe(1);
	});

	it("compares a column absent from one side's rows as empty against value", () => {
		const first = [account(ID_A, { "contact.fullname": "Jane Doe" })];
		const second = [account(ID_A)];

		const result = compareQueryRuns(first, second, byPrimaryKey(["contact.fullname"]));

		expect(result.different[0]?.differences).toEqual([
			{
				column: "contact.fullname",
				label: "Primary Contact (Full Name)",
				first: { raw: "Jane Doe", friendly: "Jane Doe" },
				second: { raw: null, friendly: "" },
			},
		]);
	});

	it("treats a column absent from both sides as equal", () => {
		expect(compareQueryRuns([account(ID_A)], [account(ID_A)], byPrimaryKey(["contact.fullname"])).counts.equal).toBe(1);
	});
});

describe("suggestComparedColumns", () => {
	it("leaves out the primary key and versionnumber under a primary-key Match Key", () => {
		expect(suggestComparedColumns(columns, "accountid", { kind: "primaryKey" })).toEqual([
			"name",
			"revenue",
			"foundedon",
			"industrycode",
			"donotemail",
			"_parentaccountid_value",
			"contact.fullname",
			"createdon",
			"_modifiedby_value",
			"contact.createdon",
		]);
	});

	it("also leaves out the key columns and created and modified bookkeeping under a chosen-column Match Key", () => {
		expect(suggestComparedColumns(columns, "accountid", { kind: "columns", columns: ["name"] })).toEqual([
			"revenue",
			"foundedon",
			"industrycode",
			"donotemail",
			"_parentaccountid_value",
			"contact.fullname",
		]);
	});
});

describe("columnLogicalName", () => {
	it("strips a link-entity alias and the lookup value wrapper", () => {
		expect(columnLogicalName("name")).toBe("name");
		expect(columnLogicalName("_ownerid_value")).toBe("ownerid");
		expect(columnLogicalName("contact.createdon")).toBe("createdon");
		expect(columnLogicalName("contact._createdby_value")).toBe("createdby");
	});
});

describe("compareQueryRuns at scale", () => {
	const ROWS = 50_000;

	const largeRun = (offset: number, changeEvery: number): QueryRunRecord[] =>
		Array.from({ length: ROWS }, (_, index) => {
			const n = index + offset;
			const id = `00000000-0000-0000-0000-${n.toString(16).padStart(12, "0")}`;
			return {
				accountid: index % 2 === 0 ? id.toUpperCase() : id,
				name: `Account ${n}`,
				revenue: n % changeEvery === 0 ? n + 1 : n,
				foundedon: "2024-01-01T00:00:00Z",
				industrycode: n % 10,
				donotemail: n % 2 === 0,
				_parentaccountid_value: `11111111-0000-0000-0000-${(n % 100).toString(16).padStart(12, "0")}`,
				[`_parentaccountid_value${FORMATTED}`]: `Parent ${n % 100}`,
				"contact.fullname": `Contact ${n}`,
			};
		});

	it("compares two 50,000-row sets within a few seconds", () => {
		const first = largeRun(0, 1_000_000);
		const second = largeRun(1_000, 7);
		const compared = suggestComparedColumns(columns, "accountid", { kind: "primaryKey" });

		const started = performance.now();
		const byId = compareQueryRuns(first, second, byPrimaryKey(compared));
		const byName = compareQueryRuns(first, second, byColumns(["name"], compared));
		const elapsed = performance.now() - started;

		for (const result of [byId, byName]) {
			expect(result.counts.onlyInFirst).toBe(1_000);
			expect(result.counts.onlyInSecond).toBe(1_000);
			expect(result.counts.equal + result.counts.different).toBe(ROWS - 1_000);
		}
		expect(byId.counts.different).toBeGreaterThan(0);
		expect(elapsed).toBeLessThan(10_000);
	}, 60_000);
});
