import { describe, expect, it } from "vitest";

import { createFakeHttp } from "@/test/fakeHttp";

import { existenceFetchXml, selectableEntities, transportOperations } from "./transport";

const API = "https://org.crm.dynamics.com/api/data/v9.2/";
const RECORD = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

const label = (text: string) => ({ UserLocalizedLabel: { Label: text } });

describe("transportOperations", () => {
	it("lists writable entities sorted by display name", () => {
		const entities = selectableEntities([
			{
				LogicalName: "contact",
				DisplayName: label("Contact"),
				EntitySetName: "contacts",
				PrimaryIdAttribute: "contactid",
			},
			{
				LogicalName: "account",
				DisplayName: label("Account"),
				EntitySetName: "accounts",
				PrimaryIdAttribute: "accountid",
			},
			{ LogicalName: "link", EntitySetName: "links", PrimaryIdAttribute: "linkid", IsIntersect: true },
			{ LogicalName: "nolist", PrimaryIdAttribute: "nolistid" },
		]);
		expect(entities.map((entity) => entity.logicalName)).toEqual(["account", "contact"]);
		expect(entities[0]).toEqual({
			logicalName: "account",
			displayName: "Account",
			entitySetName: "accounts",
			primaryIdAttribute: "accountid",
			primaryNameAttribute: null,
		});
	});

	it("lists views with fetchxml for an entity", async () => {
		const { http, calls } = createFakeHttp({
			"savedqueries?": {
				value: [
					{ savedqueryid: RECORD, name: "Active Accounts", fetchxml: "<fetch/>", querytype: 0, isdefault: true },
					{ savedqueryid: OTHER, name: "Broken", fetchxml: null },
				],
			},
		});
		await expect(transportOperations(http).listViews({ entityLogicalName: "account" })).resolves.toEqual([
			{ id: RECORD, name: "Active Accounts", fetchXml: "<fetch/>", queryType: 0, isDefault: true },
		]);
		expect(decodeURIComponent(calls[0]?.path ?? "")).toContain("returnedtypecode eq 'account' and fetchxml ne null");
		await expect(transportOperations(http).listViews({ entityLogicalName: "bad name" })).rejects.toMatchObject({
			code: "InvalidArgument",
		});
	});

	it("merges attribute flags, lookup targets, and navigation properties", async () => {
		const { http } = createFakeHttp({
			"EntityDefinitions(LogicalName='account')?": {
				LogicalName: "account",
				DisplayName: label("Account"),
				EntitySetName: "accounts",
				PrimaryIdAttribute: "accountid",
				PrimaryNameAttribute: "name",
				Attributes: [
					{
						LogicalName: "name",
						DisplayName: label("Name"),
						AttributeType: "String",
						IsValidForCreate: true,
						IsValidForUpdate: true,
					},
					{ LogicalName: "primarycontactid", AttributeType: "Lookup", IsValidForCreate: true, IsValidForUpdate: true },
					{ LogicalName: "accountid", AttributeType: "Uniqueidentifier", IsPrimaryId: true },
				],
			},
			LookupAttributeMetadata: { value: [{ LogicalName: "primarycontactid", Targets: ["contact"] }] },
			ManyToOneRelationships: {
				value: [
					{
						ReferencingAttribute: "primarycontactid",
						ReferencedEntity: "contact",
						ReferencingEntityNavigationPropertyName: "primarycontactid",
					},
				],
			},
		});
		const metadata = await transportOperations(http).getEntityMetadata({ logicalName: "account" });
		expect(metadata.info).toMatchObject({
			logicalName: "account",
			entitySetName: "accounts",
			primaryNameAttribute: "name",
		});
		expect(metadata.attributes.map((attribute) => attribute.logicalName)).toEqual(["accountid", "name", "primarycontactid"]);
		expect(metadata.attributes[2]).toMatchObject({
			attributeType: "Lookup",
			targets: [{ logicalName: "contact", navigationProperty: "primarycontactid" }],
		});
		expect(metadata.attributes[0]).toMatchObject({ isPrimaryId: true, isValidForCreate: false });
	});

	it("retrieves pages with annotations and follows next links", async () => {
		const { http, calls } = createFakeHttp({
			"accounts?$skiptoken": { value: [{ accountid: OTHER }] },
			"accounts?fetchXml": { value: [{ accountid: RECORD }], "@odata.nextLink": `${API}accounts?$skiptoken=abc` },
		});
		const operations = transportOperations(http);
		const first = await operations.retrievePage({
			entitySetName: "accounts",
			fetchXml: "<fetch/>",
			nextLink: null,
			pageSize: 500,
		});
		expect(first).toEqual({ rows: [{ accountid: RECORD }], nextLink: `${API}accounts?$skiptoken=abc` });
		expect(calls[0]?.headers).toEqual({ Prefer: 'odata.maxpagesize=500, odata.include-annotations="*"' });
		const second = await operations.retrievePage({
			entitySetName: "accounts",
			fetchXml: null,
			nextLink: first.nextLink,
			pageSize: 500,
		});
		expect(second).toEqual({ rows: [{ accountid: OTHER }], nextLink: null });
		expect(calls[1]?.path).toBe("accounts?$skiptoken=abc");
		await expect(operations.retrievePage({ entitySetName: "accounts", fetchXml: "  ", nextLink: null, pageSize: 500 })).rejects.toMatchObject({
			code: "InvalidArgument",
		});
	});

	it("checks existence in chunks of ids", async () => {
		const ids = Array.from({ length: 450 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`);
		const { http, calls } = createFakeHttp({
			"accounts?fetchXml": { value: [{ accountid: ids[0]?.toUpperCase() }, { accountid: 7 }] },
		});
		const found = await transportOperations(http).existingIds({
			entityLogicalName: "account",
			entitySetName: "accounts",
			primaryIdAttribute: "accountid",
			ids,
		});
		expect(calls).toHaveLength(3);
		expect(found).toEqual([ids[0], ids[0], ids[0]]);
		expect(decodeURIComponent(calls[0]?.path ?? "")).toContain('operator="in"');
		expect(existenceFetchXml("account", "accountid", ["a", "b"])).toContain("<value>a</value><value>b</value>");
	});

	it("creates, updates with If-Match, and deletes by entity set", async () => {
		const { http, calls } = createFakeHttp();
		const operations = transportOperations(http);
		await operations.create({ entitySetName: "accounts", payload: { name: "A" } });
		await operations.update({ entitySetName: "accounts", id: RECORD, payload: { name: "B" } });
		await operations.remove({ entitySetName: "accounts", id: OTHER });
		expect(calls).toEqual([
			{ method: "POST", path: "accounts", body: { name: "A" } },
			{ method: "PATCH", path: `accounts(${RECORD})`, body: { name: "B" }, headers: { "If-Match": "*" } },
			{ method: "DELETE", path: `accounts(${OTHER})` },
		]);
		await expect(operations.remove({ entitySetName: "accounts", id: "nope" })).rejects.toMatchObject({
			code: "InvalidArgument",
		});
	});
});
