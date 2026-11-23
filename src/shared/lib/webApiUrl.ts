import type { WebApiQueryOptions } from "./fetchxml";
import { originOf } from "./url";

export const WEB_API_ROOT = "/api/data/v9.2/";

export interface WebApiOptionRow {
	readonly label: string;
	readonly value: string;
}

export const webApiBaseUrl = (url: string | null | undefined): string | null => {
	const trimmed = url?.trim() ?? "";
	if (trimmed === "") {
		return null;
	}
	const origin = originOf(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
	return origin ? `${origin}${WEB_API_ROOT}` : null;
};

export const webApiUrl = (baseUrl: string | null, path: string | null): string | null => (baseUrl && path ? `${baseUrl}${path}` : null);

export const webApiOptionRows = (options: WebApiQueryOptions): readonly WebApiOptionRow[] => {
	const rows: WebApiOptionRow[] = [];
	const add = (label: string, value: string | null) => {
		if (value !== null && value !== "") {
			rows.push({ label, value });
		}
	};
	add("$select", options.select);
	add("$filter", options.filter);
	add("$orderby", options.orderby);
	add("$top", options.top === null ? null : String(options.top));
	add("$expand", options.expand);
	add("$count", options.count ? "true" : null);
	add("$apply", options.apply);
	return rows;
};
