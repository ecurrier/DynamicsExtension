import { describe, expect, it } from "vitest";

import { cellSortValue, cellText, isAnnotationKey, resultColumnKeys } from "./results";

describe("resultColumnKeys", () => {
	it("lists every key in the order it first appears, leaving out annotations", () => {
		const rows = [
			{ "@odata.etag": 'W/"1"', accountid: "a", name: "Contoso", "revenue@OData.Community.Display.V1.FormattedValue": "$1.00", revenue: 1 },
			{ accountid: "b", _primarycontactid_value: "c", "_primarycontactid_value@Microsoft.Dynamics.CRM.lookuplogicalname": "contact" },
		];
		expect(resultColumnKeys(rows)).toEqual(["accountid", "name", "revenue", "_primarycontactid_value"]);
	});

	it("returns no columns for no rows", () => {
		expect(resultColumnKeys([])).toEqual([]);
	});

	it("keeps aliased linked-Table keys, which contain a dot but no @", () => {
		expect(resultColumnKeys([{ "contact.fullname": "Sam" }])).toEqual(["contact.fullname"]);
		expect(isAnnotationKey("contact.fullname")).toBe(false);
	});
});

describe("cellText", () => {
	it("shows nothing for a missing value", () => {
		expect(cellText(null)).toBe("");
		expect(cellText(undefined)).toBe("");
	});

	it("writes scalars as text and objects as JSON", () => {
		expect(cellText(12.5)).toBe("12.5");
		expect(cellText(false)).toBe("false");
		expect(cellText({ a: 1 })).toBe('{"a":1}');
	});
});

describe("cellSortValue", () => {
	it("sorts numbers as numbers and everything else as text", () => {
		expect(cellSortValue(3)).toBe(3);
		expect(cellSortValue(true)).toBe("true");
		expect(cellSortValue(null)).toBeNull();
	});
});
