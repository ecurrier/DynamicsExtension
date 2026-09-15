import { describe, expect, it } from "vitest";

import { displayValue, fetchXmlAttributes, valueKeys, recordSetColumns, recordSetPosition, recordSetRows, recordSetStep } from "./recordSet";

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

describe("fetchXmlAttributes", () => {
	it("takes the attributes in the order the view declares them", () => {
		const xml = '<fetch><entity name="account"><attribute name="name" /><attribute name="telephone1" /><attribute name="revenue" /></entity></fetch>';
		expect(fetchXmlAttributes(xml)).toEqual(["name", "telephone1", "revenue"]);
	});

	it("ignores attributes that belong to a linked table, which are not columns of this view", () => {
		const xml =
			'<fetch><entity name="account"><attribute name="name" /><link-entity name="contact" from="parentcustomerid" to="accountid"><attribute name="fullname" /></link-entity></entity></fetch>';
		expect(fetchXmlAttributes(xml)).toEqual(["name"]);
	});

	it("ignores a self-closing link-entity too", () => {
		const xml = '<fetch><entity name="account"><attribute name="name" /><link-entity name="contact" from="a" to="b" /></entity></fetch>';
		expect(fetchXmlAttributes(xml)).toEqual(["name"]);
	});

	it("does not repeat a column the view names twice", () => {
		const xml = '<fetch><entity name="account"><attribute name="name" /><attribute name="name" /></entity></fetch>';
		expect(fetchXmlAttributes(xml)).toEqual(["name"]);
	});

	it("returns nothing for a query that selects no attributes", () => {
		expect(fetchXmlAttributes('<fetch><entity name="account"><all-attributes /></entity></fetch>')).toEqual([]);
	});
});

describe("displayValue", () => {
	const row = {
		name: "Contoso",
		revenue: 1000,
		"revenue@OData.Community.Display.V1.FormattedValue": "$1,000.00",
		_ownerid_value: "u1",
		"_ownerid_value@OData.Community.Display.V1.FormattedValue": "Jane Doe",
		emptyish: "",
		nothing: null,
		nested: { a: 1 },
	};

	it("prefers the formatted value, which is what makes money and lookups readable", () => {
		expect(displayValue(row, "revenue")).toBe("$1,000.00");
		expect(displayValue(row, "_ownerid_value")).toBe("Jane Doe");
	});

	it("falls back to the raw value when there is no formatted one", () => {
		expect(displayValue(row, "name")).toBe("Contoso");
	});

	it("renders nothing for null, missing, and object values", () => {
		expect(displayValue(row, "nothing")).toBe("");
		expect(displayValue(row, "absent")).toBe("");
		expect(displayValue(row, "nested")).toBe("");
	});
});

describe("displayValue for lookups", () => {
	it("finds a lookup the view names as ownerid but OData returns as _ownerid_value", () => {
		const row = { _ownerid_value: "u1", "_ownerid_value@OData.Community.Display.V1.FormattedValue": "Jane Doe" };
		expect(displayValue(row, "ownerid")).toBe("Jane Doe");
	});

	it("falls back to the raw lookup id when there is no formatted name", () => {
		expect(displayValue({ _ownerid_value: "u1" }, "ownerid")).toBe("u1");
	});

	it("does not double-wrap a key that is already in lookup form", () => {
		expect(valueKeys("_ownerid_value")).toEqual(["_ownerid_value"]);
		expect(valueKeys("ownerid")).toEqual(["ownerid", "_ownerid_value"]);
	});

	it("still prefers a plain column over a same-named lookup shape", () => {
		expect(displayValue({ name: "Contoso", _name_value: "wrong" }, "name")).toBe("Contoso");
	});
});
