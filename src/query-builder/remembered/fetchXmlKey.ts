import { parseFetchXml } from "@/shared/lib/fetchxml";

import { normalizeFetchXml, rootTableName, sameFetchXml } from "../lib";

export { normalizeFetchXml, sameFetchXml };

const ENTITY_NAME = /<entity\b[^>]*?\bname\s*=\s*(["'])\s*([^"']*?)\s*\1/;

export const fetchXmlTableName = (text: string): string | null => {
	const result = parseFetchXml(text);
	if (result.ok) {
		return rootTableName(result.document);
	}
	const name = ENTITY_NAME.exec(text)?.[2] ?? "";
	return name.length > 0 ? name : null;
};

export const includesText = (haystack: string | null, needle: string): boolean => haystack !== null && haystack.toLowerCase().includes(needle);

export const filterTerm = (text: string): string => text.trim().toLowerCase();
