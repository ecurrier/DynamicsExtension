import { describe, expect, it } from "vitest";

import { type TransportAttribute } from "@/shared/types";

import { buildTransportPayload, lookupTargetsNeeded, type PayloadContext } from "./payload";

const CONTACT = "11111111-1111-4111-8111-111111111111";
const ACCOUNT = "22222222-2222-4222-8222-222222222222";

const attribute = (logicalName: string, overrides: Partial<TransportAttribute> = {}): TransportAttribute => ({
	logicalName,
	displayName: logicalName,
	attributeType: "String",
	attributeOf: null,
	isPrimaryId: false,
	isValidForCreate: true,
	isValidForUpdate: true,
	isLogical: false,
	targets: [],
	...overrides,
});

const context: PayloadContext = {
	primaryIdAttribute: "accountid",
	entitySets: { contact: "contacts", account: "accounts", systemuser: "systemusers" },
	selected: new Set(["name", "revenue", "primarycontactid", "customerid", "ownerid", "createdon", "activityparties"]),
	attributes: [
		attribute("name"),
		attribute("revenue", { attributeType: "Money" }),
		attribute("primarycontactid", {
			attributeType: "Lookup",
			targets: [{ logicalName: "contact", navigationProperty: "primarycontactid" }],
		}),
		attribute("customerid", {
			attributeType: "Customer",
			targets: [
				{ logicalName: "account", navigationProperty: "customerid_account" },
				{ logicalName: "contact", navigationProperty: "customerid_contact" },
			],
		}),
		attribute("ownerid", {
			attributeType: "Owner",
			targets: [{ logicalName: "systemuser", navigationProperty: "ownerid" }],
		}),
		attribute("createdon", { attributeType: "DateTime", isValidForCreate: false, isValidForUpdate: false }),
		attribute("activityparties", { attributeType: "PartyList" }),
		attribute("ignored"),
	],
};

const row = {
	accountid: ACCOUNT,
	name: "Contoso",
	revenue: 100,
	_primarycontactid_value: CONTACT.toUpperCase(),
	_customerid_value: ACCOUNT,
	"_customerid_value@Microsoft.Dynamics.CRM.lookuplogicalname": "account",
	_ownerid_value: null,
	ignored: "x",
};

describe("buildTransportPayload", () => {
	it("binds lookups to the target entity sets and sets the id on create", () => {
		const result = buildTransportPayload(row, ACCOUNT, context, "create");
		expect(result.payload).toEqual({
			accountid: ACCOUNT,
			name: "Contoso",
			revenue: 100,
			"primarycontactid@odata.bind": `/contacts(${CONTACT})`,
			"customerid_account@odata.bind": `/accounts(${ACCOUNT})`,
		});
		expect(result.skipped).toEqual([
			{ field: "ownerid", reason: "Empty lookup values are left unchanged" },
			{ field: "createdon", reason: "Not valid for create" },
			{ field: "activityparties", reason: "PartyList attributes are not transported" },
		]);
	});

	it("passes nulls through on update but not on create", () => {
		const nulls = { ...row, name: null };
		expect(buildTransportPayload(nulls, ACCOUNT, context, "update").payload).toMatchObject({ name: null });
		expect(buildTransportPayload(nulls, ACCOUNT, context, "create").payload).not.toHaveProperty("name");
		expect(buildTransportPayload(nulls, ACCOUNT, context, "update").payload).not.toHaveProperty("accountid");
	});

	it("reports lookups whose target entity set is unknown", () => {
		const result = buildTransportPayload(row, ACCOUNT, { ...context, entitySets: {} }, "update");
		expect(result.skipped).toContainEqual({ field: "primarycontactid", reason: "No entity set known for contact" });
	});

	it("lists the target entities needed by the selected lookups", () => {
		expect(lookupTargetsNeeded(context.attributes, context.selected)).toEqual(["account", "contact", "systemuser"]);
		expect(lookupTargetsNeeded(context.attributes, new Set(["name"]))).toEqual([]);
	});
});
