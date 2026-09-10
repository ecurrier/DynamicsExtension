import { type TableKey, type TableMetadata, type TableRelationship } from "@/shared/types";

import { requireLogicalName } from "./guards";
import { type DataverseHttp } from "./http";

const KEY_STATUS_LABELS: Record<number, string> = {
	0: "Pending",
	1: "In progress",
	2: "Active",
	3: "Failed",
};

const EXPAND = [
	"Keys($select=LogicalName,DisplayName,KeyAttributes,EntityKeyIndexStatus)",
	"OneToManyRelationships($select=SchemaName,ReferencingEntity,ReferencingAttribute,ReferencedEntityNavigationPropertyName)",
	"ManyToOneRelationships($select=SchemaName,ReferencedEntity,ReferencingAttribute,ReferencingEntityNavigationPropertyName)",
	"ManyToManyRelationships($select=SchemaName,Entity1LogicalName,Entity2LogicalName,IntersectEntityName,Entity1NavigationPropertyName)",
].join(",");

interface LocalizedLabel {
	Label?: string | null;
}

interface LabelMetadata {
	UserLocalizedLabel?: LocalizedLabel | null;
	LocalizedLabels?: LocalizedLabel[] | null;
}

interface ManagedProperty {
	Value?: boolean | null;
}

interface EntityRecord {
	LogicalName: string;
	SchemaName?: string | null;
	DisplayName?: LabelMetadata | null;
	DisplayCollectionName?: LabelMetadata | null;
	EntitySetName?: string | null;
	PrimaryIdAttribute?: string | null;
	PrimaryNameAttribute?: string | null;
	ObjectTypeCode?: number | null;
	OwnershipType?: string | null;
	IsManaged?: boolean | null;
	IsCustomEntity?: boolean | null;
	IsAuditEnabled?: ManagedProperty | null;
	ChangeTrackingEnabled?: boolean | null;
	IsActivity?: boolean | null;
	IsQuickCreateEnabled?: boolean | null;
	IsValidForAdvancedFind?: boolean | null;
	HasNotes?: boolean | null;
	HasActivities?: boolean | null;
}

interface KeyRecord {
	LogicalName?: string | null;
	DisplayName?: LabelMetadata | null;
	KeyAttributes?: string[] | null;
	EntityKeyIndexStatus?: number | null;
}

interface OneToManyRecord {
	SchemaName?: string | null;
	ReferencingEntity?: string | null;
	ReferencingAttribute?: string | null;
	ReferencedEntityNavigationPropertyName?: string | null;
}

interface ManyToOneRecord {
	SchemaName?: string | null;
	ReferencedEntity?: string | null;
	ReferencingAttribute?: string | null;
	ReferencingEntityNavigationPropertyName?: string | null;
}

interface ManyToManyRecord {
	SchemaName?: string | null;
	Entity1LogicalName?: string | null;
	Entity2LogicalName?: string | null;
	IntersectEntityName?: string | null;
	Entity1NavigationPropertyName?: string | null;
}

interface RelationshipsRecord {
	Keys?: KeyRecord[] | null;
	OneToManyRelationships?: OneToManyRecord[] | null;
	ManyToOneRelationships?: ManyToOneRecord[] | null;
	ManyToManyRelationships?: ManyToManyRecord[] | null;
}

const label = (value: LabelMetadata | null | undefined): string | null => value?.UserLocalizedLabel?.Label ?? value?.LocalizedLabels?.[0]?.Label ?? null;

const byName = (left: TableRelationship, right: TableRelationship): number =>
	left.schemaName.localeCompare(right.schemaName, undefined, { sensitivity: "base" });

export interface TableMetadataOperations {
	getTableMetadata: (request: { entityLogicalName: string }) => Promise<TableMetadata>;
}

export const tableMetadataOperations = (http: DataverseHttp): TableMetadataOperations => ({
	getTableMetadata: async ({ entityLogicalName }) => {
		const table = requireLogicalName(entityLogicalName, "Table");
		const base = `EntityDefinitions(LogicalName='${table}')`;

		const [entity, related, attributes] = await Promise.all([
			http.get<EntityRecord>(base),
			http.get<RelationshipsRecord>(`${base}?$select=LogicalName&$expand=${EXPAND}`).catch(() => null),
			http
				.get<{ value?: { LogicalName: string }[] }>(`${base}/Attributes?$select=LogicalName`)
				.then((response) => response?.value ?? null)
				.catch(() => null),
		]);

		const oneToMany = (related?.OneToManyRelationships ?? []).map<TableRelationship>((relationship) => ({
			schemaName: relationship.SchemaName ?? "",
			kind: "1:N",
			relatedEntity: relationship.ReferencingEntity ?? "",
			navigationProperty: relationship.ReferencedEntityNavigationPropertyName ?? null,
			referencingAttribute: relationship.ReferencingAttribute ?? null,
			intersectEntity: null,
		}));
		const manyToOne = (related?.ManyToOneRelationships ?? []).map<TableRelationship>((relationship) => ({
			schemaName: relationship.SchemaName ?? "",
			kind: "N:1",
			relatedEntity: relationship.ReferencedEntity ?? "",
			navigationProperty: relationship.ReferencingEntityNavigationPropertyName ?? null,
			referencingAttribute: relationship.ReferencingAttribute ?? null,
			intersectEntity: null,
		}));
		const manyToMany = (related?.ManyToManyRelationships ?? []).map<TableRelationship>((relationship) => ({
			schemaName: relationship.SchemaName ?? "",
			kind: "N:N",
			relatedEntity: relationship.Entity1LogicalName === table ? (relationship.Entity2LogicalName ?? "") : (relationship.Entity1LogicalName ?? ""),
			navigationProperty: relationship.Entity1NavigationPropertyName ?? null,
			referencingAttribute: null,
			intersectEntity: relationship.IntersectEntityName ?? null,
		}));

		return {
			logicalName: entity.LogicalName,
			schemaName: entity.SchemaName ?? entity.LogicalName,
			displayName: label(entity.DisplayName) ?? entity.LogicalName,
			collectionDisplayName: label(entity.DisplayCollectionName),
			entitySetName: entity.EntitySetName ?? "",
			primaryIdAttribute: entity.PrimaryIdAttribute ?? "",
			primaryNameAttribute: entity.PrimaryNameAttribute ?? null,
			objectTypeCode: entity.ObjectTypeCode ?? null,
			ownershipType: entity.OwnershipType ?? null,
			isManaged: entity.IsManaged === true,
			isCustomEntity: entity.IsCustomEntity === true,
			isAuditEnabled: entity.IsAuditEnabled?.Value === true,
			changeTrackingEnabled: entity.ChangeTrackingEnabled === true,
			isActivity: entity.IsActivity === true,
			isQuickCreateEnabled: entity.IsQuickCreateEnabled === true,
			isValidForAdvancedFind: entity.IsValidForAdvancedFind === true,
			hasNotes: entity.HasNotes === true,
			hasActivities: entity.HasActivities === true,
			attributeCount: attributes?.length ?? null,
			keys: (related?.Keys ?? []).map<TableKey>((key) => ({
				logicalName: key.LogicalName ?? "",
				displayName: label(key.DisplayName),
				attributes: key.KeyAttributes ?? [],
				statusLabel: KEY_STATUS_LABELS[key.EntityKeyIndexStatus ?? -1] ?? "Unknown",
			})),
			relationships: [...manyToOne.sort(byName), ...oneToMany.sort(byName), ...manyToMany.sort(byName)],
		};
	},
});
