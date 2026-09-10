import { type DataverseHttp } from "@/shared/lib";

export interface FakeHttpCall {
	method: string;
	path: string;
	body?: unknown;
	headers?: Record<string, string>;
}

export type FakeHttpResponse = unknown | ((method: string, path: string, body?: unknown) => unknown);

const matches = (needle: string, method: string, path: string): boolean => {
	const separator = needle.indexOf(" ");
	if (separator > 0) {
		return needle.slice(0, separator) === method && path.includes(needle.slice(separator + 1));
	}
	return path.includes(needle);
};

export const createFakeHttp = (responses: Record<string, FakeHttpResponse> = {}) => {
	const calls: FakeHttpCall[] = [];
	const respond = (method: string, path: string, body?: unknown, headers?: Record<string, string>) => {
		calls.push({ method, path, body, headers });
		const decoded = decodeURIComponent(path);
		const value = Object.entries(responses).find(([needle]) => matches(needle, method, decoded))?.[1];
		return typeof value === "function"
			? Promise.resolve().then(() => (value as (m: string, p: string, b?: unknown) => unknown)(method, path, body))
			: Promise.resolve(value);
	};
	const http = {
		origin: "https://org.crm.dynamics.com",
		apiUrl: "https://org.crm.dynamics.com/api/data/v9.2/",
		request: respond,
		get: (path: string) => respond("GET", path),
		post: (path: string, body: unknown) => respond("POST", path, body),
		patch: (path: string, body: unknown) => respond("PATCH", path, body),
		delete: (path: string) => respond("DELETE", path),
	} as unknown as DataverseHttp;
	return { http, calls };
};
