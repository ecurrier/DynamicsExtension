import { describe, expect, it } from "vitest";

import { type AttributeDefinition, type LookupSelection } from "@/shared/types";

import { buildUpdatePayload, currentLookupTarget, displayRecordValue, draftToFieldValue, EMPTY_DRAFT, initialDraft } from "./fieldValue";

const definition = (overrides: Partial<AttributeDefinition>): AttributeDefinition => ({
	logicalName: "field",
	displayName: "Field",
	attributeType: "String",
	targets: [],
	options: [],
	dateTimeFormat: null,
	...overrides,
});

const contactSelection: LookupSelection = {
	id: "abc",
	name: "Jane Doe",
	entityLogicalName: "contact",
	entitySetName: "contacts",
	navigationProperty: "customerid_contact",
};

describe("buildUpdatePayload", () => {
	it("clears plain fields", () => {
		expect(buildUpdatePayload(definition({}), { kind: "clear" })).toEqual({ field: null });
	});

	it("binds lookups through the resolved navigation property and entity set", () => {
		expect(
			buildUpdatePayload(definition({ attributeType: "Lookup" }), {
				kind: "lookup",
				navigationProperty: "new_ParentAccountId",
				entitySetName: "accounts",
				id: "abc",
			})
		).toEqual({ "new_ParentAccountId@odata.bind": "/accounts(abc)" });
		expect(
			buildUpdatePayload(definition({ attributeType: "Customer" }), {
				kind: "lookup",
				navigationProperty: "customerid_contact",
				entitySetName: "contacts",
				id: "abc",
			})
		).toEqual({ "customerid_contact@odata.bind": "/contacts(abc)" });
		expect(
			buildUpdatePayload(definition({ logicalName: "ownerid", attributeType: "Owner" }), {
				kind: "lookup",
				navigationProperty: "ownerid",
				entitySetName: "teams",
				id: "team-1",
			})
		).toEqual({ "ownerid@odata.bind": "/teams(team-1)" });
	});

	it("serialises scalar values", () => {
		expect(buildUpdatePayload(definition({ attributeType: "Integer" }), { kind: "number", value: 5 })).toEqual({
			field: 5,
		});
		expect(buildUpdatePayload(definition({ attributeType: "Boolean" }), { kind: "boolean", value: true })).toEqual({
			field: true,
		});
		expect(buildUpdatePayload(definition({ attributeType: "Picklist" }), { kind: "choice", value: 100000001 })).toEqual({ field: 100000001 });
		expect(buildUpdatePayload(definition({ attributeType: "Virtual" }), { kind: "multiChoice", values: [1, 2] })).toEqual({ field: "1,2" });
		expect(buildUpdatePayload(definition({ attributeType: "DateTime" }), { kind: "dateTime", value: "2024-01-31" })).toEqual({ field: "2024-01-31" });
	});
});

describe("draftToFieldValue", () => {
	it("validates numbers by type", () => {
		expect(draftToFieldValue(definition({ attributeType: "Integer" }), { ...EMPTY_DRAFT, number: "1.5" })).toEqual({
			ok: false,
			message: "Enter a whole number",
		});
		expect(draftToFieldValue(definition({ attributeType: "Decimal" }), { ...EMPTY_DRAFT, number: "1.5" })).toEqual({
			ok: true,
			value: { kind: "number", value: 1.5 },
		});
		expect(draftToFieldValue(definition({ attributeType: "Money" }), { ...EMPTY_DRAFT, number: "x" })).toEqual({
			ok: false,
			message: "Enter a number",
		});
	});

	it("handles dates, lookups, booleans, and clears", () => {
		expect(
			draftToFieldValue(definition({ attributeType: "DateTime", dateTimeFormat: "DateOnly" }), {
				...EMPTY_DRAFT,
				date: "2024-02-01",
			})
		).toEqual({
			ok: true,
			value: { kind: "dateTime", value: "2024-02-01" },
		});
		const dateAndTime = draftToFieldValue(definition({ attributeType: "DateTime", dateTimeFormat: "DateAndTime" }), {
			...EMPTY_DRAFT,
			date: "2024-02-01T10:30",
		});
		expect(dateAndTime.ok && dateAndTime.value.kind === "dateTime" && dateAndTime.value.value.endsWith("Z")).toBe(true);
		expect(draftToFieldValue(definition({ attributeType: "Customer" }), { ...EMPTY_DRAFT, lookup: null })).toEqual({
			ok: false,
			message: "Select a record",
		});
		expect(draftToFieldValue(definition({ attributeType: "Customer" }), { ...EMPTY_DRAFT, lookup: contactSelection })).toEqual({
			ok: true,
			value: { kind: "lookup", navigationProperty: "customerid_contact", entitySetName: "contacts", id: "abc" },
		});
		expect(draftToFieldValue(definition({ attributeType: "Boolean" }), { ...EMPTY_DRAFT, choice: "1" })).toEqual({
			ok: true,
			value: { kind: "boolean", value: true },
		});
		expect(draftToFieldValue(definition({}), { ...EMPTY_DRAFT, clear: true })).toEqual({
			ok: true,
			value: { kind: "clear" },
		});
	});

	it("pre-selects single options and starts lookups empty", () => {
		expect(initialDraft(definition({ attributeType: "Picklist", options: [{ value: 7, label: "Only" }] })).choice).toBe("7");
		expect(
			initialDraft(
				definition({
					attributeType: "Lookup",
					targets: [{ logicalName: "systemuser", navigationProperty: "field" }],
				})
			).lookup
		).toBeNull();
	});
});

describe("currentLookupTarget", () => {
	const customer = definition({
		logicalName: "customerid",
		attributeType: "Customer",
		targets: [
			{ logicalName: "account", navigationProperty: "customerid_account" },
			{ logicalName: "contact", navigationProperty: "customerid_contact" },
		],
	});

	it("picks the target named by the lookup annotation", () => {
		expect(
			currentLookupTarget(customer, {
				_customerid_value: "abc",
				"_customerid_value@Microsoft.Dynamics.CRM.lookuplogicalname": "contact",
			})
		).toEqual({ logicalName: "contact", navigationProperty: "customerid_contact" });
	});

	it("falls back to the first target and returns null when empty", () => {
		expect(currentLookupTarget(customer, { _customerid_value: "abc" })).toEqual({
			logicalName: "account",
			navigationProperty: "customerid_account",
		});
		expect(currentLookupTarget(customer, { _customerid_value: null })).toBeNull();
		expect(currentLookupTarget(customer, {})).toBeNull();
	});
});

describe("displayRecordValue", () => {
	it("formats lookups, choices, and plain values", () => {
		const values = {
			_owner_value: "id-1",
			"_owner_value@OData.Community.Display.V1.FormattedValue": "Jane Doe",
			"_owner_value@Microsoft.Dynamics.CRM.lookuplogicalname": "systemuser",
			statuscode: 1,
			"statuscode@OData.Community.Display.V1.FormattedValue": "Active",
			name: "Contoso",
			revenue: 10,
			"revenue@OData.Community.Display.V1.FormattedValue": "$10.00",
		};
		expect(displayRecordValue(definition({ logicalName: "owner", attributeType: "Owner" }), values)).toBe("Jane Doe (systemuser)");
		expect(displayRecordValue(definition({ logicalName: "statuscode", attributeType: "Status" }), values)).toBe("Active");
		expect(displayRecordValue(definition({ logicalName: "name" }), values)).toBe("Contoso");
		expect(displayRecordValue(definition({ logicalName: "revenue", attributeType: "Money" }), values)).toBe("$10.00");
		expect(displayRecordValue(definition({ logicalName: "missing" }), values)).toBeNull();
	});
});
