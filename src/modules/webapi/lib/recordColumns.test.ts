import { describe, expect, it } from "vitest";

import { SAMPLE_TABLE } from "@/modules/codegen/lib";
import { type CodegenColumn } from "@/shared/types";

import { copyText, dateMode, matchesRecordColumnFilters, type RecordColumnFilter, recordColumnSearchFields, sortRecordColumns } from "./recordColumns";
import { sampleRow, sampleRows } from "./sampleRecord";

const columnOf = (logicalName: string): CodegenColumn => {
	const column = SAMPLE_TABLE.columns.find((candidate) => candidate.logicalName === logicalName);
	if (!column) {
		throw new Error(`No sample column ${logicalName}`);
	}
	return column;
};

describe("buildRecordColumns", () => {
	it("leaves out columns folded into their parent", () => {
		expect(sampleRows().map((row) => row.logicalName)).not.toContain("parentaccountidname");
	});

	it("picks an editor per column type", () => {
		const editors = Object.fromEntries(sampleRows().map((row) => [row.logicalName, row.editor]));
		expect(editors).toMatchObject({
			name: "text",
			new_creditlimit: "number",
			new_customerscore: "number",
			new_status: "choice",
			new_tags: "multiChoice",
			new_renewaldate: "date",
			parentaccountid: "lookup",
			ownerid: "lookup",
			donotemail: "boolean",
			numberofemployees: "number",
		});
	});

	it("keeps primary keys, bookkeeping columns, and unsupported types as read-only rows", () => {
		const reasons = Object.fromEntries(sampleRows().map((row) => [row.logicalName, row.readOnlyReason]));
		expect(reasons).toMatchObject({
			accountid: "primaryKey",
			createdon: "notUpdatable",
			versionnumber: "notUpdatable",
			entityimage: "unsupported",
			new_contract: "unsupported",
			name: null,
		});
		expect(sampleRow("createdon").editor).toBeNull();
	});

	it("shows formatted values and keeps the raw value", () => {
		expect(sampleRow("new_creditlimit")).toMatchObject({ displayValue: "$5,000.00", rawValue: "5000" });
		expect(sampleRow("name")).toMatchObject({ displayValue: "Contoso", rawValue: "Contoso" });
		expect(sampleRow("industrycode")).toMatchObject({ displayValue: null, rawValue: null });
		expect(sampleRow("entityimage")).toMatchObject({ displayValue: "Image", rawValue: null });
	});

	it("reads lookups from their value key and annotations", () => {
		expect(sampleRow("parentaccountid")).toMatchObject({
			displayValue: "Parent Ltd",
			rawValue: "id-2",
			lookup: { id: "id-2", name: "Parent Ltd", entityLogicalName: "account", entitySetName: "accounts", navigationProperty: "parentaccountid" },
		});
		expect(sampleRow("ownerid").lookup).toMatchObject({ id: "team-1", entityLogicalName: "team", entitySetName: "teams" });
	});

	it("flags whether each column is on the form only when the form is known", () => {
		expect(sampleRow("name").onForm).toBeNull();
		const rows = sampleRows(new Set(["name"]));
		expect(rows.find((row) => row.logicalName === "name")?.onForm).toBe(true);
		expect(rows.find((row) => row.logicalName === "new_tags")?.onForm).toBe(false);
	});

	it("treats a lookup with no resolvable targets as unsupported", () => {
		const table = { ...SAMPLE_TABLE, columns: [{ ...columnOf("parentaccountid"), targets: [] }] };
		expect(sampleRows(null, table)[0]).toMatchObject({ editor: null, readOnlyReason: "unsupported" });
	});
});

describe("dateMode", () => {
	it("follows behavior first and format second", () => {
		const base = columnOf("createdon");
		expect(dateMode(columnOf("new_renewaldate"))).toBe("dateOnly");
		expect(dateMode(base)).toBe("localDateTime");
		expect(dateMode({ ...base, dateTimeFormat: "DateOnly" })).toBe("localDate");
		expect(dateMode({ ...base, dateTimeBehavior: "TimeZoneIndependent" })).toBe("floatingDateTime");
		expect(dateMode({ ...base, dateTimeBehavior: "TimeZoneIndependent", dateTimeFormat: "DateOnly" })).toBe("floatingDate");
		expect(dateMode({ ...base, dateTimeBehavior: null })).toBe("localDateTime");
	});
});

describe("search and filters", () => {
	it("searches names, formatted values, raw values, and lookup ids", () => {
		expect(recordColumnSearchFields(sampleRow("parentaccountid"))).toEqual(["Parent Account", "parentaccountid", "Parent Ltd", "id-2", "account"]);
	});

	it("copies a lookup's id and every other column's displayed value", () => {
		expect(copyText(sampleRow("parentaccountid"))).toBe("id-2");
		expect(copyText(sampleRow("new_status"))).toBe("In Progress");
	});

	it("combines filter chips with and", () => {
		const rows = sampleRows(new Set(["name", "new_status"]));
		const names = (filters: RecordColumnFilter[], changed: string[] = []) =>
			rows
				.filter((row) => matchesRecordColumnFilters(row, new Set(filters), new Set(changed)))
				.map((row) => row.logicalName)
				.sort();
		expect(names(["changed"], ["name"])).toEqual(["name"]);
		expect(names(["hasValue"])).not.toContain("industrycode");
		expect(names(["notOnForm"])).not.toContain("name");
		expect(names(["editable"])).not.toContain("createdon");
		expect(names(["custom"])).toEqual(["new_contract", "new_creditlimit", "new_customerscore", "new_renewaldate", "new_status", "new_tags"]);
		expect(names(["custom", "notOnForm", "hasValue"])).toEqual(["new_creditlimit", "new_renewaldate", "new_tags"]);
	});

	it("sorts by display name or logical name", () => {
		const rows = sampleRows();
		expect(sortRecordColumns(rows, "logicalName")[0]?.logicalName).toBe("accountid");
		const byDisplay = sortRecordColumns(rows, "displayName").map((row) => row.displayName);
		expect(byDisplay).toEqual([...byDisplay].sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" })));
	});
});
