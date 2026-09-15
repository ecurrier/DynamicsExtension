import { describe, expect, it } from "vitest";

import { recordSetColumns, recordSetPosition, recordSetRows, recordSetStep } from "./recordSet";

const rows = [
	{ accountid: "a1", name: "Contoso", telephone1: "123", "@odata.etag": "W/1", _ownerid_value: "u1" },
	{ accountid: "a2", name: "Fabrikam", telephone1: "456", "@odata.etag": "W/2", _ownerid_value: "u1" },
];

describe("recordSetColumns", () => {
	it("skips annotations, lookup value fields, and underscore keys", () => {
		expect(recordSetColumns(rows)).toEqual(["accountid", "name", "telephone1"]);
	});

	it("caps the number of columns so the panel stays readable", () => {
		const wide = [Object.fromEntries(Array.from({ length: 20 }, (_, index) => [`col${index}`, index]))];
		expect(recordSetColumns(wide)).toHaveLength(6);
	});
});

describe("recordSetRows", () => {
	it("keys rows by the table primary id and picks a display value", () => {
		expect(recordSetRows(rows, "account").map((row) => ({ id: row.id, primary: row.primary }))).toEqual([
			{ id: "a1", primary: "Contoso" },
			{ id: "a2", primary: "Fabrikam" },
		]);
	});

	it("drops rows with no primary id, which cannot be navigated to", () => {
		expect(recordSetRows([{ name: "Nameless" }], "account")).toEqual([]);
	});

	it("falls back to the id when there is no other column to show", () => {
		expect(recordSetRows([{ accountid: "a9" }], "account")[0]?.primary).toBe("a9");
	});
});

describe("recordSetPosition", () => {
	const set = recordSetRows(rows, "account");

	it("finds the current record and reports its place", () => {
		expect(recordSetPosition(set, "a1")).toMatchObject({ index: 0, total: 2, hasPrevious: false, hasNext: true, caption: "Record 1 of 2" });
		expect(recordSetPosition(set, "a2")).toMatchObject({ index: 1, hasPrevious: true, hasNext: false, caption: "Record 2 of 2" });
	});

	it("matches the current record regardless of guid casing", () => {
		expect(recordSetPosition(set, "A1").index).toBe(0);
	});

	it("reports the set without a position when the tab is elsewhere", () => {
		expect(recordSetPosition(set, null)).toMatchObject({ index: -1, hasPrevious: false, hasNext: false, caption: "2 records" });
	});

	it("handles an empty set", () => {
		expect(recordSetPosition([], "a1")).toMatchObject({ index: -1, total: 0, caption: "No records loaded" });
	});
});

describe("recordSetStep", () => {
	const set = recordSetRows(rows, "account");

	it("steps forward and back through the set", () => {
		expect(recordSetStep(set, "a1", 1)?.id).toBe("a2");
		expect(recordSetStep(set, "a2", -1)?.id).toBe("a1");
	});

	it("stops at the ends rather than wrapping", () => {
		expect(recordSetStep(set, "a2", 1)).toBeNull();
		expect(recordSetStep(set, "a1", -1)).toBeNull();
	});

	it("starts at the first record when the tab is showing something else", () => {
		expect(recordSetStep(set, null, 1)?.id).toBe("a1");
	});
});
