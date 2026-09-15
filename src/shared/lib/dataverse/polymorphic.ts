import { type CreatePolymorphicLookupRequest, type PolymorphicLookup, type TargetRequest } from "@/shared/types";

import { type DataverseHttp, withSolution } from "./http";
import { normalizeGuid } from "../guid";

export const MAX_RELATIONSHIP_SCHEMA_NAME = 100;

export const NOT_POLYMORPHIC_ERROR_CODE = -2147192813;

interface RelationshipRecord {
	MetadataId: string;
	SchemaName: string;
	ReferencedEntity: string;
	ReferencingEntity: string;
	ReferencingAttribute: string;
}

const escapeODataString = (value: string): string => value.replace(/'/g, "''");

const label = (text: string) => ({
	"@odata.type": "Microsoft.Dynamics.CRM.Label",
	LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: text, LanguageCode: 1033 }],
});

export const relationshipSchemaName = (targetTable: string, table: string, column: string): string =>
	`${targetTable}_${table}_${column}`.slice(0, MAX_RELATIONSHIP_SCHEMA_NAME);

export interface PolymorphicOperations {
	listPolymorphicLookups: (args: { tableLogicalName: string }) => Promise<PolymorphicLookup[]>;
	createPolymorphicLookup: (request: CreatePolymorphicLookupRequest) => Promise<void>;
	addPolymorphicTarget: (request: TargetRequest) => Promise<void>;
	removePolymorphicTarget: (args: { relationshipId: string }) => Promise<void>;
}

export const polymorphicOperations = (http: DataverseHttp): PolymorphicOperations => ({
	listPolymorphicLookups: async ({ tableLogicalName }) => {
		const path =
			"RelationshipDefinitions/Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata" +
			"?$select=MetadataId,SchemaName,ReferencedEntity,ReferencingEntity,ReferencingAttribute" +
			`&$filter=ReferencingEntity eq '${escapeODataString(tableLogicalName)}'`;
		const response = await http.get<{ value?: RelationshipRecord[] }>(path);
		const byAttribute = new Map<string, RelationshipRecord[]>();
		for (const record of response?.value ?? []) {
			byAttribute.set(record.ReferencingAttribute, [...(byAttribute.get(record.ReferencingAttribute) ?? []), record]);
		}
		return [...byAttribute.entries()]
			.filter(([, records]) => records.length > 1)
			.map(([attribute, records]) => ({
				columnLogicalName: attribute,
				tableLogicalName,
				targets: records
					.map((record) => ({
						tableLogicalName: record.ReferencedEntity,
						relationshipSchemaName: record.SchemaName,
						relationshipId: normalizeGuid(record.MetadataId),
					}))
					.sort((left, right) => left.tableLogicalName.localeCompare(right.tableLogicalName)),
			}))
			.sort((left, right) => left.columnLogicalName.localeCompare(right.columnLogicalName));
	},

	createPolymorphicLookup: async ({ tableLogicalName, columnSchemaName, label: displayLabel, description, targetTableLogicalNames, solutionUniqueName }) => {
		const body: Record<string, unknown> = {
			OneToManyRelationships: targetTableLogicalNames.map((target) => ({
				SchemaName: relationshipSchemaName(target, tableLogicalName, columnSchemaName),
				ReferencedEntity: target,
				ReferencingEntity: tableLogicalName,
			})),
			Lookup: {
				"@odata.type": "Microsoft.Dynamics.CRM.ComplexLookupAttributeMetadata",
				AttributeType: "Lookup",
				AttributeTypeName: { Value: "LookupType" },
				SchemaName: columnSchemaName,
				DisplayName: label(displayLabel),
				...(description ? { Description: label(description) } : {}),
			},
		};
		if (solutionUniqueName) {
			body.SolutionUniqueName = solutionUniqueName;
		}
		await http.request("POST", "CreatePolymorphicLookupAttribute", body, { Consistency: "Strong" });
	},

	addPolymorphicTarget: async ({
		tableLogicalName,
		columnSchemaName,
		columnLogicalName,
		label: displayLabel,
		targetTableLogicalName,
		targetPrimaryIdAttribute,
		solutionUniqueName,
	}) => {
		await http.request(
			"POST",
			"RelationshipDefinitions",
			{
				"@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",
				SchemaName: relationshipSchemaName(targetTableLogicalName, tableLogicalName, columnSchemaName),
				ReferencedEntity: targetTableLogicalName,
				ReferencedAttribute: targetPrimaryIdAttribute,
				ReferencingEntity: tableLogicalName,
				ReferencingAttribute: columnLogicalName,
				Lookup: {
					"@odata.type": "Microsoft.Dynamics.CRM.LookupAttributeMetadata",
					AttributeType: "Lookup",
					AttributeTypeName: { Value: "LookupType" },
					SchemaName: columnSchemaName,
					DisplayName: label(displayLabel),
				},
			},
			withSolution({ Consistency: "Strong" }, solutionUniqueName)
		);
	},

	removePolymorphicTarget: async ({ relationshipId }) => {
		await http.delete(`RelationshipDefinitions(${normalizeGuid(relationshipId)})`);
	},
});
