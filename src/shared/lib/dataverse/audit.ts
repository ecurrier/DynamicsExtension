import { type AuditChange, type AuditDetail, type AuditDetailRequest, type AuditEntry, type RecordHistory, type RecordHistoryRequest } from "@/shared/types";

import { resolveEntityRef } from "./entityRef";
import { requireGuid } from "./guards";
import { type DataverseHttp } from "./http";
import { describeError } from "../errors";
import { normalizeGuid } from "../guid";

const ANNOTATED = { Prefer: 'odata.include-annotations="*"' };
const FORMATTED = "@OData.Community.Display.V1.FormattedValue";
const DEFAULT_TOP = 100;

const DETAIL_LABELS: Record<string, string> = {
	AttributeAuditDetail: "Column changes",
	RelationshipAuditDetail: "Relationship change",
	RolePrivilegeAuditDetail: "Role privilege change",
	ShareAuditDetail: "Sharing change",
	UserAccessAuditDetail: "User access",
};

const DETAIL_NOTES: Record<string, string> = {
	RelationshipAuditDetail: "Records were associated or disassociated through a many-to-many relationship.",
	RolePrivilegeAuditDetail: "Privileges on a security role were added, removed, or replaced.",
	ShareAuditDetail: "Access to this record was shared, changed, or revoked.",
	UserAccessAuditDetail: "A user access event was recorded rather than a data change.",
};

interface AuditRecord {
	auditid: string;
	createdon?: string | null;
	_userid_value?: string | null;
	[key: string]: unknown;
}

interface ManagedProperty {
	Value?: boolean | null;
}

interface AttributeAuditRecord {
	LogicalName: string;
	AttributeType?: string | null;
	IsAuditEnabled?: ManagedProperty | null;
	IsValidForRead?: boolean | null;
	AttributeOf?: string | null;
}

type AuditValues = Record<string, unknown>;

interface AuditDetailResponse {
	AuditDetail?: {
		"@odata.type"?: string;
		OldValue?: AuditValues | null;
		NewValue?: AuditValues | null;
		DeletedAttributes?: { Keys?: string[]; Values?: unknown[] } | null;
	} | null;
}

const annotation = (record: Record<string, unknown>, key: string): string | null => {
	const value = record[key];
	return typeof value === "string" ? value : null;
};

const toEntry = (record: AuditRecord): AuditEntry => ({
	id: normalizeGuid(record.auditid),
	createdOn: record.createdon ?? "",
	userId: record._userid_value ? normalizeGuid(record._userid_value) : null,
	userName: annotation(record, `_userid_value${FORMATTED}`),
	actionLabel: annotation(record, `action${FORMATTED}`) ?? "Unknown event",
	operationLabel: annotation(record, `operation${FORMATTED}`) ?? "",
});

export const readAuditValues = (values: AuditValues | null | undefined): Map<string, string> => {
	const result = new Map<string, string>();
	if (!values) {
		return result;
	}
	for (const [key, value] of Object.entries(values)) {
		if (key.startsWith("@") || key.includes("@")) {
			continue;
		}
		const formatted = values[`${key}${FORMATTED}`];
		if (typeof formatted === "string") {
			result.set(key, formatted);
			continue;
		}
		result.set(key, value === null || value === undefined ? "" : String(value));
	}
	return result;
};

export const diffAuditValues = (oldValues: AuditValues | null | undefined, newValues: AuditValues | null | undefined): AuditChange[] => {
	const before = readAuditValues(oldValues);
	const after = readAuditValues(newValues);
	const keys = [...new Set([...before.keys(), ...after.keys()])].sort();
	return keys.map((attribute) => ({
		attribute,
		oldValue: before.has(attribute) ? (before.get(attribute) ?? "") : null,
		newValue: after.has(attribute) ? (after.get(attribute) ?? "") : null,
	}));
};

export interface AuditOperations {
	getRecordHistory: (request: RecordHistoryRequest) => Promise<RecordHistory>;
	getAuditDetail: (request: AuditDetailRequest) => Promise<AuditDetail>;
}

export const auditOperations = (http: DataverseHttp): AuditOperations => ({
	getRecordHistory: async ({ entityLogicalName, recordId, top }) => {
		const entity = await resolveEntityRef(http, entityLogicalName);
		const record = requireGuid(recordId, "Record");
		const take = Math.min(Math.max(top ?? DEFAULT_TOP, 1), 500);

		const organizationPromise = http
			.get<{ value?: { isauditenabled?: boolean | null }[] }>("organizations?$select=isauditenabled&$top=1")
			.catch(() => null);
		const tablePromise = http
			.get<{ IsAuditEnabled?: ManagedProperty | null }>(`EntityDefinitions(LogicalName='${entity.logicalName}')?$select=IsAuditEnabled`)
			.catch(() => null);
		const attributesPromise = http
			.get<{ value?: AttributeAuditRecord[] }>(
				`EntityDefinitions(LogicalName='${entity.logicalName}')/Attributes` +
					"?$select=LogicalName,AttributeType,IsAuditEnabled,IsValidForRead,AttributeOf"
			)
			.catch(() => null);
		const entriesPromise = http
			.request<{ value?: AuditRecord[] }>(
				"GET",
				"audits?$select=auditid,createdon,action,operation,_userid_value" +
					`&$filter=_objectid_value eq ${record}&$orderby=createdon desc&$top=${take + 1}`,
				undefined,
				ANNOTATED
			)
			.then(
				(response) => ({ rows: response?.value ?? [], error: null as string | null }),
				(reason: unknown) => ({ rows: [] as AuditRecord[], error: describeError(reason) })
			);

		const [organization, table, attributes, entries] = await Promise.all([organizationPromise, tablePromise, attributesPromise, entriesPromise]);

		const attributeRows = (attributes?.value ?? []).filter((attribute) => attribute.IsValidForRead !== false && !attribute.AttributeOf);
		const audited = attributeRows.filter((attribute) => attribute.IsAuditEnabled?.Value === true);
		const unauditedLookups = attributeRows
			.filter((attribute) => attribute.AttributeType === "Lookup" && attribute.IsAuditEnabled?.Value !== true)
			.map((attribute) => attribute.LogicalName)
			.sort();

		return {
			entityLogicalName: entity.logicalName,
			recordId: record,
			entries: entries.rows.slice(0, take).map(toEntry),
			truncated: entries.rows.length > take,
			configuration: {
				organizationEnabled: organization?.value?.[0]?.isauditenabled === true,
				tableEnabled: table?.IsAuditEnabled?.Value === true,
				auditedColumns: audited.length,
				totalColumns: attributeRows.length,
				unauditedLookups,
			},
			unavailable: entries.error,
		};
	},
	getAuditDetail: async ({ auditId }) => {
		const id = requireGuid(auditId, "Audit record");
		const response = await http.request<AuditDetailResponse>("GET", `audits(${id})/Microsoft.Dynamics.CRM.RetrieveAuditDetails`, undefined, ANNOTATED);
		const detail = response?.AuditDetail ?? null;
		const rawType = detail?.["@odata.type"] ?? "";
		const detailType = rawType.replace("#Microsoft.Dynamics.CRM.", "");
		const changes = detailType === "AttributeAuditDetail" ? diffAuditValues(detail?.OldValue, detail?.NewValue) : [];
		const deleted = detail?.DeletedAttributes?.Keys ?? [];
		const deletedNote = deleted.length > 0 ? `Columns removed from the record: ${deleted.join(", ")}` : null;
		const emptyNote = changes.length === 0 ? "No column-level detail was returned for this event." : null;
		const note = DETAIL_NOTES[detailType] ?? deletedNote ?? emptyNote;
		return {
			auditId: id,
			detailType: DETAIL_LABELS[detailType] ?? (detailType || "Audit detail"),
			changes,
			note,
		};
	},
});
