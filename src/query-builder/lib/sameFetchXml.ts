import { parseFetchXml, serializeFetchXml } from "@/shared/lib/fetchxml";

export const normalizeFetchXml = (text: string): string => {
	const result = parseFetchXml(text);
	return result.ok ? serializeFetchXml(result.document, { minify: true, omitExcluded: false }) : text.trim();
};

export const sameFetchXml = (left: string, right: string): boolean => left === right || normalizeFetchXml(left) === normalizeFetchXml(right);
