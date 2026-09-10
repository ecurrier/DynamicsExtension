import { describe, expect, it } from "vitest";

import { SAMPLE_TABLE } from "@/modules/codegen/lib";

import { columnExtra, columnTypeLabel, filterColumns } from "./columnBrowser";

const column = (logicalName: string) => {
	const found = SAMPLE_TABLE.columns.find((candidate) => candidate.logicalName === logicalName);
	if (!found) {
		throw new Error(`${logicalName} is not in the sample`);
	}
	return found;
};

describe("filterColumns", () => {
	it("matches display, logical, and schema names and sorts by display name", () => {
		expect(filterColumns(SAMPLE_TABLE.columns, "credit").map((candidate) => candidate.logicalName)).toEqual(["new_creditlimit"]);
		expect(filterColumns(SAMPLE_TABLE.columns, "CreditLimit")).toHaveLength(1);
		expect(filterColumns(SAMPLE_TABLE.columns, "parent").map((candidate) => candidate.logicalName)).toEqual(["parentaccountid", "parentaccountidname"]);
		expect(filterColumns(SAMPLE_TABLE.columns, "")).toHaveLength(SAMPLE_TABLE.columns.length);
	});
});

describe("columnTypeLabel", () => {
	it("names virtual columns by their type name", () => {
		expect(columnTypeLabel(column("new_tags"))).toBe("MultiSelectPicklist");
		expect(columnTypeLabel(column("entityimage"))).toBe("Image");
		expect(columnTypeLabel(column("ownerid"))).toBe("Owner");
	});
});

describe("columnExtra", () => {
	it("describes the type-specific detail", () => {
		expect(columnExtra(column("name"))).toBe("Max 160");
		expect(columnExtra(column("new_customerscore"))).toBe("Precision 2");
		expect(columnExtra(column("ownerid"))).toBe("systemuser, team");
		expect(columnExtra(column("industrycode"))).toBe("industrycode (global)");
		expect(columnExtra(column("new_renewaldate"))).toBe("DateOnly");
		expect(columnExtra(column("parentaccountidname"))).toBe("Helper for parentaccountid");
		expect(columnExtra(column("numberofemployees"))).toBe("");
	});
});
