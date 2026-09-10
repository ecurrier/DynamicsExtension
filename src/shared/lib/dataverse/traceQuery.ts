import { type PluginTraceLog, type TraceQuery } from "@/shared/types";

import { isGuid, normalizeGuid } from "../guid";
import { odataStringLiteral } from "../odata";

export const TRACE_COLUMNS: readonly string[] = [
	"plugintracelogid",
	"createdon",
	"typename",
	"messagename",
	"primaryentity",
	"operationtype",
	"mode",
	"depth",
	"correlationid",
	"requestid",
	"pluginstepid",
	"performanceexecutionstarttime",
	"performanceexecutionduration",
	"performanceconstructorduration",
	"exceptiondetails",
	"messageblock",
	"configuration",
	"secureconfiguration",
];

export interface PluginTraceLogRecord {
	plugintracelogid: string;
	createdon: string;
	typename?: string | null;
	messagename?: string | null;
	primaryentity?: string | null;
	operationtype?: number | null;
	mode?: number | null;
	depth?: number | null;
	correlationid?: string | null;
	requestid?: string | null;
	pluginstepid?: string | null;
	performanceexecutionstarttime?: string | null;
	performanceexecutionduration?: number | null;
	performanceconstructorduration?: number | null;
	exceptiondetails?: string | null;
	messageblock?: string | null;
	configuration?: string | null;
	secureconfiguration?: string | null;
}

const toIso = (value: string | null): string | null => {
	if (!value) {
		return null;
	}
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const buildTraceFilter = (query: TraceQuery): string | null => {
	const clauses: string[] = [];
	const from = toIso(query.from);
	const to = toIso(query.to);
	if (from) {
		clauses.push(`createdon ge ${from}`);
	}
	if (to) {
		clauses.push(`createdon le ${to}`);
	}
	const contains = (field: string, value: string) => {
		const term = value.trim();
		if (term) {
			clauses.push(`contains(${field},${odataStringLiteral(term)})`);
		}
	};
	contains("typename", query.typeName);
	contains("messagename", query.messageName);
	contains("primaryentity", query.primaryEntity);
	if (query.exceptionsOnly) {
		clauses.push("exceptiondetails ne null");
	}
	const correlation = query.correlationId?.trim() ?? "";
	if (correlation && isGuid(correlation)) {
		clauses.push(`correlationid eq ${normalizeGuid(correlation)}`);
	}
	return clauses.length > 0 ? clauses.join(" and ") : null;
};

export const buildTraceQuery = (query: TraceQuery): string => {
	const filter = buildTraceFilter(query);
	const select = `$select=${TRACE_COLUMNS.join(",")}`;
	return `plugintracelogs?${select}${filter ? `&$filter=${filter}` : ""}&$orderby=createdon desc&$top=${query.top}`;
};

const guidOrNull = (value: string | null | undefined): string | null => (value ? normalizeGuid(value) : null);

export const mapTraceLog = (record: PluginTraceLogRecord): PluginTraceLog => ({
	id: normalizeGuid(record.plugintracelogid),
	createdOn: record.createdon,
	typeName: record.typename ?? "",
	messageName: record.messagename ?? "",
	primaryEntity: record.primaryentity ?? "",
	operationType: record.operationtype ?? 0,
	mode: record.mode ?? 0,
	depth: record.depth ?? 1,
	correlationId: guidOrNull(record.correlationid),
	requestId: guidOrNull(record.requestid),
	pluginStepId: guidOrNull(record.pluginstepid),
	executionStart: record.performanceexecutionstarttime ?? null,
	executionDurationMs: record.performanceexecutionduration ?? null,
	constructorDurationMs: record.performanceconstructorduration ?? null,
	exceptionDetails: record.exceptiondetails ?? null,
	messageBlock: record.messageblock ?? null,
	configuration: record.configuration ?? null,
	secureConfiguration: record.secureconfiguration ?? null,
});

const OPERATION_TYPES: Record<number, string> = { 1: "Plug-in", 2: "Workflow Activity" };

export const operationTypeLabel = (value: number): string => OPERATION_TYPES[value] ?? `Type ${value}`;

export const modeLabel = (value: number): string => (value === 1 ? "Async" : "Sync");
