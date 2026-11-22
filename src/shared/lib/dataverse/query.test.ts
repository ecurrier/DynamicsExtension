import { describe, expect, it } from "vitest";

import { createFakeHttp } from "@/test/fakeHttp";

import { DataverseHttpError } from "./http";
import { columnTypeOf, decodePagingCookie, queryableTables, queryOperations } from "./query";

const label = (text: string) => ({ UserLocalizedLabel: { Label: text } });

const DOCS_COOKIE_ANNOTATION =
	'<cookie pagenumber="2" pagingcookie="%253ccookie%2520page%253d%25221%2522%253e%253cfullname%2520last%253d%2522Susanna%2520Stubberod%2520%2528sample%2529%2522%2520first%253d%2522Yvonne%2520McKay%2520%2528sample%2529%2522%2520%252f%253e%253ccontactid%2520last%253d%2522%257b70BF4D48-34CB-ED11-B596-0022481D68CD%257d%2522%2520first%253d%2522%257b49B0BE2E-D01C-ED11-B83E-000D3A572421%257d%2522%2520%252f%253e%253c%252fcookie%253e" istracking="False" />';

const DOCS_COOKIE =
	'<cookie page="1"><fullname last="Susanna Stubberod (sample)" first="Yvonne McKay (sample)" /><contactid last="{70BF4D48-34CB-ED11-B596-0022481D68CD}" first="{49B0BE2E-D01C-ED11-B83E-000D3A572421}" /></cookie>';

const TYPE_SPECIFIC = ["MaxLength", "Precision", "Format", "DateTimeBehavior", "Targets", "OptionSet"];

const accountMetadata = () => ({
	"EntityDefinitions(LogicalName='account')?$select=LogicalName,SchemaName": {
		LogicalName: "account",
		SchemaName: "Account",
		DisplayName: label("Account"),
		EntitySetName: "accounts",
		PrimaryIdAttribute: "accountid",
		PrimaryNameAttribute: "name",
	},
	"/Attributes?$select=": {
		value: [
			{ LogicalName: "accountid", DisplayName: label("Account"), AttributeType: "Uniqueidentifier", IsPrimaryId: true, IsValidForRead: true },
			{ LogicalName: "name", DisplayName: label("Account Name"), AttributeType: "String", IsPrimaryName: true, IsValidForRead: true },
			{ LogicalName: "industrycode", DisplayName: label("Industry"), AttributeType: "Picklist", IsValidForRead: true },
			{ LogicalName: "statecode", DisplayName: label("Status"), AttributeType: "State", IsValidForRead: true },
			{ LogicalName: "statuscode", DisplayName: label("Status Reason"), AttributeType: "Status", IsValidForRead: true },
			{ LogicalName: "primarycontactid", DisplayName: label("Primary Contact"), AttributeType: "Lookup", IsValidForRead: true },
			{ LogicalName: "primarycontactidname", AttributeType: "String", AttributeOf: "primarycontactid", IsValidForRead: true },
			{ LogicalName: "lastonholdtime", AttributeType: "DateTime", IsValidForRead: true },
			{ LogicalName: "openedon", AttributeType: "DateTime", IsValidForRead: true },
			{
				LogicalName: "new_regions",
				AttributeType: "Virtual",
				AttributeTypeName: { Value: "MultiSelectPicklistType" },
				IsValidForRead: true,
			},
			{ LogicalName: "new_secret", AttributeType: "String", IsValidForRead: false },
		],
	},
	"/ManyToOneRelationships?": {
		value: [{ ReferencingAttribute: "primarycontactid", ReferencedEntity: "contact", ReferencingEntityNavigationPropertyName: "primarycontactid" }],
	},
	"Microsoft.Dynamics.CRM.LookupAttributeMetadata": { value: [{ LogicalName: "primarycontactid", Targets: ["contact"] }] },
	"Microsoft.Dynamics.CRM.DateTimeAttributeMetadata": {
		value: [
			{ LogicalName: "lastonholdtime", DateTimeBehavior: { Value: "UserLocal" }, Format: "DateAndTime" },
			{ LogicalName: "openedon", DateTimeBehavior: { Value: "DateOnly" }, Format: "DateOnly" },
		],
	},
	"Microsoft.Dynamics.CRM.PicklistAttributeMetadata": {
		value: [
			{
				LogicalName: "industrycode",
				OptionSet: {
					Name: "industrycode",
					Options: [
						{ Value: 1, Label: label("Accounting") },
						{ Value: 2, Label: label("Agriculture") },
					],
				},
			},
		],
	},
	"Microsoft.Dynamics.CRM.StateAttributeMetadata": {
		value: [
			{
				LogicalName: "statecode",
				OptionSet: {
					Name: "account_statecode",
					Options: [
						{ Value: 0, Label: label("Active") },
						{ Value: 1, Label: label("Inactive") },
					],
				},
			},
		],
	},
	"Microsoft.Dynamics.CRM.StatusAttributeMetadata": {
		value: [
			{
				LogicalName: "statuscode",
				OptionSet: {
					Name: "account_statuscode",
					Options: [
						{ Value: 1, Label: label("Active") },
						{ Value: 2, Label: label("Inactive") },
					],
				},
			},
		],
	},
	"Microsoft.Dynamics.CRM.MultiSelectPicklistAttributeMetadata": {
		value: [{ LogicalName: "new_regions", OptionSet: { Name: "new_regions", Options: [{ Value: 100000000, Label: label("North") }] } }],
	},
	"?$select=LogicalName&$expand=ManyToOneRelationships(": {
		ManyToOneRelationships: [
			{
				SchemaName: "account_primary_contact",
				ReferencingAttribute: "primarycontactid",
				ReferencedEntity: "contact",
				ReferencedAttribute: "contactid",
				ReferencingEntityNavigationPropertyName: "primarycontactid",
			},
		],
		OneToManyRelationships: [
			{
				SchemaName: "contact_customer_accounts",
				ReferencedAttribute: "accountid",
				ReferencingEntity: "contact",
				ReferencingAttribute: "parentcustomerid",
				ReferencedEntityNavigationPropertyName: "contact_customer_accounts",
			},
		],
		ManyToManyRelationships: [
			{
				SchemaName: "accountleads_association",
				IntersectEntityName: "accountleads",
				Entity1LogicalName: "account",
				Entity1IntersectAttribute: "accountid",
				Entity1NavigationPropertyName: "accountleads_association",
				Entity2LogicalName: "lead",
				Entity2IntersectAttribute: "leadid",
				Entity2NavigationPropertyName: "accountleads_association",
			},
		],
	},
	"EntityDefinitions?$select=LogicalName,EntitySetName": { value: [{ LogicalName: "contact", EntitySetName: "contacts" }] },
});

describe("queryOperations.listTables", () => {
	it("lists queryable tables, intersect tables included, sorted by display name", async () => {
		const { http, calls } = createFakeHttp({
			"EntityDefinitions?": {
				value: [
					{
						LogicalName: "contact",
						DisplayName: label("Contact"),
						EntitySetName: "contacts",
						PrimaryIdAttribute: "contactid",
						PrimaryNameAttribute: "fullname",
					},
					{
						LogicalName: "account",
						DisplayName: label("Account"),
						EntitySetName: "accounts",
						PrimaryIdAttribute: "accountid",
						PrimaryNameAttribute: "name",
					},
					{ LogicalName: "accountleads", EntitySetName: "accountleadscollection", PrimaryIdAttribute: "accountleadid", IsIntersect: true },
					{ LogicalName: "private", EntitySetName: "privates", PrimaryIdAttribute: "privateid", IsPrivate: true },
					{ LogicalName: "nolist", PrimaryIdAttribute: "nolistid" },
				],
			},
		});
		const tables = await queryOperations(http).listTables();
		expect(tables.map((table) => table.logicalName)).toEqual(["account", "accountleads", "contact"]);
		expect(tables[0]).toEqual({
			logicalName: "account",
			displayName: "Account",
			entitySetName: "accounts",
			primaryIdAttribute: "accountid",
			primaryNameAttribute: "name",
			isIntersect: false,
		});
		expect(tables[1]?.isIntersect).toBe(true);
		expect(calls[0]?.path).toBe(
			"EntityDefinitions?$select=LogicalName,DisplayName,EntitySetName,PrimaryIdAttribute,PrimaryNameAttribute,IsIntersect,IsPrivate,IsLogicalEntity"
		);
	});

	it("leaves out logical tables", () => {
		expect(queryableTables([{ LogicalName: "x", EntitySetName: "xs", PrimaryIdAttribute: "xid", IsLogicalEntity: true }])).toEqual([]);
	});

	it("passes a server error through with its message", async () => {
		const { http } = createFakeHttp({
			"EntityDefinitions?": () => {
				throw new DataverseHttpError(403, "Forbidden", JSON.stringify({ error: { message: "Principal user is missing prvReadEntity" } }));
			},
		});
		await expect(queryOperations(http).listTables()).rejects.toMatchObject({
			name: "DataverseHttpError",
			status: 403,
			message: "Principal user is missing prvReadEntity",
		});
	});
});

describe("queryOperations.getTable", () => {
	it("returns typed columns with Choice options, lookup targets and date-only flags", async () => {
		const { http } = createFakeHttp(accountMetadata());
		const table = await queryOperations(http).getTable({ logicalName: "account" });
		expect(table).toMatchObject({
			logicalName: "account",
			displayName: "Account",
			entitySetName: "accounts",
			primaryIdAttribute: "accountid",
			primaryNameAttribute: "name",
		});
		const column = (name: string) => table.columns.find((candidate) => candidate.logicalName === name);
		expect(column("accountid")).toMatchObject({ columnType: "uniqueIdentifier", isPrimaryId: true });
		expect(column("name")).toMatchObject({ columnType: "text", isPrimaryName: true, displayName: "Account Name" });
		expect(column("industrycode")).toMatchObject({
			columnType: "choice",
			options: [
				{ value: 1, label: "Accounting" },
				{ value: 2, label: "Agriculture" },
			],
		});
		expect(column("statecode")).toMatchObject({
			columnType: "stateOrStatus",
			options: [
				{ value: 0, label: "Active" },
				{ value: 1, label: "Inactive" },
			],
		});
		expect(column("statuscode")?.options).toEqual([
			{ value: 1, label: "Active" },
			{ value: 2, label: "Inactive" },
		]);
		expect(column("primarycontactid")).toMatchObject({
			columnType: "lookup",
			targets: [{ logicalName: "contact", navigationProperty: "primarycontactid", entitySetName: "contacts" }],
		});
		expect(column("primarycontactidname")).toMatchObject({ attributeOf: "primarycontactid" });
		expect(column("lastonholdtime")).toMatchObject({ columnType: "dateTime", dateOnly: false });
		expect(column("openedon")).toMatchObject({ columnType: "dateTime", dateOnly: true });
		expect(column("new_regions")).toMatchObject({ columnType: "multiChoice", options: [{ value: 100000000, label: "North" }] });
		expect(column("new_secret")?.isValidForRead).toBe(false);
	});

	it("returns relationships in every direction", async () => {
		const { http } = createFakeHttp(accountMetadata());
		const table = await queryOperations(http).getTable({ logicalName: "account" });
		expect(table.manyToOne).toEqual([
			{
				schemaName: "account_primary_contact",
				lookupColumn: "primarycontactid",
				referencedTable: "contact",
				referencedColumn: "contactid",
				navigationProperty: "primarycontactid",
			},
		]);
		expect(table.oneToMany).toEqual([
			{
				schemaName: "contact_customer_accounts",
				referencedColumn: "accountid",
				referencingTable: "contact",
				referencingColumn: "parentcustomerid",
				navigationProperty: "contact_customer_accounts",
			},
		]);
		expect(table.manyToMany).toEqual([
			{
				schemaName: "accountleads_association",
				intersectTable: "accountleads",
				first: { table: "account", intersectColumn: "accountid", navigationProperty: "accountleads_association" },
				second: { table: "lead", intersectColumn: "leadid", navigationProperty: "accountleads_association" },
			},
		]);
	});

	it("asks for type-specific column properties only through a typed cast", async () => {
		const { http, calls } = createFakeHttp(accountMetadata());
		await queryOperations(http).getTable({ logicalName: "account" });
		const paths = calls.map((call) => decodeURIComponent(call.path));
		const base = paths.find((path) => path.includes("/Attributes?"));
		expect(base).toBeDefined();
		for (const property of TYPE_SPECIFIC) {
			expect(base).not.toContain(property);
		}
		for (const path of paths.filter((candidate) => TYPE_SPECIFIC.some((property) => candidate.includes(property)))) {
			expect(path).toMatch(/\/Attributes\/Microsoft\.Dynamics\.CRM\.[A-Za-z]+AttributeMetadata\?/);
		}
		expect(paths).toContain(
			"EntityDefinitions(LogicalName='account')/Attributes/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName&$expand=OptionSet"
		);
		const relationships = paths.find((path) => path.includes("$expand=ManyToOneRelationships("));
		expect(relationships).toContain("ManyToManyRelationships($select=SchemaName,IntersectEntityName,Entity1LogicalName,Entity1IntersectAttribute");
	});

	it("rejects an invalid logical name and reports a missing table", async () => {
		const { http } = createFakeHttp({});
		await expect(queryOperations(http).getTable({ logicalName: "bad name" })).rejects.toMatchObject({ code: "InvalidArgument" });
		await expect(queryOperations(http).getTable({ logicalName: "nosuchtable" })).rejects.toMatchObject({ code: "NotFound" });
	});

	it("passes a server error on the relationships read through with its message", async () => {
		const { http } = createFakeHttp({
			...accountMetadata(),
			"?$select=LogicalName&$expand=ManyToOneRelationships(": () => {
				throw new DataverseHttpError(400, "Bad Request", JSON.stringify({ error: { message: "Could not find a property named 'Nope'" } }));
			},
		});
		await expect(queryOperations(http).getTable({ logicalName: "account" })).rejects.toMatchObject({
			status: 400,
			message: "Could not find a property named 'Nope'",
		});
	});
});

describe("queryOperations.runQuery", () => {
	const FETCH = '<fetch count="50" page="1"><entity name="account"><attribute name="name" /></entity></fetch>';

	it("sends the Fetch XML exactly as given with every annotation and decodes the paging cookie", async () => {
		const { http, calls } = createFakeHttp({
			"accounts?fetchXml=": {
				"@odata.context": "https://org.crm.dynamics.com/api/data/v9.2/$metadata#accounts(name,accountid)",
				"@Microsoft.Dynamics.CRM.fetchxmlpagingcookie": DOCS_COOKIE_ANNOTATION,
				"@Microsoft.Dynamics.CRM.morerecords": true,
				value: [{ name: "A", accountid: "1" }],
			},
		});
		const result = await queryOperations(http).runQuery({ entitySetName: "accounts", fetchXml: FETCH });
		expect(calls).toHaveLength(1);
		expect(calls[0]?.method).toBe("GET");
		expect(calls[0]?.path).toBe(`accounts?fetchXml=${encodeURIComponent(FETCH)}`);
		expect(calls[0]?.headers).toEqual({ Prefer: 'odata.include-annotations="*"' });
		expect(result.rows).toEqual([{ name: "A", accountid: "1" }]);
		expect(result.moreRecords).toBe(true);
		expect(result.pagingCookie).toBe(DOCS_COOKIE);
		expect(result.totalRecordCount).toBeNull();
		expect(result.totalRecordCountLimitExceeded).toBe(false);
		expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
		expect(result.annotations).toEqual({
			"@odata.context": "https://org.crm.dynamics.com/api/data/v9.2/$metadata#accounts(name,accountid)",
			"@Microsoft.Dynamics.CRM.fetchxmlpagingcookie": DOCS_COOKIE_ANNOTATION,
			"@Microsoft.Dynamics.CRM.morerecords": true,
		});
	});

	it("reports no more Records and no cookie on the last page", async () => {
		const { http } = createFakeHttp({ "accounts?fetchXml=": { value: [{ name: "Last" }] } });
		const result = await queryOperations(http).runQuery({ entitySetName: "accounts", fetchXml: FETCH });
		expect(result).toMatchObject({ rows: [{ name: "Last" }], moreRecords: false, pagingCookie: null });
	});

	it("returns the total count when the Query asked for it", async () => {
		const { http } = createFakeHttp({
			"accounts?fetchXml=": {
				"@odata.count": 5000,
				"@Microsoft.Dynamics.CRM.totalrecordcount": 5000,
				"@Microsoft.Dynamics.CRM.totalrecordcountlimitexceeded": true,
				value: [],
			},
		});
		const result = await queryOperations(http).runQuery({ entitySetName: "accounts", fetchXml: FETCH });
		expect(result).toMatchObject({ totalRecordCount: 5000, totalRecordCountLimitExceeded: true, rows: [] });
	});

	it("passes a server error through with the platform's message", async () => {
		const { http } = createFakeHttp({
			"accounts?fetchXml=": () => {
				throw new DataverseHttpError(
					400,
					"Bad Request",
					JSON.stringify({ error: { code: "0x80041103", message: "'account' entity doesn't contain attribute with Name = 'nope'." } })
				);
			},
		});
		await expect(queryOperations(http).runQuery({ entitySetName: "accounts", fetchXml: FETCH })).rejects.toMatchObject({
			name: "DataverseHttpError",
			status: 400,
			message: "'account' entity doesn't contain attribute with Name = 'nope'.",
		});
	});

	it("rejects an empty query and an invalid entity set name before sending", async () => {
		const { http, calls } = createFakeHttp({});
		await expect(queryOperations(http).runQuery({ entitySetName: "accounts", fetchXml: "  " })).rejects.toMatchObject({ code: "InvalidArgument" });
		await expect(queryOperations(http).runQuery({ entitySetName: "accounts?$top=1", fetchXml: FETCH })).rejects.toMatchObject({ code: "InvalidArgument" });
		expect(calls).toHaveLength(0);
	});
});

describe("decodePagingCookie", () => {
	it("URL-decodes the pagingcookie attribute twice", () => {
		expect(decodePagingCookie(DOCS_COOKIE_ANNOTATION)).toBe(DOCS_COOKIE);
	});

	it("keeps characters that need escaping", () => {
		const cookie = '<cookie page="3"><name last="City Power &amp; Light + Co" first="&lt;A&gt; &quot;B&quot;" /></cookie>';
		const annotation = `<cookie pagenumber="4" pagingcookie="${encodeURIComponent(encodeURIComponent(cookie))}" istracking="False" />`;
		expect(decodePagingCookie(annotation)).toBe(cookie);
	});

	it("reads plus signs as spaces, as form URL decoding does", () => {
		const annotation = `<cookie pagingcookie="${encodeURIComponent("%3ccookie+page%3d%221%22%3e%3c%2fcookie%3e")}" />`;
		expect(decodePagingCookie(annotation)).toBe('<cookie page="1"></cookie>');
	});

	it("returns null when there is no usable cookie", () => {
		expect(decodePagingCookie(undefined)).toBeNull();
		expect(decodePagingCookie('<cookie pagenumber="2" istracking="False" />')).toBeNull();
		expect(decodePagingCookie('<cookie pagingcookie="%E0%A4%A" />')).toBeNull();
	});
});

describe("columnTypeOf", () => {
	it("maps Dataverse attribute types onto Column types", () => {
		expect(columnTypeOf("String", "StringType")).toBe("text");
		expect(columnTypeOf("Memo", "MemoType")).toBe("memo");
		expect(columnTypeOf("Integer", "IntegerType")).toBe("wholeNumber");
		expect(columnTypeOf("BigInt", "BigIntType")).toBe("wholeNumber");
		expect(columnTypeOf("Money", "MoneyType")).toBe("decimalOrMoney");
		expect(columnTypeOf("Double", "DoubleType")).toBe("decimalOrMoney");
		expect(columnTypeOf("Decimal", "DecimalType")).toBe("decimalOrMoney");
		expect(columnTypeOf("DateTime", "DateTimeType")).toBe("dateTime");
		expect(columnTypeOf("Picklist", "PicklistType")).toBe("choice");
		expect(columnTypeOf("Virtual", "MultiSelectPicklistType")).toBe("multiChoice");
		expect(columnTypeOf("Boolean", "BooleanType")).toBe("yesNo");
		expect(columnTypeOf("Lookup", "LookupType")).toBe("lookup");
		expect(columnTypeOf("Customer", "CustomerType")).toBe("lookup");
		expect(columnTypeOf("Owner", "OwnerType")).toBe("owner");
		expect(columnTypeOf("Uniqueidentifier", "UniqueidentifierType")).toBe("uniqueIdentifier");
		expect(columnTypeOf("State", "StateType")).toBe("stateOrStatus");
		expect(columnTypeOf("Status", "StatusType")).toBe("stateOrStatus");
		expect(columnTypeOf("Virtual", "ImageType")).toBeNull();
		expect(columnTypeOf("PartyList", "PartyListType")).toBeNull();
	});
});
