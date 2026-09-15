import { type DataverseHttp, withSolution } from "./http";

export interface PolymorphicTarget {
	tableLogicalName: string;
	relationshipSchemaName: string;
}

export interface PolymorphicLookup {
	columnLogicalName: string;
	columnSchemaName: string;
	label: string;
	tableLogicalName: string;
	targets: PolymorphicTarget[];
}

export interface CreatePolymorphicLookupRequest {
	tableLogicalName: string;
	columnSchemaName: string;
	label: string;
	description?: string;
	targetTableLogicalNames: string[];
	publisherPrefix: string;
	solutionUniqueName?: string | null;
}

interface RelationshipRecord {
	SchemaName: string;
	ReferencedEntity: string;
	ReferencingEntity: string;
	ReferencingAttribute: string;
}

const escapeODataString = (value: string): string => value.replace(/'/g, "''");

export interface PolymorphicOperations {
	listPolymorphicLookups: (args: { tableLogicalName: string }) => Promise<PolymorphicLookup[]>;
	createPolymorphicLookup: (request: CreatePolymorphicLookupRequest) => Promise<void>;
}

export const polymorphicOperations = (http: DataverseHttp): PolymorphicOperations => ({
	listPolymorphicLookups: async ({ tableLogicalName }) => {
		const path = `EntityDefinitions(LogicalName='${escapeODataString(tableLogicalName)}')/ManyToOneRelationships?$select=SchemaName,ReferencedEntity,ReferencingEntity,ReferencingAttribute`;
		const response = await http.get<{ value?: RelationshipRecord[] }>(path);
		const byAttribute = new Map<string, RelationshipRecord[]>();
		for (const record of response?.value ?? []) {
			byAttribute.set(record.ReferencingAttribute, [...(byAttribute.get(record.ReferencingAttribute) ?? []), record]);
		}
		return [...byAttribute.entries()]
			.filter(([, records]) => records.length > 1)
			.map(([attribute, records]) => ({
				columnLogicalName: attribute,
				columnSchemaName: attribute,
				label: attribute,
				tableLogicalName,
				targets: records.map((record) => ({ tableLogicalName: record.ReferencedEntity, relationshipSchemaName: record.SchemaName })),
			}))
			.sort((left, right) => left.columnLogicalName.localeCompare(right.columnLogicalName));
	},
	createPolymorphicLookup: async ({
		tableLogicalName,
		columnSchemaName,
		label,
		description,
		targetTableLogicalNames,
		publisherPrefix,
		solutionUniqueName,
	}) => {
		await http.request(
			"POST",
			"CreatePolymorphicLookupAttribute",
			{
				OneToManyRelationships: targetTableLogicalNames.map((target) => ({
					SchemaName: `${publisherPrefix}_${target}_${tableLogicalName}_${columnSchemaName}`,
					ReferencedEntity: target,
					ReferencingEntity: tableLogicalName,
					"@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",
				})),
				Lookup: {
					"@odata.type": "Microsoft.Dynamics.CRM.LookupAttributeMetadata",
					SchemaName: columnSchemaName,
					DisplayName: {
						"@odata.type": "Microsoft.Dynamics.CRM.Label",
						LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: label, LanguageCode: 1033 }],
					},
					Description: {
						"@odata.type": "Microsoft.Dynamics.CRM.Label",
						LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: description ?? "", LanguageCode: 1033 }],
					},
				},
			},
			withSolution(undefined, solutionUniqueName)
		);
	},
});
