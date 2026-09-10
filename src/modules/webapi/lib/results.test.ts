import { describe, expect, it } from "vitest";

import { buildResultsShare, cellText, columnsFromRows, extractEntityName, rowMatches } from "./results";

describe("results helpers", () => {
	it("collects sorted columns ignoring annotations", () => {
		expect(
			columnsFromRows([
				{ b: 1, "@odata.etag": "x" },
				{ a: 2, "a@OData.Community.Display.V1.FormattedValue": "two" },
			])
		).toEqual(["a", "a@OData.Community.Display.V1.FormattedValue", "b"]);
	});

	it("renders cell text", () => {
		expect(cellText(null)).toBe("---");
		expect(cellText({ a: 1 })).toBe('{"a":1}');
		expect(cellText(3)).toBe("3");
	});

	it("filters rows by text", () => {
		expect(rowMatches({ name: "Contoso" }, ["name"], "con")).toBe(true);
		expect(rowMatches({ name: "Contoso" }, ["name"], "zzz")).toBe(false);
		expect(rowMatches({ name: "Contoso" }, ["name"], "  ")).toBe(true);
	});

	it("builds a share payload and extracts entity names", () => {
		const share = buildResultsShare("account", [{ name: "a" }]);
		expect(share).toMatchObject({ entityName: "account", columns: ["name"], truncated: false });
		expect(extractEntityName('<fetch><entity name="contact"></entity></fetch>')).toBe("contact");
		expect(extractEntityName("<fetch></fetch>")).toBeNull();
	});
});
