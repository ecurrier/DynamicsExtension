import { describe, expect, it } from "vitest";

import { type FetchXmlDocument, parseFetchXml } from "@/shared/lib/fetchxml";
import { type QueryColumn, type QueryColumnType, type QueryTable } from "@/shared/types";

import { cellText, cellValueText, deriveResultColumns, keyLabel, queryTableNames, type ResultTables } from "./results";

const FORMATTED = "@OData.Community.Display.V1.FormattedValue";
const LOOKUP = "@Microsoft.Dynamics.CRM.lookuplogicalname";

const parse = (text: string): FetchXmlDocument => {
	const result = parseFetchXml(text);
	if (!result.ok) {
		throw new Error(result.errors[0]?.message);
	}
	return result.document;
};

const column = (logicalName: string, columnType: QueryColumnType | null): QueryColumn => ({
	logicalName,
	displayName: logicalName,
	attributeType: "",
	attributeTypeName: "",
	columnType,
	attributeOf: null,
	isPrimaryId: false,
	isPrimaryName: false,
	isValidForRead: true,
	dateOnly: false,
	options: [],
	targets: [],
});

const table = (logicalName: string, primaryIdAttribute: string, columns: QueryColumn[]): QueryTable => ({
	logicalName,
	displayName: logicalName,
	entitySetName: `${logicalName}s`,
	primaryIdAttribute,
	primaryNameAttribute: null,
	columns,
	manyToOne: [],
	oneToMany: [],
	manyToMany: [],
});

const TABLES: ResultTables = {
	account: table("account", "accountid", [
		column("accountid", "uniqueIdentifier"),
		column("name", "text"),
		column("revenue", "decimalOrMoney"),
		column("industrycode", "choice"),
		column("primarycontactid", "lookup"),
		column("ownerid", "owner"),
		column("createdon", "dateTime"),
		column("donotemail", "yesNo"),
	]),
	contact: table("contact", "contactid", [column("contactid", "uniqueIdentifier"), column("fullname", "text"), column("parentcustomerid", "lookup")]),
};

const pick = <T extends object, K extends keyof T>(items: readonly T[], ...keys: K[]) =>
	items.map((item) => Object.fromEntries(keys.map((key) => [key, item[key]])) as Pick<T, K>);

describe("deriveResultColumns", () => {
	it("lists the root Table's Columns in Query order, then the other keys the rows carry", () => {
		const query = parse('<fetch><entity name="account"><attribute name="revenue" /><attribute name="name" /><order attribute="name" /></entity></fetch>');
		const rows = [{ "@odata.etag": 'W/"1"', accountid: "a", name: "Contoso", revenue: 1, [`revenue${FORMATTED}`]: "$1.00", extra: true }];
		expect(pick(deriveResultColumns(query, rows, TABLES), "key", "label", "type", "primaryKey")).toEqual([
			{ key: "revenue", label: "revenue", type: "number", primaryKey: false },
			{ key: "name", label: "name", type: "text", primaryKey: false },
			{ key: "accountid", label: "accountid", type: "uniqueidentifier", primaryKey: true },
			{ key: "extra", label: "extra", type: "text", primaryKey: false },
		]);
	});

	it("never turns an annotation into a column", () => {
		const rows = [{ name: "a", [`name${FORMATTED}`]: "A", [`_x_value${LOOKUP}`]: "contact", "@odata.etag": "1" }];
		expect(deriveResultColumns(null, rows, {}).map((result) => result.key)).toEqual(["name"]);
	});

	it("keys a lookup as _name_value and labels it with the Column's logical name", () => {
		const query = parse('<fetch><entity name="account"><attribute name="primarycontactid" /><attribute name="ownerid" /></entity></fetch>');
		const rows = [{ accountid: "a", _primarycontactid_value: "c", [`_primarycontactid_value${LOOKUP}`]: "contact" }];
		expect(pick(deriveResultColumns(query, rows, TABLES), "key", "label", "type")).toEqual([
			{ key: "_primarycontactid_value", label: "primarycontactid", type: "lookup" },
			{ key: "_ownerid_value", label: "ownerid", type: "lookup" },
			{ key: "accountid", label: "accountid", type: "uniqueidentifier" },
		]);
	});

	it("finds a lookup by the keys the rows carry before metadata arrives, and leaves other columns untyped", () => {
		const query = parse('<fetch><entity name="account"><attribute name="primarycontactid" /><attribute name="revenue" /></entity></fetch>');
		const rows = [{ _primarycontactid_value: "c", revenue: 5 }];
		expect(pick(deriveResultColumns(query, rows, {}), "key", "label", "type")).toEqual([
			{ key: "_primarycontactid_value", label: "primarycontactid", type: "lookup" },
			{ key: "revenue", label: "revenue", type: "text" },
		]);
	});

	it("shows a Column no row carries, because every value was empty", () => {
		const query = parse('<fetch><entity name="account"><attribute name="name" /><attribute name="primarycontactid" /></entity></fetch>');
		expect(deriveResultColumns(query, [{ name: "a" }], TABLES).map((result) => result.key)).toEqual(["name", "_primarycontactid_value"]);
	});

	it("puts a linked Table's Columns under alias.column", () => {
		const query = parse(
			'<fetch><entity name="account"><attribute name="name" /><link-entity name="contact" from="contactid" to="primarycontactid" alias="pc"><attribute name="fullname" /><attribute name="parentcustomerid" /></link-entity></entity></fetch>'
		);
		const rows = [{ name: "a", accountid: "1", "pc.fullname": "Sam", "pc.parentcustomerid": "2", [`pc.parentcustomerid${LOOKUP}`]: "account" }];
		expect(pick(deriveResultColumns(query, rows, TABLES), "key", "label", "type", "table")).toEqual([
			{ key: "name", label: "name", type: "text", table: "account" },
			{ key: "pc.fullname", label: "pc.fullname", type: "text", table: "contact" },
			{ key: "pc.parentcustomerid", label: "pc.parentcustomerid", type: "lookup", table: "contact" },
			{ key: "accountid", label: "accountid", type: "uniqueidentifier", table: "account" },
		]);
	});

	it("unwraps a linked lookup that arrives as alias._name_value", () => {
		const query = parse(
			'<fetch><entity name="account"><link-entity name="contact" from="contactid" to="primarycontactid" alias="pc"><attribute name="parentcustomerid" /></link-entity></entity></fetch>'
		);
		const rows = [{ "pc._parentcustomerid_value": "2" }];
		expect(pick(deriveResultColumns(query, rows, TABLES), "key", "label")).toEqual([{ key: "pc._parentcustomerid_value", label: "pc.parentcustomerid" }]);
	});

	it("names an unaliased linked Table's Columns by the Table and its position, matching whatever number the rows use", () => {
		const query = parse(
			'<fetch><entity name="account"><link-entity name="contact" from="contactid" to="primarycontactid"><attribute name="fullname" /></link-entity></entity></fetch>'
		);
		expect(deriveResultColumns(query, [], TABLES).map((result) => result.key)).toEqual(["contact1.fullname"]);
		expect(pick(deriveResultColumns(query, [{ "contact3.fullname": "Sam", "contact3.contactid": "9" }], TABLES), "key", "table", "primaryKey")).toEqual([
			{ key: "contact3.fullname", table: "contact", primaryKey: false },
			{ key: "contact3.contactid", table: "contact", primaryKey: true },
		]);
	});

	it("shows aggregate and grouped Columns under their alias, counts as numbers", () => {
		const query = parse(
			'<fetch aggregate="true"><entity name="account"><attribute name="industrycode" alias="industry" groupby="true" /><attribute name="accountid" alias="total" aggregate="count" /><attribute name="createdon" alias="year" groupby="true" dategrouping="year" /><link-entity name="contact" from="contactid" to="primarycontactid" alias="pc"><attribute name="fullname" alias="contacts" aggregate="countcolumn" /></link-entity></entity></fetch>'
		);
		const rows = [{ industry: 1, [`industry${FORMATTED}`]: "Accounting", total: 4, year: 2026, contacts: 3 }];
		expect(pick(deriveResultColumns(query, rows, TABLES), "key", "label", "type", "primaryKey")).toEqual([
			{ key: "industry", label: "industry", type: "choice", primaryKey: false },
			{ key: "total", label: "total", type: "number", primaryKey: false },
			{ key: "year", label: "year", type: "number", primaryKey: false },
			{ key: "contacts", label: "contacts", type: "number", primaryKey: false },
		]);
	});

	it("shows an aliased root Column under its alias", () => {
		const query = parse('<fetch><entity name="account"><attribute name="name" alias="title" /></entity></fetch>');
		expect(pick(deriveResultColumns(query, [{ title: "x" }], TABLES), "key", "label", "type")).toEqual([{ key: "title", label: "title", type: "text" }]);
	});

	it("skips switched-off rows and reads Columns from every Table without a Query", () => {
		const query = parse('<fetch><entity name="account"><!--<attribute name="revenue" />--><attribute name="name" /></entity></fetch>');
		expect(deriveResultColumns(query, [], TABLES).map((result) => result.key)).toEqual(["name"]);
		expect(deriveResultColumns(null, [{ b: 1 }, { a: 2, b: 3 }], {}).map((result) => result.key)).toEqual(["b", "a"]);
	});

	it("guesses the primary key from the Table name until metadata arrives", () => {
		const query = parse('<fetch><entity name="account"><attribute name="name" /></entity></fetch>');
		expect(deriveResultColumns(query, [{ name: "a", accountid: "1" }], {}).find((result) => result.key === "accountid")?.primaryKey).toBe(true);
	});
});

describe("queryTableNames", () => {
	it("lists the root Table and each linked Table once", () => {
		const query = parse(
			'<fetch><entity name="Account"><link-entity name="contact" from="contactid" to="primarycontactid"><link-entity name="account" from="accountid" to="parentcustomerid" /></link-entity><filter><link-entity name="systemuser" from="systemuserid" to="ownerid" /></filter></entity></fetch>'
		);
		expect(queryTableNames(query)).toEqual(["account", "contact", "systemuser"]);
		expect(queryTableNames(null)).toEqual([]);
	});
});

describe("keyLabel", () => {
	it("unwraps lookups in the last segment only", () => {
		expect(keyLabel("_ownerid_value")).toBe("ownerid");
		expect(keyLabel("pc._ownerid_value")).toBe("pc.ownerid");
		expect(keyLabel("name")).toBe("name");
	});
});

describe("cellValueText", () => {
	const row = {
		industrycode: 1,
		[`industrycode${FORMATTED}`]: "Accounting",
		_primarycontactid_value: "9b1d",
		[`_primarycontactid_value${FORMATTED}`]: "Sam Smith",
		createdon: "2026-01-01T00:00:00Z",
		[`createdon${FORMATTED}`]: "1/1/2026 12:00 AM",
		donotemail: false,
		empty: null,
		name: "Contoso",
	};

	it("shows the formatted value when friendly", () => {
		expect(cellValueText(row, "industrycode", "friendly")).toBe("Accounting");
		expect(cellValueText(row, "_primarycontactid_value", "friendly")).toBe("Sam Smith");
		expect(cellValueText(row, "createdon", "friendly")).toBe("1/1/2026 12:00 AM");
	});

	it("shows the stored value when raw: the option number, the GUID, the ISO date", () => {
		expect(cellValueText(row, "industrycode", "raw")).toBe("1");
		expect(cellValueText(row, "_primarycontactid_value", "raw")).toBe("9b1d");
		expect(cellValueText(row, "createdon", "raw")).toBe("2026-01-01T00:00:00Z");
		expect(cellValueText(row, "donotemail", "raw")).toBe("false");
	});

	it("falls back to the stored value when there is no formatted value, and leaves empty values empty", () => {
		expect(cellValueText(row, "name", "friendly")).toBe("Contoso");
		expect(cellValueText(row, "empty", "friendly")).toBe("");
		expect(cellValueText(row, "missing", "raw")).toBe("");
	});
});

describe("cellText", () => {
	it("writes scalars as text and objects as JSON", () => {
		expect(cellText(12.5)).toBe("12.5");
		expect(cellText(undefined)).toBe("");
		expect(cellText({ a: 1 })).toBe('{"a":1}');
	});
});
