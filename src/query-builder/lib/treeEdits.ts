import {
	aliasesIn,
	childrenOf,
	columnTableAt,
	createElement,
	deleteExcluded,
	elementDefinition,
	exclude,
	type FetchXmlDocument,
	type FetchXmlEditResult,
	include,
	includeAll,
	insertChild,
	insertionIndex,
	isValidChild,
	moveNode,
	type NodePath,
	nodeAtPath,
	type QueryMetadata,
	removeNode,
	tidy,
	type XmlAttribute,
	type XmlElement,
} from "@/shared/lib/fetchxml";
import { type QueryTable } from "@/shared/types";

import { type PathShift, pathMapping } from "./treePaths";

export interface QueryChange {
	readonly document: FetchXmlDocument;
	readonly shift: PathShift;
	readonly select: NodePath | null;
}

export type ChangeResult = { readonly ok: true; readonly change: QueryChange } | { readonly ok: false; readonly reason: string };

export const ALREADY_TIDY = "The rows are already in the standard order";

export const addableKinds = (element: XmlElement): readonly string[] => {
	const definition = elementDefinition(element.name);
	if (!definition) {
		return [];
	}
	return childrenOf(element.name).filter((kind) => {
		if (kind === "value") {
			return false;
		}
		const max = definition.children.find((rule) => rule.name === kind)?.max;
		const count = element.children.filter((child) => child.kind === "element" && child.name === kind).length;
		return max === undefined || count < max;
	});
};

const refuse = (reason: string): ChangeResult => ({ ok: false, reason });

const elementAt = (document: FetchXmlDocument, path: NodePath): XmlElement | undefined => {
	const node = nodeAtPath(document, path);
	return node?.kind === "element" ? node : undefined;
};

const attribute = (name: string, value: string): XmlAttribute => ({ name, value });

const attributeOf = (element: XmlElement, name: string): string | undefined => element.attributes.find((each) => each.name === name)?.value;

const tableAt = (document: FetchXmlDocument, path: NodePath, metadata: QueryMetadata): QueryTable | undefined => {
	const owner = columnTableAt(document, path, "name");
	if (owner.kind !== "table") {
		return undefined;
	}
	const lookup = metadata(owner.tableLogicalName);
	return lookup.state === "loaded" ? lookup.table : undefined;
};

const freshColumn = (parent: XmlElement, table: QueryTable | undefined): string => {
	const taken = new Set(
		parent.children.flatMap((child) => (child.kind === "element" && child.name === "attribute" ? [(attributeOf(child, "name") ?? "").toLowerCase()] : []))
	);
	const candidates = [table?.primaryNameAttribute ?? null, table?.primaryIdAttribute ?? null].filter((name): name is string => name !== null && name !== "");
	return candidates.find((name) => !taken.has(name.toLowerCase())) ?? "";
};

export const uniqueAlias = (document: FetchXmlDocument, base: string): string => {
	const taken = new Set(aliasesIn(document).map((alias) => alias.alias.toLowerCase()));
	const stem = base.replace(/[^A-Za-z0-9_]/g, "") || "link";
	const start = /^[A-Za-z_]/.test(stem) ? stem : `link${stem}`;
	if (!taken.has(start.toLowerCase())) {
		return start;
	}
	let suffix = 2;
	while (taken.has(`${start}${suffix}`.toLowerCase())) {
		suffix += 1;
	}
	return `${start}${suffix}`;
};

const newLinkEntity = (document: FetchXmlDocument, parent: XmlElement, table: QueryTable | undefined): XmlElement => {
	const relationship = table?.manyToOne[0];
	const linkType = parent.name === "filter" ? "any" : "outer";
	if (!relationship) {
		return createElement("link-entity", [
			attribute("name", ""),
			attribute("from", ""),
			attribute("to", ""),
			attribute("link-type", linkType),
			attribute("alias", uniqueAlias(document, "link")),
		]);
	}
	return createElement("link-entity", [
		attribute("name", relationship.referencedTable),
		attribute("from", relationship.referencedColumn),
		attribute("to", relationship.lookupColumn),
		attribute("link-type", linkType),
		attribute("alias", uniqueAlias(document, relationship.referencedTable)),
	]);
};

export const newChild = (document: FetchXmlDocument, parentPath: NodePath, kind: string, metadata: QueryMetadata): XmlElement | undefined => {
	const parent = elementAt(document, parentPath);
	if (!parent) {
		return undefined;
	}
	const table = tableAt(document, parentPath, metadata);
	const primaryName = table?.primaryNameAttribute ?? table?.primaryIdAttribute ?? "";
	switch (kind) {
		case "entity":
			return createElement("entity", [attribute("name", "")]);
		case "attribute":
			return createElement("attribute", [attribute("name", freshColumn(parent, table))]);
		case "all-attributes":
			return createElement("all-attributes");
		case "order":
			return createElement("order", [attribute("attribute", primaryName)]);
		case "filter": {
			const parentType = parent.name === "filter" ? (attributeOf(parent, "type") ?? "and").trim().toLowerCase() : "or";
			return createElement("filter", [attribute("type", parentType === "or" ? "and" : "or")]);
		}
		case "condition":
			return createElement("condition", [attribute("attribute", primaryName), attribute("operator", "eq"), attribute("value", "")]);
		case "link-entity":
			return newLinkEntity(document, parent, table);
		default:
			return undefined;
	}
};

const changed = (result: FetchXmlEditResult, shift: PathShift, select: NodePath | null): ChangeResult =>
	result.ok ? { ok: true, change: { document: result.document, shift, select } } : refuse(result.reason);

export const addChild = (document: FetchXmlDocument, parentPath: NodePath, kind: string, metadata: QueryMetadata): ChangeResult => {
	const parent = elementAt(document, parentPath);
	if (!parent) {
		return refuse("There is no element at that path");
	}
	if (!addableKinds(parent).includes(kind)) {
		return refuse(isValidChild(parent.name, kind) ? `${parent.name} cannot hold another ${kind}` : `${parent.name} cannot hold ${kind}`);
	}
	const child = newChild(document, parentPath, kind, metadata);
	if (!child) {
		return refuse(`${parent.name} cannot hold ${kind}`);
	}
	const index = insertionIndex(parent, kind);
	return changed(insertChild(document, parentPath, index, child), { kind: "insert", parent: parentPath, index }, [...parentPath, index]);
};

export const isFixedPath = (document: FetchXmlDocument, path: NodePath): boolean => {
	const node = nodeAtPath(document, path);
	return path.length === 0 || (path.length === 1 && node?.kind === "element" && node.name === "entity" && document.root.name === "fetch");
};

export const removeRow = (document: FetchXmlDocument, path: NodePath): ChangeResult => {
	if (isFixedPath(document, path)) {
		return refuse("You cannot delete fetch or entity");
	}
	const parentPath = path.slice(0, -1);
	const parent = elementAt(document, parentPath);
	const index = path.at(-1) ?? 0;
	const remaining = (parent?.children.length ?? 1) - 1;
	const select = index < remaining ? [...parentPath, index] : index > 0 ? [...parentPath, index - 1] : parentPath;
	return changed(removeNode(document, path), { kind: "remove", path }, select);
};

export const moveRow = (document: FetchXmlDocument, path: NodePath, direction: -1 | 1): ChangeResult => {
	if (isFixedPath(document, path)) {
		return refuse("You cannot move fetch or entity");
	}
	const parentPath = path.slice(0, -1);
	const to = (path.at(-1) ?? 0) + direction;
	return changed(moveNode(document, path, to), { kind: "move", path, to }, [...parentPath, to]);
};

export const toggleRow = (document: FetchXmlDocument, path: NodePath): ChangeResult => {
	const node = nodeAtPath(document, path);
	if (node?.kind !== "element") {
		return refuse("You cannot Exclude a comment");
	}
	if (node.excluded) {
		return changed(include(document, path), { kind: "none" }, path);
	}
	if (isFixedPath(document, path)) {
		return refuse(`You cannot Exclude ${node.name}`);
	}
	const result = exclude(document, path);
	const parent = elementAt(document, path.slice(0, -1));
	if (result.ok && parent && !isValidChild(parent.name, node.name)) {
		return refuse(`${node.name} is not valid inside ${parent.name}. If you Exclude it, it becomes a plain comment`);
	}
	return changed(result, { kind: "none" }, path);
};

export const tidyQuery = (document: FetchXmlDocument): ChangeResult => {
	const tidied = tidy(document);
	if (tidied === document) {
		return refuse(ALREADY_TIDY);
	}
	return { ok: true, change: { document: tidied, shift: { kind: "map", mapping: pathMapping(document, tidied) }, select: null } };
};

export const includeAllRows = (document: FetchXmlDocument): ChangeResult => changed(includeAll(document), { kind: "none" }, null);

export const deleteExcludedRows = (document: FetchXmlDocument): ChangeResult => {
	const result = deleteExcluded(document);
	return result.ok
		? { ok: true, change: { document: result.document, shift: { kind: "map", mapping: pathMapping(document, result.document) }, select: null } }
		: refuse(result.reason);
};
