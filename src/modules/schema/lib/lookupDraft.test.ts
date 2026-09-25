import { describe, expect, it } from "vitest";

import { lookupCreatePreview, schemaNameFromLabel, schemaNameProblem } from "./lookupDraft";

describe("schemaNameFromLabel", () => {
	it("joins the words of the display name", () => {
		expect(schemaNameFromLabel("Billed To")).toBe("BilledTo");
		expect(schemaNameFromLabel("related to (primary)")).toBe("RelatedToPrimary");
	});

	it("drops characters a schema name cannot hold", () => {
		expect(schemaNameFromLabel("Café & bar")).toBe("CafBar");
		expect(schemaNameFromLabel("   ")).toBe("");
	});
});

describe("schemaNameProblem", () => {
	it("accepts letters, numbers, and underscores that start with a letter", () => {
		expect(schemaNameProblem("BilledTo_2")).toBeNull();
		expect(schemaNameProblem("")).toBeNull();
	});

	it("explains what is wrong", () => {
		expect(schemaNameProblem("2ndParty")).toBe("Start the schema name with a letter.");
		expect(schemaNameProblem("Billed To")).toBe("Use only letters, numbers, and underscores.");
	});
});

describe("lookupCreatePreview", () => {
	it("names the column and one relationship per target the way the create call will", () => {
		expect(lookupCreatePreview("account", "contoso", "BilledTo", ["account", "contact"])).toEqual({
			columnSchemaName: "contoso_BilledTo",
			columnLogicalName: "contoso_billedto",
			relationshipSchemaNames: ["account_account_contoso_BilledTo", "contact_account_contoso_BilledTo"],
		});
	});
});
