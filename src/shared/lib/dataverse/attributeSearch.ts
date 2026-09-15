import { type AttributeMatch, type AttributeSearchRequest, type UpdateAttributeRequest } from "@/shared/types";

import { type DataverseHttp, withSolution } from "./http";

interface LabelBag {
	UserLocalizedLabel?: { Label?: string | null } | null;
}

interface AttributeRecord {
	LogicalName: string;
	AttributeType: string;
	MetadataId: string;
	IsManaged?: boolean;
	IsCustomizable?: { Value?: boolean } | null;
	RequiredLevel?: { Value?: string } | null;
	MaxLength?: number | null;
	MinValue?: number | null;
	MaxValue?: number | null;
	Precision?: number | null;
	DisplayName?: LabelBag | null;
	Description?: LabelBag | null;
}

interface EntityRecord {
	LogicalName: string;
	DisplayName?: LabelBag | null;
	Attributes?: AttributeRecord[];
}

const labelOf = (bag: LabelBag | null | undefined): string => bag?.UserLocalizedLabel?.Label ?? "";

const escapeODataString = (value: string): string => value.replace(/'/g, "''");

export interface AttributeSearchOperations {
	findAttributeAcrossTables: (request: AttributeSearchRequest) => Promise<AttributeMatch[]>;
	updateAttribute: (request: UpdateAttributeRequest) => Promise<void>;
}

export const attributeSearchOperations = (http: DataverseHttp): AttributeSearchOperations => ({
	findAttributeAcrossTables: async ({ logicalName, customOnly = false }) => {
		const name = logicalName.trim().toLowerCase();
		if (!name) {
			return [];
		}
		const expand = `Attributes($select=LogicalName,AttributeType,MetadataId,IsManaged,IsCustomizable,RequiredLevel,DisplayName,Description,MaxLength,MinValue,MaxValue,Precision;$filter=LogicalName eq '${escapeODataString(name)}')`;
		const filter = customOnly ? "&$filter=IsCustomEntity eq true" : "";
		const response = await http.get<{ value?: EntityRecord[] }>(
			`EntityDefinitions?$select=LogicalName,DisplayName&$expand=${encodeURIComponent(expand)}${filter}`
		);
		return (response?.value ?? []).flatMap((entity) =>
			(entity.Attributes ?? []).map<AttributeMatch>((attribute) => ({
				tableLogicalName: entity.LogicalName,
				tableDisplayName: labelOf(entity.DisplayName) || entity.LogicalName,
				columnLogicalName: attribute.LogicalName,
				attributeType: attribute.AttributeType,
				label: labelOf(attribute.DisplayName),
				description: labelOf(attribute.Description),
				requiredLevel: attribute.RequiredLevel?.Value ?? "None",
				maxLength: attribute.MaxLength ?? null,
				minValue: attribute.MinValue ?? null,
				maxValue: attribute.MaxValue ?? null,
				precision: attribute.Precision ?? null,
				isManaged: attribute.IsManaged === true,
				isCustomizable: attribute.IsCustomizable?.Value !== false,
				metadataId: attribute.MetadataId,
			}))
		);
	},
	updateAttribute: async ({
		tableLogicalName,
		columnLogicalName,
		attributeType,
		metadataId,
		label,
		description,
		requiredLevel,
		maxLength,
		minValue,
		maxValue,
		precision,
		solutionUniqueName,
	}) => {
		const body: Record<string, unknown> = {
			"@odata.type": `Microsoft.Dynamics.CRM.${attributeType}AttributeMetadata`,
			MetadataId: metadataId,
			LogicalName: columnLogicalName,
		};
		if (label !== undefined) {
			body.DisplayName = {
				"@odata.type": "Microsoft.Dynamics.CRM.Label",
				LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: label, LanguageCode: 1033 }],
			};
		}
		if (description !== undefined) {
			body.Description = {
				"@odata.type": "Microsoft.Dynamics.CRM.Label",
				LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: description, LanguageCode: 1033 }],
			};
		}
		if (requiredLevel !== undefined) {
			body.RequiredLevel = { Value: requiredLevel, CanBeChanged: true, ManagedPropertyLogicalName: "canmodifyrequirementlevelsettings" };
		}
		if (maxLength !== undefined) {
			body.MaxLength = maxLength;
		}
		if (minValue !== undefined) {
			body.MinValue = minValue;
		}
		if (maxValue !== undefined) {
			body.MaxValue = maxValue;
		}
		if (precision !== undefined) {
			body.Precision = precision;
		}
		await http.request(
			"PUT",
			`EntityDefinitions(LogicalName='${escapeODataString(tableLogicalName)}')/Attributes(${metadataId})`,
			body,
			withSolution({ "MSCRM.MergeLabels": "true" }, solutionUniqueName)
		);
	},
});
