import { removeAttribute, setAttribute } from "./edit";
import { serializeFetchXml } from "./serialize";
import { type FetchXmlDocument, type FetchXmlEditResult } from "./types";

export const DEFAULT_PAGE_SIZE = 50;

export type PageRequest = {
	readonly page: number;
	readonly pagingCookie: string | null;
	readonly pageSize: number;
};

export type PagedFetchXml =
	| { readonly pageable: true; readonly fetchXml: string; readonly page: number; readonly count: number | null }
	| { readonly pageable: false; readonly fetchXml: string; readonly reason: string };

const ROOT: readonly number[] = [];

const attributeOf = (document: FetchXmlDocument, name: string): string | undefined =>
	document.root.attributes.find((attribute) => attribute.name === name)?.value;

const isTrue = (value: string | undefined): boolean => value !== undefined && ["true", "1"].includes(value.trim().toLowerCase());

const positiveInteger = (value: string | undefined): number | null => {
	if (value === undefined || !/^\s*\d+\s*$/.test(value)) {
		return null;
	}
	const parsed = Number.parseInt(value, 10);
	return parsed > 0 ? parsed : null;
};

const unpagedReason = (document: FetchXmlDocument): string | null => {
	if (document.root.name !== "fetch") {
		return "The root element is not fetch";
	}
	if (attributeOf(document, "top") !== undefined) {
		return "A Query with top returns a single page";
	}
	if (isTrue(attributeOf(document, "aggregate"))) {
		return "An aggregate Query returns a single page";
	}
	return null;
};

const andThen = (result: FetchXmlEditResult, next: (document: FetchXmlDocument) => FetchXmlEditResult): FetchXmlEditResult =>
	result.ok ? next(result.document) : result;

const withoutAttribute = (document: FetchXmlDocument, name: string): FetchXmlEditResult =>
	attributeOf(document, name) === undefined ? { ok: true, document } : removeAttribute(document, ROOT, name);

export const pagedFetchXml = (document: FetchXmlDocument, request: PageRequest): PagedFetchXml => {
	const reason = unpagedReason(document);
	if (reason) {
		return { pageable: false, fetchXml: serializeFetchXml(document, { minify: true }), reason };
	}
	const page = Math.max(1, Math.trunc(request.page));
	const ownCount = attributeOf(document, "count");
	const count = ownCount === undefined ? Math.max(1, Math.trunc(request.pageSize)) : positiveInteger(ownCount);
	const cookie = page > 1 ? request.pagingCookie : null;
	let result: FetchXmlEditResult = setAttribute(document, ROOT, "page", String(page));
	if (ownCount === undefined) {
		result = andThen(result, (next) => setAttribute(next, ROOT, "count", String(count)));
	}
	result = andThen(result, (next) => (cookie ? setAttribute(next, ROOT, "paging-cookie", cookie) : withoutAttribute(next, "paging-cookie")));
	if (!result.ok) {
		return { pageable: false, fetchXml: serializeFetchXml(document, { minify: true }), reason: result.reason };
	}
	return { pageable: true, fetchXml: serializeFetchXml(result.document, { minify: true }), page, count };
};
