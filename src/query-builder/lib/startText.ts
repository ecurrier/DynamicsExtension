import { parseFetchXml, serializeFetchXml } from "@/shared/lib/fetchxml";
import { type QueryTableSummary } from "@/shared/types";

import { newQueryDocument } from "./queryStart";

export const editorText = (fetchXml: string): string => {
	const result = parseFetchXml(fetchXml);
	return result.ok ? serializeFetchXml(result.document) : fetchXml.trim();
};

export const blankQueryText = (table: Pick<QueryTableSummary, "logicalName" | "primaryNameAttribute" | "primaryIdAttribute">): string =>
	serializeFetchXml(newQueryDocument(table));
