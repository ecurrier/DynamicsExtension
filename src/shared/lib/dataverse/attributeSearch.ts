import {
	type AttributeDetails,
	type AttributeDetailsRequest,
	type AttributeMatch,
	type AttributeSearchRequest,
	type UpdateAttributeRequest,
} from "@/shared/types";

import { type DataverseHttp, withSolution } from "./http";

interface LabelBag {
	UserLocalizedLabel?: { Label?: string | null } | null;
}

interface AttributeRecord {
	"@odata.type"?: string;
	LogicalName: string;
	AttributeType: string;
	MetadataId: string;
	IsManaged?: boolean;
	IsCustomizable?: { Value?: boolean } | null;
	RequiredLevel?: { Value?: string } | null;
	DisplayName?: LabelBag | null;
	Description?: LabelBag | null;
}

interface AttributeDetailsRecord {
	MaxLength?: number | null;
	MinValue?: number | null;
	MaxValue?: number | null;
	Precision?: number | null;
}

interface EntityRecord {
	LogicalName: string;
	DisplayName?: LabelBag | null;
	Attributes?: AttributeRecord[];
}

const labelOf = (bag: LabelBag | null | undefined): string => bag?.UserLocalizedLabel?.Label ?? "";

const escapeODataString = (value: string): string => value.replace(/'/g, "''");

const DETAIL_PROPERTIES = new Map<string, (keyof AttributeDetailsRecord)[]>([
	["String", ["MaxLength"]],
	["Memo", ["MaxLength"]],
	["Integer", ["MinValue", "MaxValue"]],
	["BigInt", ["MinValue", "MaxValue"]],
	["Decimal", ["MinValue", "MaxValue", "Precision"]],
	["Double", ["MinValue", "MaxValue", "Precision"]],
	["Money", ["MinValue", "MaxValue", "Precision"]],
]);

const NO_DETAILS: AttributeDetails = { maxLength: null, minValue: null, maxValue: null, precision: null };

export const hasAttributeDetails = (attributeType: string): boolean => DETAIL_PROPERTIES.has(attributeType);

export const attributeMetadataType = (attributeType: string, metadataType?: string | null): string =>
	metadataType || `Microsoft.Dynamics.CRM.${attributeType}AttributeMetadata`;

export interface AttributeSearchOperations {
	findAttributeAcrossTables: (request: AttributeSearchRequest) => Promise<AttributeMatch[]>;
	readAttributeDetails: (request: AttributeDetailsRequest) => Promise<AttributeDetails>;
	updateAttribute: (request: UpdateAttributeRequest) => Promise<void>;
}

export const attributeSearchOperations = (http: DataverseHttp): AttributeSearchOperations => ({
	findAttributeAcrossTables: async ({ logicalName, customOnly = false }) => {
		const name = logicalName.trim().toLowerCase();
		if (!name) {
			return [];
		}
		const expand = `Attributes($select=LogicalName,AttributeType,MetadataId,IsManaged,IsCustomizable,RequiredLevel,DisplayName,Description;$filter=LogicalName eq '${escapeODataString(name)}')`;
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
				metadataType: attribute["@odata.type"]?.replace(/^#/, "") || null,
				label: labelOf(attribute.DisplayName),
				description: labelOf(attribute.Description),
				requiredLevel: attribute.RequiredLevel?.Value ?? "None",
				...NO_DETAILS,
				isManaged: attribute.IsManaged === true,
				isCustomizable: attribute.IsCustomizable?.Value !== false,
				metadataId: attribute.MetadataId,
			}))
		);
	},
	readAttributeDetails: async ({ tableLogicalName, metadataId, attributeType }) => {
		const properties = DETAIL_PROPERTIES.get(attributeType);
		if (!properties) {
			return NO_DETAILS;
		}
		const record = await http.get<AttributeDetailsRecord | undefined>(
			`EntityDefinitions(LogicalName='${escapeODataString(tableLogicalName)}')/Attributes(${metadataId})/Microsoft.Dynamics.CRM.${attributeType}AttributeMetadata?$select=${properties.join(",")}`
		);
		return {
			maxLength: record?.MaxLength ?? null,
			minValue: record?.MinValue ?? null,
			maxValue: record?.MaxValue ?? null,
			precision: record?.Precision ?? null,
		};
	},
	updateAttribute: async ({
		tableLogicalName,
		columnLogicalName,
		attributeType,
		metadataType,
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
			"@odata.type": attributeMetadataType(attributeType, metadataType),
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
