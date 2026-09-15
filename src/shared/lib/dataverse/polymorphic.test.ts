import { describe, expect, it } from "vitest";

import { createFakeHttp } from "@/test/fakeHttp";

import { MAX_RELATIONSHIP_SCHEMA_NAME, polymorphicOperations, relationshipSchemaName } from "./polymorphic";

const relationship = (id: string, referenced: string, attribute: string) => ({
	MetadataId: id,
	SchemaName: `${referenced}_account_${attribute}`,
	ReferencedEntity: referenced,
	ReferencingEntity: "account",
	ReferencingAttribute: attribute,
});

describe("relationshipSchemaName", () => {
	it("names a relationship after its target, table and column", () => {
		expect(relationshipSchemaName("contact", "account", "new_RelatedTo")).toBe("contact_account_new_RelatedTo");
	});

	it("truncates at the platform limit rather than being rejected", () => {
		const name = relationshipSchemaName("a".repeat(60), "b".repeat(60), "c".repeat(60));
		expect(name).toHaveLength(MAX_RELATIONSHIP_SCHEMA_NAME);
	});
});

describe("listPolymorphicLookups", () => {
	it("treats a column with more than one relationship as polymorphic, and ignores ordinary lookups", async () => {
		const { http } = createFakeHttp({
			RelationshipDefinitions: {
				value: [
					relationship("r1", "contact", "new_relatedto"),
					relationship("r2", "lead", "new_relatedto"),
					relationship("r3", "systemuser", "ownerid"),
				],
			},
		});
		const lookups = await polymorphicOperations(http).listPolymorphicLookups({ tableLogicalName: "account" });
		expect(lookups).toHaveLength(1);
		expect(lookups[0]?.columnLogicalName).toBe("new_relatedto");
		expect(lookups[0]?.targets.map((target) => target.tableLogicalName)).toEqual(["contact", "lead"]);
		expect(lookups[0]?.targets[0]?.relationshipId).toBe("r1");
	});

	it("asks only for the relationships of the table it was given", async () => {
		const { http, calls } = createFakeHttp({ RelationshipDefinitions: { value: [] } });
		await polymorphicOperations(http).listPolymorphicLookups({ tableLogicalName: "account" });
		expect(calls[0]?.path).toContain("ReferencingEntity eq 'account'");
		expect(calls[0]?.path).toContain("OneToManyRelationshipMetadata");
	});
});

describe("createPolymorphicLookup", () => {
	const request = {
		tableLogicalName: "account",
		columnSchemaName: "new_RelatedTo",
		label: "Related to",
		targetTableLogicalNames: ["contact", "lead"],
	};

	it("posts the lookup as ComplexLookupAttributeMetadata, which is what this message requires", async () => {
		const { http, calls } = createFakeHttp();
		await polymorphicOperations(http).createPolymorphicLookup(request);
		const body = calls[0]!.body as { Lookup: Record<string, unknown> };
		expect(calls[0]?.path).toBe("CreatePolymorphicLookupAttribute");
		expect(body.Lookup["@odata.type"]).toBe("Microsoft.Dynamics.CRM.ComplexLookupAttributeMetadata");
		expect(body.Lookup.AttributeTypeName).toEqual({ Value: "LookupType" });
	});

	it("carries the solution in the body, because this message takes it as a parameter and not a header", async () => {
		const { http, calls } = createFakeHttp();
		await polymorphicOperations(http).createPolymorphicLookup({ ...request, solutionUniqueName: "ContosoCore" });
		expect((calls[0]?.body as Record<string, unknown>).SolutionUniqueName).toBe("ContosoCore");
		expect(calls[0]?.headers).not.toHaveProperty("MSCRM.SolutionUniqueName");
	});

	it("omits the solution entirely when none was chosen", async () => {
		const { http, calls } = createFakeHttp();
		await polymorphicOperations(http).createPolymorphicLookup(request);
		expect(calls[0]?.body).not.toHaveProperty("SolutionUniqueName");
	});

	it("builds one relationship per target", async () => {
		const { http, calls } = createFakeHttp();
		await polymorphicOperations(http).createPolymorphicLookup(request);
		const body = calls[0]?.body as { OneToManyRelationships: { ReferencedEntity: string }[] };
		expect(body.OneToManyRelationships.map((entry) => entry.ReferencedEntity)).toEqual(["contact", "lead"]);
	});
});

describe("addPolymorphicTarget", () => {
	const request = {
		tableLogicalName: "account",
		columnSchemaName: "new_RelatedTo",
		columnLogicalName: "new_relatedto",
		label: "Related to",
		targetTableLogicalName: "lead",
		targetPrimaryIdAttribute: "leadid",
	};

	it("posts a relationship whose Lookup schema name matches the existing column, which is what attaches it", async () => {
		const { http, calls } = createFakeHttp();
		await polymorphicOperations(http).addPolymorphicTarget(request);
		const body = calls[0]!.body as { Lookup: Record<string, unknown> };
		expect(calls[0]?.path).toBe("RelationshipDefinitions");
		expect(body.Lookup.SchemaName).toBe("new_RelatedTo");
		expect(body.Lookup["@odata.type"]).toBe("Microsoft.Dynamics.CRM.LookupAttributeMetadata");
	});

	it("sets both sides of the relationship explicitly", async () => {
		const { http, calls } = createFakeHttp();
		await polymorphicOperations(http).addPolymorphicTarget(request);
		expect(calls[0]?.body).toMatchObject({ ReferencedAttribute: "leadid", ReferencingAttribute: "new_relatedto" });
	});

	it("carries the solution in the header, because this call takes it there and not in the body", async () => {
		const { http, calls } = createFakeHttp();
		await polymorphicOperations(http).addPolymorphicTarget({ ...request, solutionUniqueName: "ContosoCore" });
		expect(calls[0]?.headers).toMatchObject({ "MSCRM.SolutionUniqueName": "ContosoCore" });
		expect(calls[0]?.body).not.toHaveProperty("SolutionUniqueName");
	});
});

describe("removePolymorphicTarget", () => {
	it("deletes the relationship by its metadata id", async () => {
		const { http, calls } = createFakeHttp();
		await polymorphicOperations(http).removePolymorphicTarget({ relationshipId: "{ABC-123}" });
		expect(calls[0]).toMatchObject({ method: "DELETE", path: "RelationshipDefinitions(abc-123)" });
	});
});
