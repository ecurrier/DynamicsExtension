import type { QueryColumn, QueryTable } from "@/shared/types";

import { type FetchXmlDocument, type NodePath, type XmlElement } from "./types";

export type TableLookup = { readonly state: "loaded"; readonly table: QueryTable } | { readonly state: "missing" } | { readonly state: "pending" };

export type QueryMetadata = (tableLogicalName: string) => TableLookup;

export type QueryElement = { readonly element: XmlElement; readonly path: NodePath; readonly active: boolean };

export type LinkEntityReference = {
	readonly reference: string;
	readonly alias: string | null;
	readonly tableLogicalName: string | null;
	readonly path: NodePath;
};

export type ColumnTable =
	| { readonly kind: "table"; readonly tableLogicalName: string; readonly tablePath: NodePath }
	| { readonly kind: "unnamed"; readonly tablePath: NodePath }
	| { readonly kind: "unknown-entityname"; readonly entityName: string }
	| { readonly kind: "none" };

export type AliasDefinition = {
	readonly alias: string;
	readonly definedBy: "link-entity" | "attribute";
	readonly path: NodePath;
	readonly tableLogicalName: string | null;
	readonly columnLogicalName: string | null;
};

export type ValueOfTarget = { readonly prefix: string | null; readonly tableLogicalName: string; readonly tablePath: NodePath };

export type ValueOfColumn = {
	readonly reference: string;
	readonly tableLogicalName: string;
	readonly tablePath: NodePath;
	readonly column: QueryColumn;
};

export type ValueOfResolution =
	| {
			readonly kind: "column";
			readonly prefix: string | null;
			readonly tableLogicalName: string;
			readonly tablePath: NodePath;
			readonly columnLogicalName: string;
	  }
	| { readonly kind: "unknown-alias"; readonly alias: string }
	| { readonly kind: "unresolved" };

const TABLE_ELEMENTS = ["entity", "link-entity"];

const key = (name: string): string => name.trim().toLowerCase();

const present = (value: string | undefined): string | undefined => (value === undefined || value.trim() === "" ? undefined : value.trim());

export const attributeValue = (element: XmlElement, name: string): string | undefined => element.attributes.find((attribute) => attribute.name === name)?.value;

const named = (element: XmlElement, name: string): string | undefined => present(attributeValue(element, name));

export const metadataFrom = (tables: readonly QueryTable[], missing: readonly string[] = []): QueryMetadata => {
	const loaded = new Map(tables.map((table) => [key(table.logicalName), table]));
	const absent = new Set(missing.map(key));
	return (tableLogicalName) => {
		const table = loaded.get(key(tableLogicalName));
		if (table) {
			return { state: "loaded", table };
		}
		return absent.has(key(tableLogicalName)) ? { state: "missing" } : { state: "pending" };
	};
};

export const columnOf = (table: QueryTable, columnLogicalName: string): QueryColumn | undefined =>
	table.columns.find((column) => key(column.logicalName) === key(columnLogicalName));

const collect = (element: XmlElement, path: NodePath, active: boolean, into: QueryElement[]): void => {
	const isActive = active && !element.switchedOff;
	into.push({ element, path, active: isActive });
	element.children.forEach((child, index) => {
		if (child.kind === "element") {
			collect(child, [...path, index], isActive, into);
		}
	});
};

export const elementsIn = (document: FetchXmlDocument): readonly QueryElement[] => {
	const into: QueryElement[] = [];
	collect(document.root, [], true, into);
	return into;
};

const lineage = (document: FetchXmlDocument, path: NodePath): readonly QueryElement[] | undefined => {
	const chain: QueryElement[] = [{ element: document.root, path: [], active: !document.root.switchedOff }];
	for (const [depth, index] of path.entries()) {
		const parent = chain[chain.length - 1];
		const child = parent?.element.children[index];
		if (!parent || child?.kind !== "element") {
			return undefined;
		}
		chain.push({ element: child, path: path.slice(0, depth + 1), active: parent.active && !child.switchedOff });
	}
	return chain;
};

export const tablesNamedIn = (document: FetchXmlDocument): readonly string[] => {
	const seen = new Map<string, string>();
	for (const { element } of elementsIn(document)) {
		const name = TABLE_ELEMENTS.includes(element.name) ? named(element, "name") : undefined;
		if (name !== undefined && !seen.has(key(name))) {
			seen.set(key(name), name);
		}
	}
	return [...seen.values()];
};

export const linkEntityReferences = (document: FetchXmlDocument): readonly LinkEntityReference[] =>
	elementsIn(document).flatMap(({ element, path, active }) => {
		if (!active || element.name !== "link-entity") {
			return [];
		}
		const alias = named(element, "alias") ?? null;
		const tableLogicalName = named(element, "name") ?? null;
		const reference = alias ?? tableLogicalName;
		return reference === null ? [] : [{ reference, alias, tableLogicalName, path }];
	});

const holderTable = (holder: QueryElement | undefined): ColumnTable => {
	if (!holder) {
		return { kind: "none" };
	}
	const name = named(holder.element, "name");
	return name === undefined ? { kind: "unnamed", tablePath: holder.path } : { kind: "table", tableLogicalName: name, tablePath: holder.path };
};

const nearestTable = (chain: readonly QueryElement[]): QueryElement | undefined =>
	[...chain].reverse().find(({ element }) => TABLE_ELEMENTS.includes(element.name));

const linkTable = (link: LinkEntityReference): ColumnTable =>
	link.tableLogicalName === null
		? { kind: "unnamed", tablePath: link.path }
		: { kind: "table", tableLogicalName: link.tableLogicalName, tablePath: link.path };

export const linkEntityFor = (document: FetchXmlDocument, reference: string): LinkEntityReference | undefined =>
	linkEntityReferences(document).find((link) => link.reference === reference.trim());

export const columnTableAt = (document: FetchXmlDocument, path: NodePath, attributeName: string): ColumnTable => {
	const chain = lineage(document, path);
	const node = chain?.[chain.length - 1];
	if (!chain || !node) {
		return { kind: "none" };
	}
	if (node.element.name === "link-entity" && attributeName === "to") {
		return holderTable(nearestTable(chain.slice(0, -1)));
	}
	const entityName = ["condition", "order"].includes(node.element.name) ? attributeValue(node.element, "entityname") : undefined;
	if (entityName !== undefined) {
		const link = linkEntityFor(document, entityName);
		return link ? linkTable(link) : { kind: "unknown-entityname", entityName };
	}
	return holderTable(nearestTable(chain));
};

export const aliasesIn = (document: FetchXmlDocument): readonly AliasDefinition[] =>
	elementsIn(document).flatMap(({ element, path, active }): AliasDefinition[] => {
		const alias = active && ["link-entity", "attribute"].includes(element.name) ? named(element, "alias") : undefined;
		if (alias === undefined) {
			return [];
		}
		if (element.name === "link-entity") {
			return [{ alias, definedBy: "link-entity", path, tableLogicalName: named(element, "name") ?? null, columnLogicalName: null }];
		}
		const owner = columnTableAt(document, path, "name");
		return [
			{
				alias,
				definedBy: "attribute",
				path,
				tableLogicalName: owner.kind === "table" ? owner.tableLogicalName : null,
				columnLogicalName: named(element, "name") ?? null,
			},
		];
	});

const samePath = (left: NodePath, right: NodePath): boolean => left.length === right.length && left.every((index, at) => index === right[at]);

export const valueOfTargets = (document: FetchXmlDocument, conditionPath: NodePath): readonly ValueOfTarget[] => {
	const own = columnTableAt(document, conditionPath, "attribute");
	const ownTarget: ValueOfTarget[] = own.kind === "table" ? [{ prefix: null, tableLogicalName: own.tableLogicalName, tablePath: own.tablePath }] : [];
	const ownPath = own.kind === "table" || own.kind === "unnamed" ? own.tablePath : undefined;
	const linked = linkEntityReferences(document).flatMap((link) =>
		link.tableLogicalName === null || (ownPath && samePath(link.path, ownPath))
			? []
			: [{ prefix: link.reference, tableLogicalName: link.tableLogicalName, tablePath: link.path }]
	);
	return [...ownTarget, ...linked];
};

export const valueOfColumns = (document: FetchXmlDocument, conditionPath: NodePath, metadata: QueryMetadata): readonly ValueOfColumn[] =>
	valueOfTargets(document, conditionPath).flatMap((target) => {
		const lookup = metadata(target.tableLogicalName);
		if (lookup.state !== "loaded") {
			return [];
		}
		return lookup.table.columns.map((column) => ({
			reference: target.prefix === null ? column.logicalName : `${target.prefix}.${column.logicalName}`,
			tableLogicalName: target.tableLogicalName,
			tablePath: target.tablePath,
			column,
		}));
	});

export const resolveValueOf = (document: FetchXmlDocument, conditionPath: NodePath, reference: string): ValueOfResolution => {
	const trimmed = reference.trim();
	const dot = trimmed.indexOf(".");
	if (dot >= 0) {
		const prefix = trimmed.slice(0, dot);
		const link = linkEntityFor(document, prefix);
		if (!link) {
			return { kind: "unknown-alias", alias: prefix };
		}
		return link.tableLogicalName === null
			? { kind: "unresolved" }
			: { kind: "column", prefix, tableLogicalName: link.tableLogicalName, tablePath: link.path, columnLogicalName: trimmed.slice(dot + 1) };
	}
	const own = columnTableAt(document, conditionPath, "attribute");
	return own.kind === "table"
		? { kind: "column", prefix: null, tableLogicalName: own.tableLogicalName, tablePath: own.tablePath, columnLogicalName: trimmed }
		: { kind: "unresolved" };
};
