import { attributeValue, type FetchXmlDocument, toJavaScriptString } from "@/shared/lib/fetchxml";

export const rootTableOf = (document: FetchXmlDocument): string | null => {
	const entity = document.root.children.find((child) => child.kind === "element" && child.name === "entity" && !child.excluded);
	const name = entity?.kind === "element" ? attributeValue(entity, "name")?.trim() : undefined;
	return name ? name : null;
};

export const xrmFetchXmlSnippet = (document: FetchXmlDocument): string | null => {
	const table = rootTableOf(document);
	if (table === null) {
		return null;
	}
	return [
		`const fetchXml = ${toJavaScriptString(document)};`,
		"const result = await Xrm.WebApi.retrieveMultipleRecords(",
		`  "${table}",`,
		"  `?fetchXml=${encodeURIComponent(fetchXml)}`,",
		");",
		"console.table(result.entities);",
	].join("\n");
};
