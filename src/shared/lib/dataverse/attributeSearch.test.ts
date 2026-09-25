import { describe, expect, it } from "vitest";

import { createFakeHttp } from "@/test/fakeHttp";

import { attributeSearchOperations } from "./attributeSearch";

const entity = (logicalName: string, attribute: Record<string, unknown> | null) => ({
	LogicalName: logicalName,
	DisplayName: { UserLocalizedLabel: { Label: logicalName === "account" ? "Account" : "Contact" } },
	Attributes: attribute ? [attribute] : [],
});

const attribute = (overrides: Record<string, unknown> = {}) => ({
	LogicalName: "new_region",
	AttributeType: "String",
	MetadataId: "m1",
	IsManaged: false,
	IsCustomizable: { Value: true },
	RequiredLevel: { Value: "None" },
	DisplayName: { UserLocalizedLabel: { Label: "Region" } },
	Description: { UserLocalizedLabel: { Label: "Sales region" } },
	...overrides,
});

describe("findAttributeAcrossTables", () => {
	it("finds every table carrying the column in one request", async () => {
		const { http, calls } = createFakeHttp({
			EntityDefinitions: { value: [entity("account", attribute()), entity("contact", attribute({ MetadataId: "m2" }))] },
		});
		const matches = await attributeSearchOperations(http).findAttributeAcrossTables({ logicalName: "new_region" });
		expect(calls).toHaveLength(1);
		expect(matches.map((match) => match.tableLogicalName)).toEqual(["account", "contact"]);
		expect(matches[0]).toMatchObject({
			tableDisplayName: "Account",
			label: "Region",
			description: "Sales region",
			requiredLevel: "None",
			isCustomizable: true,
		});
	});

	it("skips tables where the expand returned nothing", async () => {
		const { http } = createFakeHttp({ EntityDefinitions: { value: [entity("account", attribute()), entity("contact", null)] } });
		expect(await attributeSearchOperations(http).findAttributeAcrossTables({ logicalName: "new_region" })).toHaveLength(1);
	});

	it("treats a missing IsCustomizable as customizable, and an explicit false as not", async () => {
		const { http } = createFakeHttp({
			EntityDefinitions: {
				value: [entity("account", attribute({ IsCustomizable: null })), entity("contact", attribute({ IsCustomizable: { Value: false } }))],
			},
		});
		const matches = await attributeSearchOperations(http).findAttributeAcrossTables({ logicalName: "new_region" });
		expect(matches.map((match) => match.isCustomizable)).toEqual([true, false]);
	});

	it("sends nothing for an empty search", async () => {
		const { http, calls } = createFakeHttp();
		expect(await attributeSearchOperations(http).findAttributeAcrossTables({ logicalName: "   " })).toEqual([]);
		expect(calls).toEqual([]);
	});

	it("escapes a quote in the column name rather than breaking the filter", async () => {
		const { http, calls } = createFakeHttp({ EntityDefinitions: { value: [] } });
		await attributeSearchOperations(http).findAttributeAcrossTables({ logicalName: "new_o'brien" });
		expect(decodeURIComponent(calls[0]!.path)).toContain("new_o''brien");
	});

	it("selects only properties every column type has, so the request works whatever the column is", async () => {
		const { http, calls } = createFakeHttp({ EntityDefinitions: { value: [] } });
		await attributeSearchOperations(http).findAttributeAcrossTables({ logicalName: "new_region" });
		const path = decodeURIComponent(calls[0]!.path);
		for (const property of ["MaxLength", "MinValue", "MaxValue", "Precision"]) {
			expect(path).not.toContain(property);
		}
	});

	it("keeps each column's exact metadata type when the response names one", async () => {
		const { http } = createFakeHttp({
			EntityDefinitions: {
				value: [
					entity("account", attribute({ "@odata.type": "#Microsoft.Dynamics.CRM.StringAttributeMetadata" })),
					entity("contact", attribute({ MetadataId: "m2" })),
				],
			},
		});
		const matches = await attributeSearchOperations(http).findAttributeAcrossTables({ logicalName: "new_region" });
		expect(matches.map((match) => match.metadataType)).toEqual(["Microsoft.Dynamics.CRM.StringAttributeMetadata", null]);
		expect(matches[0]?.maxLength).toBeNull();
	});
});

describe("readAttributeDetails", () => {
	it("reads a text column's maximum length through its own metadata type", async () => {
		const { http, calls } = createFakeHttp({ StringAttributeMetadata: { MaxLength: 200 } });
		const details = await attributeSearchOperations(http).readAttributeDetails({ tableLogicalName: "account", metadataId: "m1", attributeType: "String" });
		expect(details).toEqual({ maxLength: 200, minValue: null, maxValue: null, precision: null });
		expect(calls[0]?.path).toBe("EntityDefinitions(LogicalName='account')/Attributes(m1)/Microsoft.Dynamics.CRM.StringAttributeMetadata?$select=MaxLength");
	});

	it("reads a decimal column's range and decimal places", async () => {
		const { http, calls } = createFakeHttp({ DecimalAttributeMetadata: { MinValue: 0, MaxValue: 1000, Precision: 2 } });
		const details = await attributeSearchOperations(http).readAttributeDetails({ tableLogicalName: "account", metadataId: "m1", attributeType: "Decimal" });
		expect(details).toEqual({ maxLength: null, minValue: 0, maxValue: 1000, precision: 2 });
		expect(calls[0]?.path).toContain("$select=MinValue,MaxValue,Precision");
	});

	it("sends nothing for a type without extra settings", async () => {
		const { http, calls } = createFakeHttp();
		const details = await attributeSearchOperations(http).readAttributeDetails({ tableLogicalName: "account", metadataId: "m1", attributeType: "Lookup" });
		expect(details).toEqual({ maxLength: null, minValue: null, maxValue: null, precision: null });
		expect(calls).toEqual([]);
	});
});

describe("updateAttribute", () => {
	const base = { tableLogicalName: "account", columnLogicalName: "new_region", attributeType: "String", metadataId: "m1" };

	it("sends only the properties the caller supplied", async () => {
		const { http, calls } = createFakeHttp();
		await attributeSearchOperations(http).updateAttribute({ ...base, label: "Sales region" });
		const body = calls[0]?.body as Record<string, unknown>;
		expect(Object.keys(body)).toEqual(["@odata.type", "MetadataId", "LogicalName", "DisplayName"]);
		expect(body["@odata.type"]).toBe("Microsoft.Dynamics.CRM.StringAttributeMetadata");
	});

	it("declares the metadata type the search reported, which is not always the attribute type", async () => {
		const { http, calls } = createFakeHttp();
		await attributeSearchOperations(http).updateAttribute({
			...base,
			attributeType: "Customer",
			metadataType: "Microsoft.Dynamics.CRM.LookupAttributeMetadata",
			label: "Customer",
		});
		expect((calls[0]?.body as Record<string, unknown>)["@odata.type"]).toBe("Microsoft.Dynamics.CRM.LookupAttributeMetadata");
	});

	it("PUTs to the attribute with merge labels on", async () => {
		const { http, calls } = createFakeHttp();
		await attributeSearchOperations(http).updateAttribute({ ...base, description: "Where the account trades" });
		expect(calls[0]?.method).toBe("PUT");
		expect(calls[0]?.path).toBe("EntityDefinitions(LogicalName='account')/Attributes(m1)");
		expect(calls[0]?.headers).toMatchObject({ "MSCRM.MergeLabels": "true" });
	});

	it("adds the solution header when a solution was chosen", async () => {
		const { http, calls } = createFakeHttp();
		await attributeSearchOperations(http).updateAttribute({ ...base, requiredLevel: "Recommended", solutionUniqueName: "ContosoCore" });
		expect(calls[0]?.headers).toMatchObject({ "MSCRM.SolutionUniqueName": "ContosoCore" });
	});

	it("can set all three properties at once", async () => {
		const { http, calls } = createFakeHttp();
		await attributeSearchOperations(http).updateAttribute({ ...base, label: "A", description: "B", requiredLevel: "None" });
		expect(Object.keys(calls[0]?.body as Record<string, unknown>)).toContain("RequiredLevel");
	});
});
