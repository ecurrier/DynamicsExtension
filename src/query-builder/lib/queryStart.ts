import {
	attributeValue,
	columnOf,
	createElement,
	type FetchXmlDocument,
	insertChild,
	removeNode,
	serializeFetchXml,
	setAttribute,
	type XmlAttribute,
	type XmlElement,
	type XmlNode,
} from "@/shared/lib/fetchxml";
import { type QueryRow, type QueryTable, type QueryTableSummary, type RecordSearchResult } from "@/shared/types";

import { presentValue } from "./attributeEdits";
import { type ChangeResult, type QueryChange } from "./treeEdits";
import { pathMapping } from "./treePaths";

const attribute = (name: string, value: string): XmlAttribute => ({ name, value });

export const newQueryDocument = (table: Pick<QueryTableSummary, "logicalName" | "primaryNameAttribute" | "primaryIdAttribute">): FetchXmlDocument => {
	const column = table.primaryNameAttribute ?? table.primaryIdAttribute;
	const children = column ? [createElement("attribute", [attribute("name", column)])] : [];
	return { root: createElement("fetch", [], [createElement("entity", [attribute("name", table.logicalName)], children)]), leading: [], trailing: [] };
};

export const newQueryChange = (table: Pick<QueryTableSummary, "logicalName" | "primaryNameAttribute" | "primaryIdAttribute">): QueryChange => ({
	document: newQueryDocument(table),
	shift: { kind: "none" },
	select: [0],
});

const hasColumn = (table: QueryTable, name: string | undefined): boolean => name === undefined || columnOf(table, name) !== undefined;

const linkReference = (element: XmlElement): string | undefined => presentValue(element, "alias") ?? presentValue(element, "name");

const removedLinks = (children: readonly XmlNode[], table: QueryTable): ReadonlySet<string> =>
	new Set(
		children.flatMap((child) => {
			if (child.kind !== "element") {
				return [];
			}
			if (child.name === "link-entity") {
				const reference = linkReference(child);
				return !hasColumn(table, presentValue(child, "to")) && reference !== undefined ? [reference] : [];
			}
			return child.name === "filter" ? [...removedLinks(child.children, table)] : [];
		})
	);

const keepChild = (child: XmlNode, table: QueryTable, gone: ReadonlySet<string>): XmlNode | null => {
	if (child.kind !== "element") {
		return child;
	}
	switch (child.name) {
		case "attribute":
			return hasColumn(table, presentValue(child, "name")) ? child : null;
		case "order": {
			const entityName = presentValue(child, "entityname");
			if (entityName !== undefined) {
				return gone.has(entityName) ? null : child;
			}
			return hasColumn(table, presentValue(child, "attribute")) ? child : null;
		}
		case "condition": {
			const entityName = presentValue(child, "entityname");
			if (entityName !== undefined) {
				return gone.has(entityName) ? null : child;
			}
			return hasColumn(table, presentValue(child, "attribute")) ? child : null;
		}
		case "link-entity":
			return hasColumn(table, presentValue(child, "to")) ? child : null;
		case "filter": {
			const kept = child.children.map((each) => keepChild(each, table, gone)).filter((each): each is XmlNode => each !== null);
			const hadElements = child.children.some((each) => each.kind === "element");
			const hasElements = kept.some((each) => each.kind === "element");
			if (hadElements && !hasElements) {
				return null;
			}
			return kept.length === child.children.length ? child : { ...child, children: kept, range: undefined };
		}
		default:
			return child;
	}
};

export const changeRootTable = (document: FetchXmlDocument, logicalName: string, table: QueryTable | null): ChangeResult => {
	const index = document.root.children.findIndex((child) => child.kind === "element" && child.name === "entity");
	const entity = document.root.children[index];
	if (document.root.name !== "fetch" || entity?.kind !== "element") {
		return { ok: false, reason: "The Query has no entity element" };
	}
	if ((attributeValue(entity, "name") ?? "").trim().toLowerCase() === logicalName.trim().toLowerCase()) {
		return { ok: false, reason: "Nothing changed" };
	}
	const path = [index];
	if (table === null) {
		const renamed = setAttribute(document, path, "name", logicalName);
		return renamed.ok ? { ok: true, change: { document: renamed.document, shift: { kind: "none" }, select: path } } : renamed;
	}
	const gone = removedLinks(entity.children, table);
	const children = entity.children.map((child) => keepChild(child, table, gone)).filter((child): child is XmlNode => child !== null);
	const replacement: XmlElement = {
		...entity,
		attributes: entity.attributes.map((each) => (each.name === "name" ? attribute("name", logicalName) : { name: each.name, value: each.value })),
		children,
		range: undefined,
	};
	const withName = replacement.attributes.some((each) => each.name === "name")
		? replacement
		: { ...replacement, attributes: [attribute("name", logicalName), ...replacement.attributes] };
	const removed = removeNode(document, path);
	const inserted = removed.ok ? insertChild(removed.document, [], index, withName) : removed;
	if (!inserted.ok) {
		return inserted;
	}
	return { ok: true, change: { document: inserted.document, shift: { kind: "map", mapping: pathMapping(document, inserted.document) }, select: path } };
};

export const RECORD_SEARCH_TOP = 25;

const escapeLike = (text: string): string => text.replace(/[[%_]/g, (character) => `[${character}]`);

export const recordSearchFetchXml = (table: QueryTableSummary, query: string, top = RECORD_SEARCH_TOP, modifiedOn = true): string => {
	const name = table.primaryNameAttribute;
	const trimmed = query.trim();
	const columns = [table.primaryIdAttribute, ...(name ? [name] : []), ...(modifiedOn ? ["modifiedon"] : [])].map((column) =>
		createElement("attribute", [attribute("name", column)])
	);
	const filter =
		name && trimmed !== ""
			? [
					createElement(
						"filter",
						[],
						[
							createElement("condition", [
								attribute("attribute", name),
								attribute("operator", "like"),
								attribute("value", `%${escapeLike(trimmed)}%`),
							]),
						]
					),
				]
			: [];
	const order =
		name && trimmed !== ""
			? [createElement("order", [attribute("attribute", name)])]
			: modifiedOn
				? [createElement("order", [attribute("attribute", "modifiedon"), attribute("descending", "true")])]
				: name
					? [createElement("order", [attribute("attribute", name)])]
					: [];
	const entity = createElement("entity", [attribute("name", table.logicalName)], [...columns, ...order, ...filter]);
	return serializeFetchXml({ root: createElement("fetch", [attribute("top", String(top))], [entity]), leading: [], trailing: [] }, { minify: true });
};

export const recordSearchResults = (table: QueryTableSummary, rows: readonly QueryRow[]): RecordSearchResult[] =>
	rows.flatMap((row) => {
		const id = row[table.primaryIdAttribute];
		if (typeof id !== "string") {
			return [];
		}
		const name = table.primaryNameAttribute ? row[table.primaryNameAttribute] : undefined;
		const modified = row.modifiedon;
		return [{ id, name: typeof name === "string" && name !== "" ? name : id, modifiedOn: typeof modified === "string" ? modified : null }];
	});
