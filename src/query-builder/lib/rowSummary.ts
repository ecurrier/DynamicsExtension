import {
	attributeValue,
	columnOf,
	columnTableAt,
	type FetchXmlDocument,
	isKnownElement,
	type NodePath,
	nodeAtPath,
	operatorDefinition,
	type QueryMetadata,
	type XmlElement,
	type XmlNode,
} from "@/shared/lib/fetchxml";
import { type QueryColumn } from "@/shared/types";

export type NamesLead = "logical" | "display";

export type SummaryTone = "name" | "alt" | "word" | "value";

export type SummaryPart = { readonly text: string; readonly tone: SummaryTone };

export type SummaryGroup = readonly SummaryPart[];

export type RowSummary = readonly SummaryGroup[];

const FETCH_HIDDEN = new Set(["version", "mapping", "output-format", "paging-cookie"]);

const ATTRIBUTE_EXTRAS = ["alias", "aggregate", "groupby", "dategrouping", "distinct", "usertimezone", "rowaggregate"];

const FILTER_EXTRAS = ["hint", "isquickfindfields", "overridequickfindrecordlimitenabled", "overridequickfindrecordlimitdisabled"];

const word = (text: string): SummaryPart => ({ text, tone: "word" });

const value = (text: string): SummaryPart => ({ text, tone: "value" });

const present = (element: XmlElement, name: string): string | undefined => {
	const found = attributeValue(element, name)?.trim();
	return found === undefined || found === "" ? undefined : found;
};

export const namedParts = (logical: string, display: string | undefined, lead: NamesLead, prefix = ""): SummaryPart[] => {
	const other = display !== undefined && display.trim() !== "" && display !== logical ? display : undefined;
	if (other === undefined) {
		return [{ text: `${prefix}${logical}`, tone: "name" }];
	}
	return lead === "display"
		? [
				{ text: `${prefix}${other}`, tone: "name" },
				{ text: logical, tone: "alt" },
			]
		: [
				{ text: `${prefix}${logical}`, tone: "name" },
				{ text: other, tone: "alt" },
			];
};

const tableDisplayName = (metadata: QueryMetadata, logicalName: string): string | undefined => {
	const lookup = metadata(logicalName);
	return lookup.state === "loaded" ? lookup.table.displayName : undefined;
};

const columnAt = (document: FetchXmlDocument, path: NodePath, attributeName: string, columnName: string, metadata: QueryMetadata): QueryColumn | undefined => {
	const owner = columnTableAt(document, path, attributeName);
	if (owner.kind !== "table") {
		return undefined;
	}
	const lookup = metadata(owner.tableLogicalName);
	return lookup.state === "loaded" ? columnOf(lookup.table, columnName) : undefined;
};

const tableParts = (element: XmlElement, metadata: QueryMetadata, lead: NamesLead): SummaryPart[] => {
	const name = present(element, "name");
	return name === undefined ? [word('name=""')] : namedParts(name, tableDisplayName(metadata, name), lead);
};

const columnParts = (
	document: FetchXmlDocument,
	path: NodePath,
	element: XmlElement,
	attributeName: string,
	metadata: QueryMetadata,
	lead: NamesLead
): SummaryPart[] => {
	const name = present(element, attributeName);
	if (name === undefined) {
		return [word(`${attributeName}=""`)];
	}
	const entityName = ["condition", "order"].includes(element.name) ? present(element, "entityname") : undefined;
	const prefix = entityName === undefined ? "" : `${entityName}.`;
	return namedParts(name, columnAt(document, path, attributeName, name, metadata)?.displayName, lead, prefix);
};

const pairs = (element: XmlElement, names: readonly string[]): SummaryGroup[] =>
	names.flatMap((name) => {
		const found = attributeValue(element, name);
		return found === undefined ? [] : [[word(name), value(found)]];
	});

const valueTexts = (element: XmlElement): string[] => {
	const single = attributeValue(element, "value");
	const listed = element.children.flatMap((child) =>
		child.kind === "element" && child.name === "value" && !child.excluded
			? [child.children.map((each) => (each.kind === "text" ? each.value : "")).join("")]
			: []
	);
	return [...(single === undefined ? [] : [single]), ...listed];
};

export const choiceValueText = (raw: string, column: QueryColumn | undefined): string => {
	const option = column?.options.find((each) => String(each.value) === raw.trim());
	return option ? `${option.label} · ${raw}` : raw;
};

const conditionSummary = (document: FetchXmlDocument, path: NodePath, element: XmlElement, metadata: QueryMetadata, lead: NamesLead): RowSummary => {
	const columnName = present(element, "attribute");
	const column = columnName === undefined ? undefined : columnAt(document, path, "attribute", columnName, metadata);
	const operator = present(element, "operator");
	const head: SummaryPart[] = [...columnParts(document, path, element, "attribute", metadata, lead), word(operator ?? 'operator=""')];
	const valueOf = present(element, "valueof");
	if (valueOf !== undefined) {
		return [[...head, word("valueof"), { text: valueOf, tone: "name" }]];
	}
	const texts = valueTexts(element);
	if (texts.length === 0 || operatorDefinition(operator ?? "")?.values === "none") {
		return [head];
	}
	return [[...head, value(texts.map((text) => choiceValueText(text, column)).join(", "))]];
};

const orderSummary = (document: FetchXmlDocument, path: NodePath, element: XmlElement, metadata: QueryMetadata, lead: NamesLead): RowSummary => {
	const alias = present(element, "alias");
	const target =
		present(element, "attribute") === undefined && alias !== undefined
			? [word("alias"), value(alias)]
			: columnParts(document, path, element, "attribute", metadata, lead);
	const descending = ["true", "1"].includes(attributeValue(element, "descending")?.trim() ?? "");
	const groups: SummaryGroup[] = [[...target, word(descending ? "descending" : "ascending")]];
	return present(element, "attribute") !== undefined && alias !== undefined ? [...groups, [word("alias"), value(alias)]] : groups;
};

const filterSummary = (element: XmlElement): RowSummary => {
	const type = attributeValue(element, "type")?.trim() ?? "and";
	return [[word(type === "" ? "AND" : type.toUpperCase())], ...pairs(element, FILTER_EXTRAS)];
};

const fetchSummary = (element: XmlElement): RowSummary => [
	[word("fetch")],
	...pairs(
		element,
		element.attributes.map((attribute) => attribute.name).filter((name) => !FETCH_HIDDEN.has(name))
	),
];

const elementSummary = (document: FetchXmlDocument, path: NodePath, element: XmlElement, metadata: QueryMetadata, lead: NamesLead): RowSummary => {
	if (!isKnownElement(element.name)) {
		return [[word(`<${element.name}>`)]];
	}
	switch (element.name) {
		case "fetch":
			return fetchSummary(element);
		case "entity":
			return [tableParts(element, metadata, lead)];
		case "link-entity":
			return [tableParts(element, metadata, lead), ...pairs(element, ["link-type", "alias"])];
		case "attribute":
			return [columnParts(document, path, element, "name", metadata, lead), ...pairs(element, ATTRIBUTE_EXTRAS)];
		case "all-attributes":
			return [[word("all-attributes")]];
		case "order":
			return orderSummary(document, path, element, metadata, lead);
		case "filter":
			return filterSummary(element);
		case "condition":
			return conditionSummary(document, path, element, metadata, lead);
		default:
			return [[word(element.name)]];
	}
};

const commentSummary = (content: string): RowSummary => [[value(content.replace(/\s+/g, " ").trim())]];

export const rowSummary = (document: FetchXmlDocument, path: NodePath, metadata: QueryMetadata, lead: NamesLead): RowSummary => {
	const node: XmlNode | undefined = nodeAtPath(document, path);
	if (!node) {
		return [];
	}
	if (node.kind === "comment") {
		return commentSummary(node.content);
	}
	if (node.kind === "text") {
		return [[value(node.value.trim())]];
	}
	return elementSummary(document, path, node, metadata, lead);
};

export const summaryText = (summary: RowSummary): string =>
	summary.map((group) => group.map((part) => (part.tone === "alt" ? `(${part.text})` : part.text)).join(" ")).join(" · ");
