import { type FetchXmlDocument, type XmlElement } from "@/shared/lib/fetchxml";
import { type QueryTableSummary } from "@/shared/types";

export const rootTableName = (document: FetchXmlDocument): string | null => {
	if (document.root.name !== "fetch") {
		return null;
	}
	const entity = document.root.children.find((child): child is XmlElement => child.kind === "element" && child.name === "entity" && !child.switchedOff);
	const name = entity?.attributes.find((attribute) => attribute.name === "name")?.value.trim() ?? "";
	return name.length > 0 ? name : null;
};

export const findTable = (tables: readonly QueryTableSummary[], logicalName: string): QueryTableSummary | null => {
	const wanted = logicalName.toLowerCase();
	return tables.find((table) => table.logicalName.toLowerCase() === wanted) ?? null;
};
