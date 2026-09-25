import { PageError } from "@/messaging/page";
import { createDataverseHttp, type DataverseHttp, DataverseHttpError, type DataverseMethod, WEB_API_VERSION } from "@/shared/lib";
import { type EntityInfo } from "@/shared/types";

import { getXrm } from "./getXrm";

export const WEB_API_PATH = `/api/data/${WEB_API_VERSION}/`;

export const retrieveMultiple = async <T = Record<string, unknown>>(entityLogicalName: string, fetchXml: string): Promise<T[]> => {
	const response = await getXrm().WebApi.retrieveMultipleRecords<T>(entityLogicalName, `?fetchXml=${encodeURIComponent(fetchXml)}`);
	return response?.entities ?? [];
};

export const retrieveMultipleOData = async <T = Record<string, unknown>>(entityLogicalName: string, query: string): Promise<T[]> => {
	const response = await getXrm().WebApi.retrieveMultipleRecords<T>(entityLogicalName, query);
	return response?.entities ?? [];
};

const translate = (error: unknown): never => {
	if (error instanceof DataverseHttpError) {
		throw new PageError("HttpError", error.message, { status: error.status, body: error.body });
	}
	throw error;
};

let cachedHttp: DataverseHttp | null = null;

export const pageHttp = (): DataverseHttp => {
	if (cachedHttp) {
		return cachedHttp;
	}
	const http = createDataverseHttp({ origin: window.location.origin });
	const request = <T>(method: DataverseMethod, path: string, body?: unknown, headers?: Record<string, string>) =>
		http.request<T>(method, path, body, headers).catch(translate);
	cachedHttp = {
		origin: http.origin,
		apiUrl: http.apiUrl,
		request,
		get: (path) => request("GET", path),
		post: (path, body) => request("POST", path, body),
		patch: (path, body) => request("PATCH", path, body),
		delete: (path) => request("DELETE", path),
	};
	return cachedHttp;
};

export interface FetchJsonInit {
	method?: DataverseMethod;
	body?: unknown;
	headers?: Record<string, string>;
}

export const fetchJson = <T>(path: string, init: FetchJsonInit = {}): Promise<T> => pageHttp().request<T>(init.method ?? "GET", path, init.body, init.headers);

export interface LocalizedLabel {
	Label?: string;
}

export interface LabelMetadata {
	UserLocalizedLabel?: LocalizedLabel | null;
	LocalizedLabels?: LocalizedLabel[];
}

export interface EntityMetadataRecord {
	LogicalName: string;
	EntitySetName: string;
	PrimaryIdAttribute: string;
	PrimaryNameAttribute?: string | null;
	DisplayName?: LabelMetadata;
}

export const labelText = (label: LabelMetadata | undefined | null): string | null =>
	label?.UserLocalizedLabel?.Label ?? label?.LocalizedLabels?.[0]?.Label ?? null;

export const fetchEntityInfo = async (entityLogicalName: string): Promise<EntityInfo> => {
	const record = await fetchJson<EntityMetadataRecord>(
		`EntityDefinitions(LogicalName='${entityLogicalName}')?$select=LogicalName,DisplayName,EntitySetName,PrimaryIdAttribute,PrimaryNameAttribute`
	);
	return {
		logicalName: record.LogicalName,
		displayName: labelText(record.DisplayName) ?? record.LogicalName,
		entitySetName: record.EntitySetName,
		primaryIdAttribute: record.PrimaryIdAttribute,
		primaryNameAttribute: record.PrimaryNameAttribute ?? null,
	};
};
