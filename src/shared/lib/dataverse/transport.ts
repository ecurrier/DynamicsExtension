import {
	type CreateRecordRequest,
	type DeleteRecordRequest,
	type EntitySummary,
	type ExistingIdsRequest,
	type RetrievePageRequest,
	type RetrievePageResult,
	type SavedView,
	type TransportAttribute,
	type TransportEntityMetadata,
	type TransportRow,
	type UpdateRecordRequest,
} from "@/shared/types";

import { DataverseOperationError } from "./errors";
import { requireGuid } from "./guards";
import { type DataverseHttp } from "./http";
import { fetchXmlPath } from "./http";
import { type ManyToOneRelationship, resolveLookupTargets } from "./lookupTargets";
import { getAllPages, nextLinkPath } from "./paging";
import { chunk } from "../chunk";
import { normalizeGuid } from "../guid";

const ENTITY_SELECT = "LogicalName,DisplayName,EntitySetName,PrimaryIdAttribute,PrimaryNameAttribute";
const ENTITY_FLAGS = "IsIntersect,IsPrivate,IsLogicalEntity";
const ATTRIBUTE_SELECT = "LogicalName,DisplayName,AttributeType,AttributeOf,IsValidForCreate,IsValidForUpdate,IsPrimaryId,IsLogical";
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const EXISTENCE_CHUNK = 200;

interface LabelRecord {
	UserLocalizedLabel?: { Label?: string | null } | null;
	LocalizedLabels?: { Label?: string | null }[] | null;
}

interface AttributeRecord {
	LogicalName: string;
	DisplayName?: LabelRecord | null;
	AttributeType?: string | null;
	AttributeOf?: string | null;
	IsValidForCreate?: boolean | null;
	IsValidForUpdate?: boolean | null;
	IsPrimaryId?: boolean | null;
	IsLogical?: boolean | null;
}

interface EntityRecord {
	LogicalName: string;
	DisplayName?: LabelRecord | null;
	EntitySetName?: string | null;
	PrimaryIdAttribute?: string | null;
	PrimaryNameAttribute?: string | null;
	IsIntersect?: boolean | null;
	IsPrivate?: boolean | null;
	IsLogicalEntity?: boolean | null;
	Attributes?: AttributeRecord[] | null;
}

interface LookupRecord {
	LogicalName: string;
	Targets?: string[] | null;
}

interface ViewRecord {
	savedqueryid: string;
	name?: string | null;
	fetchxml?: string | null;
	querytype?: number | null;
	isdefault?: boolean | null;
}

interface Page<T> {
	value?: T[];
	"@odata.nextLink"?: string;
}

const labelText = (label: LabelRecord | null | undefined, fallback: string): string =>
	label?.UserLocalizedLabel?.Label ?? label?.LocalizedLabels?.[0]?.Label ?? fallback;

export const requireIdentifier = (value: string, label: string): string => {
	if (!IDENTIFIER.test(value)) {
		throw new DataverseOperationError("InvalidArgument", `${label} is not a valid logical name`);
	}
	return value;
};

const byDisplayName = (left: EntitySummary, right: EntitySummary): number =>
	left.displayName.localeCompare(right.displayName, undefined, { sensitivity: "base" });

const toEntity = (record: EntityRecord): EntitySummary => ({
	logicalName: record.LogicalName,
	displayName: labelText(record.DisplayName, record.LogicalName),
	entitySetName: record.EntitySetName ?? "",
	primaryIdAttribute: record.PrimaryIdAttribute ?? "",
	primaryNameAttribute: record.PrimaryNameAttribute ?? null,
});

export const selectableEntities = (records: EntityRecord[]): EntitySummary[] =>
	records
		.filter((record) => !!record.EntitySetName && !!record.PrimaryIdAttribute && !record.IsIntersect && !record.IsPrivate && !record.IsLogicalEntity)
		.map(toEntity)
		.sort(byDisplayName);

export const existenceFetchXml = (entityLogicalName: string, primaryIdAttribute: string, ids: string[]): string =>
	`<fetch no-lock="true"><entity name="${entityLogicalName}"><attribute name="${primaryIdAttribute}" /><filter type="and"><condition attribute="${primaryIdAttribute}" operator="in">${ids
		.map((id) => `<value>${id}</value>`)
		.join("")}</condition></filter></entity></fetch>`;

export const retrievePreferHeader = (pageSize: number): Record<string, string> => ({
	Prefer: `odata.maxpagesize=${pageSize}, odata.include-annotations="*"`,
});

const toAttribute = (record: AttributeRecord, targets: Map<string, string[]>, relationships: ManyToOneRelationship[]): TransportAttribute => ({
	logicalName: record.LogicalName,
	displayName: labelText(record.DisplayName, record.LogicalName),
	attributeType: record.AttributeType ?? "Unknown",
	attributeOf: record.AttributeOf ?? null,
	isPrimaryId: record.IsPrimaryId === true,
	isValidForCreate: record.IsValidForCreate === true,
	isValidForUpdate: record.IsValidForUpdate === true,
	isLogical: record.IsLogical === true,
	targets: resolveLookupTargets(record.LogicalName, record.AttributeType ?? "", targets.get(record.LogicalName) ?? [], relationships),
});

export interface TransportOperations {
	listEntities: () => Promise<EntitySummary[]>;
	listViews: (request: { entityLogicalName: string }) => Promise<SavedView[]>;
	getEntityMetadata: (request: { logicalName: string }) => Promise<TransportEntityMetadata>;
	retrievePage: (request: RetrievePageRequest) => Promise<RetrievePageResult>;
	existingIds: (request: ExistingIdsRequest) => Promise<string[]>;
	create: (request: CreateRecordRequest) => Promise<void>;
	update: (request: UpdateRecordRequest) => Promise<void>;
	remove: (request: DeleteRecordRequest) => Promise<void>;
}

export const transportOperations = (http: DataverseHttp): TransportOperations => ({
	listEntities: async () => {
		const page = await getAllPages<EntityRecord>(http, `EntityDefinitions?$select=${ENTITY_SELECT},${ENTITY_FLAGS}`);
		return selectableEntities(page.rows);
	},
	listViews: async ({ entityLogicalName }) => {
		const entity = requireIdentifier(entityLogicalName, "Entity");
		const page = await getAllPages<ViewRecord>(
			http,
			`savedqueries?$select=savedqueryid,name,fetchxml,querytype,isdefault&$filter=returnedtypecode eq '${entity}' and fetchxml ne null&$orderby=name asc`
		);
		return page.rows.flatMap((record) =>
			record.fetchxml
				? [
						{
							id: normalizeGuid(record.savedqueryid),
							name: record.name ?? "",
							fetchXml: record.fetchxml,
							queryType: record.querytype ?? 0,
							isDefault: record.isdefault === true,
						},
					]
				: []
		);
	},
	getEntityMetadata: async ({ logicalName }) => {
		const entity = requireIdentifier(logicalName, "Entity");
		const base = `EntityDefinitions(LogicalName='${entity}')`;
		const [record, lookups, relationships] = await Promise.all([
			http.get<EntityRecord | undefined>(`${base}?$select=${ENTITY_SELECT}&$expand=Attributes($select=${ATTRIBUTE_SELECT})`),
			http.get<Page<LookupRecord> | undefined>(`${base}/Attributes/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$select=LogicalName,Targets`),
			http.get<Page<ManyToOneRelationship> | undefined>(
				`${base}/ManyToOneRelationships?$select=ReferencingAttribute,ReferencedEntity,ReferencingEntityNavigationPropertyName`
			),
		]);
		if (!record) {
			throw new DataverseOperationError("NotFound", `The entity ${entity} does not exist in this environment`);
		}
		const targets = new Map((lookups?.value ?? []).map((lookup) => [lookup.LogicalName, lookup.Targets ?? []]));
		const attributes = (record.Attributes ?? [])
			.map((attribute) => toAttribute(attribute, targets, relationships?.value ?? []))
			.sort((left, right) => left.logicalName.localeCompare(right.logicalName));
		return { info: toEntity(record), attributes };
	},
	retrievePage: async ({ entitySetName, fetchXml, nextLink, pageSize }) => {
		let path: string;
		if (nextLink) {
			path = nextLinkPath(http.apiUrl, nextLink);
		} else {
			if (!fetchXml?.trim()) {
				throw new DataverseOperationError("InvalidArgument", "Enter a FetchXML query to retrieve records");
			}
			path = fetchXmlPath(requireIdentifier(entitySetName, "Entity set"), fetchXml);
		}
		const page = await http.request<Page<TransportRow> | undefined>("GET", path, undefined, retrievePreferHeader(pageSize));
		return { rows: page?.value ?? [], nextLink: page?.["@odata.nextLink"] ?? null };
	},
	existingIds: async ({ entityLogicalName, entitySetName, primaryIdAttribute, ids }) => {
		const entity = requireIdentifier(entityLogicalName, "Entity");
		const set = requireIdentifier(entitySetName, "Entity set");
		const key = requireIdentifier(primaryIdAttribute, "Primary id attribute");
		const found: string[] = [];
		for (const group of chunk(
			ids.map((id) => requireGuid(id, "Record")),
			EXISTENCE_CHUNK
		)) {
			const page = await getAllPages<TransportRow>(http, fetchXmlPath(set, existenceFetchXml(entity, key, group)));
			for (const row of page.rows) {
				const value = row[key];
				if (typeof value === "string") {
					found.push(normalizeGuid(value));
				}
			}
		}
		return found;
	},
	create: async ({ entitySetName, payload }) => {
		await http.post(requireIdentifier(entitySetName, "Entity set"), payload);
	},
	update: async ({ entitySetName, id, payload }) => {
		await http.request("PATCH", `${requireIdentifier(entitySetName, "Entity set")}(${requireGuid(id, "Record")})`, payload, { "If-Match": "*" });
	},
	remove: async ({ entitySetName, id }) => {
		await http.delete(`${requireIdentifier(entitySetName, "Entity set")}(${requireGuid(id, "Record")})`);
	},
});
