import { type FetchXmlDocument, isKnownElement, type NodePath, type QueryMetadata, type XmlElement, type XmlNode } from "@/shared/lib/fetchxml";

import { type NamesLead, rowSummary, type RowSummary } from "./rowSummary";
import { addableKinds, isFixedPath, toggleRow } from "./treeEdits";
import { isRowChild, pathKey } from "./treePaths";

export type RowKind = "fetch" | "entity" | "attribute" | "all-attributes" | "order" | "filter" | "condition" | "link-entity" | "comment" | "unknown";

export type RowExclusion = { readonly included: boolean; readonly disabledReason: string | null };

export interface TreeRow {
	readonly path: NodePath;
	readonly key: string;
	readonly kind: RowKind;
	readonly tag: string | null;
	readonly summary: RowSummary;
	readonly excluded: boolean;
	readonly inactive: boolean;
	readonly exclusion: RowExclusion;
	readonly fixed: boolean;
	readonly canMoveUp: boolean;
	readonly canMoveDown: boolean;
	readonly addKinds: readonly string[];
	readonly precedence: number | null;
	readonly children: readonly TreeRow[];
}

const ROW_KINDS: readonly RowKind[] = ["fetch", "entity", "attribute", "all-attributes", "order", "filter", "condition", "link-entity"];

const kindOf = (node: XmlNode): RowKind => {
	if (node.kind !== "element") {
		return "comment";
	}
	const known = ROW_KINDS.find((kind) => kind === node.name);
	return known !== undefined && isKnownElement(node.name) ? known : "unknown";
};

const exclusionFor = (document: FetchXmlDocument, path: NodePath, node: XmlNode, insideExcluded: boolean): RowExclusion => {
	const result = toggleRow(document, path);
	const included = node.kind === "element" && !node.excluded && !insideExcluded;
	return { included, disabledReason: result.ok ? null : result.reason };
};

const precedenceOf = (parent: XmlElement | null, node: XmlNode): number | null => {
	if (!parent || node.kind !== "element" || node.name !== "order" || node.excluded) {
		return null;
	}
	const orders = parent.children.filter((child) => child.kind === "element" && child.name === "order" && !child.excluded);
	return orders.length > 1 ? orders.indexOf(node) + 1 : null;
};

interface BuildContext {
	readonly document: FetchXmlDocument;
	readonly metadata: QueryMetadata;
	readonly lead: NamesLead;
}

const buildRow = (context: BuildContext, node: XmlNode, path: NodePath, parent: XmlElement | null, insideExcluded: boolean): TreeRow => {
	const fixed = isFixedPath(context.document, path);
	const index = path.at(-1) ?? 0;
	const siblings = parent?.children.length ?? 1;
	const excluded = node.kind === "element" && node.excluded;
	const inactive = insideExcluded || excluded;
	const children =
		node.kind === "element"
			? node.children.flatMap((child, childIndex) => (isRowChild(node, child) ? [buildRow(context, child, [...path, childIndex], node, inactive)] : []))
			: [];
	return {
		path,
		key: pathKey(path),
		kind: kindOf(node),
		tag: node.kind === "element" ? node.name : null,
		summary: rowSummary(context.document, path, context.metadata, context.lead),
		excluded,
		inactive,
		exclusion: exclusionFor(context.document, path, node, insideExcluded),
		fixed,
		canMoveUp: !fixed && index > 0,
		canMoveDown: !fixed && index < siblings - 1,
		addKinds: node.kind === "element" && isKnownElement(node.name) ? addableKinds(node) : [],
		precedence: precedenceOf(parent, node),
		children,
	};
};

export const buildTreeRows = (document: FetchXmlDocument, metadata: QueryMetadata, lead: NamesLead): TreeRow =>
	buildRow({ document, metadata, lead }, document.root, [], null, false);

export const branchKeys = (row: TreeRow): string[] => (row.children.length > 0 ? [row.key, ...row.children.flatMap(branchKeys)] : []);

export const findRow = (row: TreeRow, key: string): TreeRow | undefined =>
	row.key === key ? row : row.children.reduce<TreeRow | undefined>((found, child) => found ?? findRow(child, key), undefined);
