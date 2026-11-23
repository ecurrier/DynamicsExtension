import { describe, expect, it } from "vitest";

import { connectionApiBaseUrl, connectionRecordAppUrl, recordAppUrl, recordLink } from "./recordLinks";
import { type ResultGridColumn } from "./results";

const ID = "9B1DEB4D-3B7D-4BAD-9BDD-2B0D7B3DCB6D";
const id = ID.toLowerCase();

const column = (overrides: Partial<ResultGridColumn>): ResultGridColumn => ({
	key: "accountid",
	label: "accountid",
	type: "uniqueidentifier",
	table: "account",
	column: "accountid",
	primaryKey: true,
	...overrides,
});

describe("recordAppUrl", () => {
	it("keeps the origin and the app of a model-driven app URL", () => {
		expect(recordAppUrl("https://org.crm.dynamics.com/main.aspx?appid=123&pagetype=entitylist&etn=account")).toBe(
			"https://org.crm.dynamics.com/main.aspx?appid=123"
		);
	});

	it("falls back to the unified interface without an app, and accepts a bare host", () => {
		expect(recordAppUrl("https://org.crm4.dynamics.com/")).toBe("https://org.crm4.dynamics.com/main.aspx?forceUCI=1");
		expect(recordAppUrl("org.crm.dynamics.com")).toBe("https://org.crm.dynamics.com/main.aspx?forceUCI=1");
	});

	it("gives nothing for a missing URL", () => {
		expect(recordAppUrl(null)).toBeNull();
		expect(recordAppUrl("")).toBeNull();
	});
});

describe("connectionApiBaseUrl", () => {
	const sources = { environmentUrl: "https://dev.crm.dynamics.com/", tabUrl: "https://prod.crm.dynamics.com/main.aspx?appid=tab&id=1" };

	it("uses the origin of the source tab for a Page connection", () => {
		expect(connectionApiBaseUrl({ kind: "page" }, sources)).toBe("https://prod.crm.dynamics.com/api/data/v9.2/");
	});

	it("uses the Environment's URL for an Environment connection", () => {
		expect(connectionApiBaseUrl({ kind: "environment", environmentId: "env-dev" }, sources)).toBe("https://dev.crm.dynamics.com/api/data/v9.2/");
	});

	it("gives null when the Connection has no URL", () => {
		expect(connectionApiBaseUrl({ kind: "page" }, { environmentUrl: null, tabUrl: null })).toBeNull();
	});
});

describe("connectionRecordAppUrl", () => {
	const sources = { environmentUrl: "https://dev.crm.dynamics.com/main.aspx?appid=env", tabUrl: "https://prod.crm.dynamics.com/main.aspx?appid=tab&id=1" };

	it("uses the source tab for a Page connection", () => {
		expect(connectionRecordAppUrl({ kind: "page" }, sources)).toBe("https://prod.crm.dynamics.com/main.aspx?appid=tab");
	});

	it("uses the Environment's URL for an Environment connection", () => {
		expect(connectionRecordAppUrl({ kind: "environment", environmentId: "e" }, sources)).toBe("https://dev.crm.dynamics.com/main.aspx?appid=env");
	});
});

describe("recordLink", () => {
	const app = "https://org.crm.dynamics.com/main.aspx?appid=1";

	it("opens the row's Record from its primary key", () => {
		expect(recordLink({ accountid: ID }, column({}), app)).toBe(`${app}&pagetype=entityrecord&etn=account&id=${id}`);
	});

	it("opens the referenced Record of a lookup from its logical-name annotation", () => {
		const lookup = column({ key: "_primarycontactid_value", label: "primarycontactid", type: "lookup", column: "primarycontactid", primaryKey: false });
		const row = { _primarycontactid_value: id, "_primarycontactid_value@Microsoft.Dynamics.CRM.lookuplogicalname": "contact" };
		expect(recordLink(row, lookup, app)).toBe(`${app}&pagetype=entityrecord&etn=contact&id=${id}`);
	});

	it("opens a linked Table's primary key in that Table", () => {
		expect(recordLink({ "pc.contactid": id }, column({ key: "pc.contactid", table: "contact", column: "contactid" }), app)).toBe(
			`${app}&pagetype=entityrecord&etn=contact&id=${id}`
		);
	});

	it("gives no link for ordinary Columns, empty values, values that are not GUIDs, or no base URL", () => {
		expect(recordLink({ name: id }, column({ key: "name", primaryKey: false }), app)).toBeNull();
		expect(recordLink({}, column({}), app)).toBeNull();
		expect(recordLink({ accountid: "nope" }, column({}), app)).toBeNull();
		expect(recordLink({ accountid: id }, column({}), null)).toBeNull();
	});
});
