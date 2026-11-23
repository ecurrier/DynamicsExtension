import {
	type CodegenColumn,
	type QueryColumn,
	type QueryColumnType,
	type QueryManyToManyRelationship,
	type QueryManyToOneRelationship,
	type QueryOneToManyRelationship,
	type QueryRow,
	type QueryRunRequest,
	type QueryRunResult,
	type QueryTable,
	type QueryTableSummary,
	type QueryView,
	type QueryViewKind,
	type QueryViewList,
} from "@/shared/types";

import { describeError } from "../errors";
import { normalizeGuid } from "../guid";
import { getBatchedWhenLong } from "./batch";
import { codegenOperations } from "./codegen";
import { DataverseOperationError } from "./errors";
import { requireLogicalName } from "./guards";
import { type DataverseHttp, fetchXmlPath } from "./http";
import { getAllPages } from "./paging";
import { requireIdentifier } from "./transport";

const TABLE_SELECT = "LogicalName,DisplayName,EntitySetName,PrimaryIdAttribute,PrimaryNameAttribute,IsIntersect,IsPrivate,IsLogicalEntity";

const RELATIONSHIP_EXPAND =
	"ManyToOneRelationships($select=SchemaName,ReferencingAttribute,ReferencedEntity,ReferencedAttribute,ReferencingEntityNavigationPropertyName)," +
	"OneToManyRelationships($select=SchemaName,ReferencedAttribute,ReferencingEntity,ReferencingAttribute,ReferencedEntityNavigationPropertyName)," +
	"ManyToManyRelationships($select=SchemaName,IntersectEntityName,Entity1LogicalName,Entity1IntersectAttribute,Entity1NavigationPropertyName,Entity2LogicalName,Entity2IntersectAttribute,Entity2NavigationPropertyName)";

export const QUERY_PREFER_HEADER = 'odata.include-annotations="*"';

export const PAGING_COOKIE_ANNOTATION = "@Microsoft.Dynamics.CRM.fetchxmlpagingcookie";
export const MORE_RECORDS_ANNOTATION = "@Microsoft.Dynamics.CRM.morerecords";
export const TOTAL_RECORD_COUNT_ANNOTATION = "@Microsoft.Dynamics.CRM.totalrecordcount";
export const TOTAL_RECORD_COUNT_LIMIT_EXCEEDED_ANNOTATION = "@Microsoft.Dynamics.CRM.totalrecordcountlimitexceeded";

const ODATA_COUNT_ANNOTATION = "@odata.count";

export const VIEW_QUERY_TYPES = [0, 1, 2, 4, 64] as const;

const PRIVILEGE_DENIED_CODE = "0x80040220";

const VIEW_SELECT = "name,fetchxml,querytype";

const COLUMN_TYPES: Record<string, QueryColumnType> = {
	String: "text",
	EntityName: "text",
	Memo: "memo",
	Integer: "wholeNumber",
	BigInt: "wholeNumber",
	Decimal: "decimalOrMoney",
	Double: "decimalOrMoney",
	Money: "decimalOrMoney",
	DateTime: "dateTime",
	Picklist: "choice",
	Boolean: "yesNo",
	Lookup: "lookup",
	Customer: "lookup",
	Owner: "owner",
	Uniqueidentifier: "uniqueIdentifier",
	State: "stateOrStatus",
	Status: "stateOrStatus",
};

const MULTI_SELECT_TYPE_NAME = "MultiSelectPicklistType";

const XML_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

interface LabelRecord {
	UserLocalizedLabel?: { Label?: string | null } | null;
	LocalizedLabels?: { Label?: string | null }[] | null;
}

interface TableRecord {
	LogicalName: string;
	DisplayName?: LabelRecord | null;
	EntitySetName?: string | null;
	PrimaryIdAttribute?: string | null;
	PrimaryNameAttribute?: string | null;
	IsIntersect?: boolean | null;
	IsPrivate?: boolean | null;
	IsLogicalEntity?: boolean | null;
}

interface ManyToOneRecord {
	SchemaName?: string | null;
	ReferencingAttribute?: string | null;
	ReferencedEntity?: string | null;
	ReferencedAttribute?: string | null;
	ReferencingEntityNavigationPropertyName?: string | null;
}

interface OneToManyRecord {
	SchemaName?: string | null;
	ReferencedAttribute?: string | null;
	ReferencingEntity?: string | null;
	ReferencingAttribute?: string | null;
	ReferencedEntityNavigationPropertyName?: string | null;
}

interface ManyToManyRecord {
	SchemaName?: string | null;
	IntersectEntityName?: string | null;
	Entity1LogicalName?: string | null;
	Entity1IntersectAttribute?: string | null;
	Entity1NavigationPropertyName?: string | null;
	Entity2LogicalName?: string | null;
	Entity2IntersectAttribute?: string | null;
	Entity2NavigationPropertyName?: string | null;
}

interface RelationshipsRecord {
	ManyToOneRelationships?: ManyToOneRecord[] | null;
	OneToManyRelationships?: OneToManyRecord[] | null;
	ManyToManyRelationships?: ManyToManyRecord[] | null;
}

interface ViewRecord {
	savedqueryid?: string | null;
	userqueryid?: string | null;
	name?: string | null;
	fetchxml?: string | null;
	querytype?: number | null;
	isdefault?: boolean | null;
}

type QueryResponse = Record<string, unknown> & { value?: QueryRow[] };

const labelText = (label: LabelRecord | null | undefined, fallback: string): string =>
	label?.UserLocalizedLabel?.Label ?? label?.LocalizedLabels?.[0]?.Label ?? fallback;

const bySchemaName = <T extends { schemaName: string }>(left: T, right: T): number =>
	left.schemaName.localeCompare(right.schemaName, undefined, { sensitivity: "base" });

export const columnTypeOf = (attributeType: string, attributeTypeName: string): QueryColumnType | null => {
	if (attributeTypeName === MULTI_SELECT_TYPE_NAME) {
		return "multiChoice";
	}
	return COLUMN_TYPES[attributeType] ?? null;
};

export const queryableTables = (records: TableRecord[]): QueryTableSummary[] =>
	records
		.filter((record) => !!record.EntitySetName && !!record.PrimaryIdAttribute && !record.IsPrivate && !record.IsLogicalEntity)
		.map((record) => ({
			logicalName: record.LogicalName,
			displayName: labelText(record.DisplayName, record.LogicalName),
			entitySetName: record.EntitySetName ?? "",
			primaryIdAttribute: record.PrimaryIdAttribute ?? "",
			primaryNameAttribute: record.PrimaryNameAttribute ?? null,
			isIntersect: record.IsIntersect === true,
		}))
		.sort((left, right) => left.displayName.localeCompare(right.displayName, undefined, { sensitivity: "base" }));

const toQueryColumn = (column: CodegenColumn): QueryColumn => ({
	logicalName: column.logicalName,
	displayName: column.displayName,
	attributeType: column.attributeType,
	attributeTypeName: column.typeName,
	columnType: columnTypeOf(column.attributeType, column.typeName),
	attributeOf: column.attributeOf,
	isPrimaryId: column.isPrimaryId,
	isPrimaryName: column.isPrimaryName,
	isValidForRead: column.isValidForRead,
	dateOnly: column.dateTimeBehavior === "DateOnly" || column.dateTimeFormat === "DateOnly",
	options: column.optionSet?.options.map((option) => ({ value: option.value, label: option.label })) ?? [],
	targets: column.targets.map((target) => ({
		logicalName: target.logicalName,
		navigationProperty: target.navigationProperty,
		entitySetName: target.entitySetName,
	})),
});

const toManyToOne = (record: ManyToOneRecord): QueryManyToOneRelationship => ({
	schemaName: record.SchemaName ?? "",
	lookupColumn: record.ReferencingAttribute ?? "",
	referencedTable: record.ReferencedEntity ?? "",
	referencedColumn: record.ReferencedAttribute ?? "",
	navigationProperty: record.ReferencingEntityNavigationPropertyName || null,
});

const toOneToMany = (record: OneToManyRecord): QueryOneToManyRelationship => ({
	schemaName: record.SchemaName ?? "",
	referencedColumn: record.ReferencedAttribute ?? "",
	referencingTable: record.ReferencingEntity ?? "",
	referencingColumn: record.ReferencingAttribute ?? "",
	navigationProperty: record.ReferencedEntityNavigationPropertyName || null,
});

const toManyToMany = (record: ManyToManyRecord): QueryManyToManyRelationship => ({
	schemaName: record.SchemaName ?? "",
	intersectTable: record.IntersectEntityName ?? "",
	first: {
		table: record.Entity1LogicalName ?? "",
		intersectColumn: record.Entity1IntersectAttribute ?? "",
		navigationProperty: record.Entity1NavigationPropertyName || null,
	},
	second: {
		table: record.Entity2LogicalName ?? "",
		intersectColumn: record.Entity2IntersectAttribute ?? "",
		navigationProperty: record.Entity2NavigationPropertyName || null,
	},
});

const unescapeXml = (value: string): string =>
	value.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, entity: string) => {
		if (entity.startsWith("#x") || entity.startsWith("#X")) {
			return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
		}
		if (entity.startsWith("#")) {
			return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
		}
		return XML_ENTITIES[entity] ?? match;
	});

const urlDecode = (value: string): string => decodeURIComponent(value.replace(/\+/g, " "));

export const decodePagingCookie = (annotation: unknown): string | null => {
	if (typeof annotation !== "string") {
		return null;
	}
	const match = /\spagingcookie\s*=\s*(?:"([^"]*)"|'([^']*)')/.exec(annotation);
	const encoded = match?.[1] ?? match?.[2];
	if (!encoded) {
		return null;
	}
	try {
		return urlDecode(urlDecode(unescapeXml(encoded)));
	} catch {
		return null;
	}
};

const totalRecordCount = (body: QueryResponse): number | null => {
	const value = body[TOTAL_RECORD_COUNT_ANNOTATION] ?? body[ODATA_COUNT_ANNOTATION];
	return typeof value === "number" ? value : null;
};

const topLevelAnnotations = (body: QueryResponse): Record<string, unknown> => Object.fromEntries(Object.entries(body).filter(([key]) => key.startsWith("@")));

export const viewsPath = (entitySet: "savedqueries" | "userqueries", logicalName: string): string => {
	const idColumn = entitySet === "savedqueries" ? "savedqueryid,isdefault" : "userqueryid";
	const queryTypes = VIEW_QUERY_TYPES.map((type) => `querytype eq ${type}`).join(" or ");
	return `${entitySet}?$select=${idColumn},${VIEW_SELECT}&$filter=returnedtypecode eq '${logicalName}' and statecode eq 0 and fetchxml ne null and (${queryTypes})&$orderby=name asc`;
};

const toViews = (records: ViewRecord[], kind: QueryViewKind): QueryView[] =>
	records
		.flatMap((record) => {
			const id = kind === "system" ? record.savedqueryid : record.userqueryid;
			if (!id || !record.fetchxml?.trim()) {
				return [];
			}
			return [
				{
					id: normalizeGuid(id),
					name: record.name ?? "",
					kind,
					fetchXml: record.fetchxml,
					queryType: record.querytype ?? 0,
					isDefault: kind === "system" && record.isdefault === true,
				},
			];
		})
		.sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));

export const isPrivilegeError = (error: unknown): boolean => {
	if (typeof error !== "object" || error === null) {
		return false;
	}
	const candidate = error as { status?: unknown; body?: unknown; details?: { status?: unknown; body?: unknown } | null };
	const status = candidate.status ?? candidate.details?.status;
	const body = candidate.body ?? candidate.details?.body;
	return status === 403 || (typeof body === "string" && body.includes(PRIVILEGE_DENIED_CODE));
};

export interface QueryOperations {
	listTables: () => Promise<QueryTableSummary[]>;
	getTable: (request: { logicalName: string }) => Promise<QueryTable>;
	runQuery: (request: QueryRunRequest) => Promise<QueryRunResult>;
	listViews: (request: { logicalName: string }) => Promise<QueryViewList>;
}

export const queryOperations = (http: DataverseHttp): QueryOperations => ({
	listTables: async () => {
		const page = await getAllPages<TableRecord>(http, `EntityDefinitions?$select=${TABLE_SELECT}`);
		return queryableTables(page.rows);
	},
	getTable: async ({ logicalName }) => {
		const table = requireLogicalName(logicalName, "Table");
		const [model, relationships] = await Promise.all([
			codegenOperations(http).getTableModel({ entityLogicalName: table }),
			http.get<RelationshipsRecord | undefined>(`EntityDefinitions(LogicalName='${table}')?$select=LogicalName&$expand=${RELATIONSHIP_EXPAND}`),
		]);
		return {
			logicalName: model.logicalName,
			displayName: model.displayName,
			entitySetName: model.entitySetName,
			primaryIdAttribute: model.primaryIdAttribute,
			primaryNameAttribute: model.primaryNameAttribute,
			columns: model.columns.map(toQueryColumn),
			manyToOne: (relationships?.ManyToOneRelationships ?? []).map(toManyToOne).sort(bySchemaName),
			oneToMany: (relationships?.OneToManyRelationships ?? []).map(toOneToMany).sort(bySchemaName),
			manyToMany: (relationships?.ManyToManyRelationships ?? []).map(toManyToMany).sort(bySchemaName),
		};
	},
	runQuery: async ({ entitySetName, fetchXml }) => {
		if (!fetchXml.trim()) {
			throw new DataverseOperationError("InvalidArgument", "Enter a Fetch XML query to run");
		}
		const path = fetchXmlPath(requireIdentifier(entitySetName, "Entity set"), fetchXml);
		const started = performance.now();
		const body = (await getBatchedWhenLong<QueryResponse | undefined>(http, path, { Prefer: QUERY_PREFER_HEADER })) ?? {};
		const elapsedMs = Math.round(performance.now() - started);
		return {
			rows: body.value ?? [],
			moreRecords: body[MORE_RECORDS_ANNOTATION] === true,
			pagingCookie: decodePagingCookie(body[PAGING_COOKIE_ANNOTATION]),
			totalRecordCount: totalRecordCount(body),
			totalRecordCountLimitExceeded: body[TOTAL_RECORD_COUNT_LIMIT_EXCEEDED_ANNOTATION] === true,
			elapsedMs,
			annotations: topLevelAnnotations(body),
		};
	},
	listViews: async ({ logicalName }) => {
		const table = requireLogicalName(logicalName, "Table");
		const [system, personal] = await Promise.all([
			getAllPages<ViewRecord>(http, viewsPath("savedqueries", table)),
			getAllPages<ViewRecord>(http, viewsPath("userqueries", table)).then(
				(page) => ({ rows: page.rows, unavailable: null as string | null }),
				(error: unknown) => {
					if (!isPrivilegeError(error)) {
						throw error;
					}
					return { rows: [] as ViewRecord[], unavailable: `Personal Views could not be read: ${describeError(error)}` };
				}
			),
		]);
		return {
			views: [...toViews(system.rows, "system"), ...toViews(personal.rows, "personal")],
			personalViewsUnavailable: personal.unavailable,
		};
	},
});
