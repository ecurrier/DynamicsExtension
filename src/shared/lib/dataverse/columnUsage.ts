import { type ColumnUsage, type ColumnUsageRequest, type DependentComponent, type FlowReference, type StepReference } from "@/shared/types";

import { requireLogicalName } from "./guards";
import { type DataverseHttp } from "./http";
import { getAllPages } from "./paging";
import { chunk } from "../chunk";
import { normalizeGuid } from "../guid";
import { odataStringLiteral } from "../odata";

const ATTRIBUTE_COMPONENT_TYPE = 2;
const FLOW_SCAN_LIMIT = 400;
const LOOKUP_CHUNK = 20;

interface ComponentSource {
	entitySet: string;
	idAttribute: string;
	nameAttribute: string;
}

const COMPONENT_SOURCES: Record<number, ComponentSource> = {
	20: { entitySet: "roles", idAttribute: "roleid", nameAttribute: "name" },
	26: { entitySet: "savedqueries", idAttribute: "savedqueryid", nameAttribute: "name" },
	29: { entitySet: "workflows", idAttribute: "workflowid", nameAttribute: "name" },
	59: {
		entitySet: "savedqueryvisualizations",
		idAttribute: "savedqueryvisualizationid",
		nameAttribute: "name",
	},
	60: { entitySet: "systemforms", idAttribute: "formid", nameAttribute: "name" },
	61: { entitySet: "webresourceset", idAttribute: "webresourceid", nameAttribute: "name" },
	80: { entitySet: "appmodules", idAttribute: "appmoduleid", nameAttribute: "name" },
	92: {
		entitySet: "sdkmessageprocessingsteps",
		idAttribute: "sdkmessageprocessingstepid",
		nameAttribute: "name",
	},
};

const COMPONENT_TYPE_LABELS: Record<number, string> = {
	1: "Table",
	2: "Column",
	9: "Choice",
	20: "Security role",
	26: "View",
	29: "Process",
	59: "Chart",
	60: "Form",
	61: "Web resource",
	80: "Model-driven app",
	92: "Plug-in step",
	300: "Canvas app",
	371: "Connection reference",
	372: "Environment variable",
};

const ANNOTATED = { Prefer: 'odata.include-annotations="*"' };
const FORMATTED = "@OData.Community.Display.V1.FormattedValue";

interface DependencyRecord {
	dependentcomponentobjectid?: string | null;
	dependentcomponenttype?: number | null;
	[key: string]: unknown;
}

interface FlowRecord {
	workflowid: string;
	name?: string | null;
	statecode?: number | null;
	ismanaged?: boolean | null;
	clientdata?: string | null;
}

interface StepRecord {
	sdkmessageprocessingstepid: string;
	name?: string | null;
	filteringattributes?: string | null;
	sdkmessageid?: { name?: string | null } | null;
}

interface AttributeRecord {
	MetadataId?: string | null;
	DisplayName?: { UserLocalizedLabel?: { Label?: string | null } | null } | null;
}

const describe = (reason: unknown): string => (reason instanceof Error ? reason.message : String(reason));

export const referencesAttribute = (clientData: string | null | undefined, attribute: string): boolean => {
	if (!clientData) {
		return false;
	}
	return new RegExp(`(^|[^a-z0-9_])${attribute}([^a-z0-9_]|$)`, "i").test(clientData);
};

const resolveNames = async (http: DataverseHttp, componentType: number, ids: string[]): Promise<Map<string, string>> => {
	const source = COMPONENT_SOURCES[componentType];
	const names = new Map<string, string>();
	if (!source || ids.length === 0) {
		return names;
	}
	for (const group of chunk(ids, LOOKUP_CHUNK)) {
		const filter = group.map((id) => `${source.idAttribute} eq ${id}`).join(" or ");
		const response = await http
			.get<{ value?: Record<string, unknown>[] }>(
				`${source.entitySet}?$select=${source.idAttribute},${source.nameAttribute}&$filter=${encodeURIComponent(filter)}`
			)
			.catch(() => undefined);
		for (const row of response?.value ?? []) {
			const id = row[source.idAttribute];
			const name = row[source.nameAttribute];
			if (typeof id === "string" && typeof name === "string") {
				names.set(normalizeGuid(id), name);
			}
		}
	}
	return names;
};

export interface ColumnUsageOperations {
	getColumnUsage: (request: ColumnUsageRequest) => Promise<ColumnUsage>;
}

export const columnUsageOperations = (http: DataverseHttp): ColumnUsageOperations => ({
	getColumnUsage: async ({ entityLogicalName, attributeLogicalName, scanFlows }) => {
		const table = requireLogicalName(entityLogicalName, "Table");
		const attribute = requireLogicalName(attributeLogicalName, "Column");

		const definition = await http
			.get<AttributeRecord>(`EntityDefinitions(LogicalName='${table}')/Attributes(LogicalName='${attribute}')?$select=MetadataId,DisplayName`)
			.catch(() => null);

		let dependents: DependentComponent[] = [];
		let dependentsUnavailable: string | null = null;
		if (definition?.MetadataId) {
			try {
				const response = await http.request<{ value?: DependencyRecord[] }>(
					"GET",
					`RetrieveDependentComponents(ObjectId=${normalizeGuid(definition.MetadataId)},ComponentType=${ATTRIBUTE_COMPONENT_TYPE})`,
					undefined,
					ANNOTATED
				);
				const rows = (response?.value ?? []).filter((row) => !!row.dependentcomponentobjectid);
				const byType = new Map<number, string[]>();
				for (const row of rows) {
					const type = row.dependentcomponenttype ?? -1;
					const list = byType.get(type) ?? [];
					list.push(normalizeGuid(row.dependentcomponentobjectid as string));
					byType.set(type, list);
				}
				const nameMaps = new Map<number, Map<string, string>>();
				await Promise.all(
					[...byType.entries()].map(async ([type, ids]) => {
						nameMaps.set(type, await resolveNames(http, type, ids));
					})
				);
				dependents = rows.map<DependentComponent>((row) => {
					const type = row.dependentcomponenttype ?? -1;
					const id = normalizeGuid(row.dependentcomponentobjectid as string);
					const formatted = row[`dependentcomponenttype${FORMATTED}`];
					return {
						id,
						componentType: type,
						componentTypeLabel: COMPONENT_TYPE_LABELS[type] ?? (typeof formatted === "string" ? formatted : `Type ${type}`),
						name: nameMaps.get(type)?.get(id) ?? null,
						parentName: null,
					};
				});
			} catch (error) {
				dependentsUnavailable = describe(error);
			}
		} else {
			dependentsUnavailable = "The column definition could not be read, so platform dependencies were skipped.";
		}

		let flows: FlowReference[] = [];
		let flowsScanned = 0;
		let flowsUnavailable: string | null = null;
		if (scanFlows) {
			try {
				const page = await getAllPages<FlowRecord>(
					http,
					"workflows?$select=workflowid,name,statecode,ismanaged,clientdata&$filter=category eq 5 and type eq 1",
					undefined,
					FLOW_SCAN_LIMIT
				);
				flowsScanned = page.rows.length;
				flows = page.rows
					.filter((flow) => referencesAttribute(flow.clientdata, attribute))
					.map<FlowReference>((flow) => ({
						id: normalizeGuid(flow.workflowid),
						name: flow.name ?? "",
						enabled: flow.statecode === 1,
						isManaged: flow.ismanaged === true,
					}));
				if (page.truncated) {
					flowsUnavailable = `Only the first ${FLOW_SCAN_LIMIT} cloud flows were scanned.`;
				}
			} catch (error) {
				flowsUnavailable = describe(error);
			}
		}

		let steps: StepReference[] = [];
		let stepsUnavailable: string | null = null;
		try {
			const response = await http.get<{ value?: StepRecord[] }>(
				"sdkmessageprocessingsteps?$select=sdkmessageprocessingstepid,name,filteringattributes" +
					"&$expand=sdkmessageid($select=name)" +
					`&$filter=ishidden/Value eq false and filteringattributes ne null and sdkmessagefilterid/primaryobjecttypecode eq ${odataStringLiteral(table)}`
			);
			steps = (response?.value ?? [])
				.filter((step) =>
					(step.filteringattributes ?? "")
						.split(",")
						.map((entry) => entry.trim())
						.includes(attribute)
				)
				.map<StepReference>((step) => ({
					id: normalizeGuid(step.sdkmessageprocessingstepid),
					name: step.name ?? "",
					messageName: step.sdkmessageid?.name ?? "",
					filteringAttributes: step.filteringattributes ?? "",
				}));
		} catch (error) {
			stepsUnavailable = describe(error);
		}

		return {
			entityLogicalName: table,
			attributeLogicalName: attribute,
			attributeDisplayName: definition?.DisplayName?.UserLocalizedLabel?.Label ?? null,
			dependents,
			dependentsUnavailable,
			flows,
			flowsScanned,
			flowsUnavailable,
			steps,
			stepsUnavailable,
		};
	},
});
