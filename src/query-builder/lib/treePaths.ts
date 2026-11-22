import { type FetchXmlDocument, type NodePath, nodeAtPath, type XmlElement, type XmlNode } from "@/shared/lib/fetchxml";

export type PathShift =
	| { readonly kind: "none" }
	| { readonly kind: "insert"; readonly parent: NodePath; readonly index: number }
	| { readonly kind: "remove"; readonly path: NodePath }
	| { readonly kind: "move"; readonly path: NodePath; readonly to: number }
	| { readonly kind: "map"; readonly mapping: ReadonlyMap<string, NodePath> };

export const pathKey = (path: NodePath): string => path.join(".");

export const samePath = (left: NodePath | null, right: NodePath | null): boolean =>
	left === right || (left !== null && right !== null && left.length === right.length && left.every((index, at) => index === right[at]));

export const startsWith = (path: NodePath, prefix: NodePath): boolean => prefix.length <= path.length && prefix.every((index, at) => index === path[at]);

export const ancestorKeys = (path: NodePath): string[] => path.map((_, length) => pathKey(path.slice(0, length)));

export const isRowChild = (parent: XmlElement, child: XmlNode): boolean =>
	child.kind !== "text" && !(parent.name === "condition" && child.kind === "element" && child.name === "value");

export const rowPathOf = (document: FetchXmlDocument, path: NodePath): NodePath => {
	for (let length = 1; length <= path.length; length += 1) {
		const node = nodeAtPath(document, path.slice(0, length));
		const parent = nodeAtPath(document, path.slice(0, length - 1));
		if (!node || parent?.kind !== "element" || !isRowChild(parent, node)) {
			return path.slice(0, length - 1);
		}
	}
	return path;
};

export const isRowPath = (document: FetchXmlDocument, path: NodePath): boolean => {
	const node = nodeAtPath(document, path);
	return node !== undefined && samePath(rowPathOf(document, path), path);
};

const shiftChild = (path: NodePath, parent: NodePath, shift: (index: number) => number | null): NodePath | null => {
	if (path.length <= parent.length || !startsWith(path, parent)) {
		return path;
	}
	const index = path[parent.length] ?? 0;
	const next = shift(index);
	return next === null ? null : [...parent, next, ...path.slice(parent.length + 1)];
};

export const remapPath = (path: NodePath, shift: PathShift): NodePath | null => {
	switch (shift.kind) {
		case "none":
			return path;
		case "insert":
			return shiftChild(path, shift.parent, (index) => (index >= shift.index ? index + 1 : index));
		case "remove": {
			const parent = shift.path.slice(0, -1);
			const removed = shift.path.at(-1) ?? 0;
			return shiftChild(path, parent, (index) => (index === removed ? null : index > removed ? index - 1 : index));
		}
		case "move": {
			const parent = shift.path.slice(0, -1);
			const from = shift.path.at(-1) ?? 0;
			return shiftChild(path, parent, (index) => {
				if (index === from) {
					return shift.to;
				}
				if (from < shift.to && index > from && index <= shift.to) {
					return index - 1;
				}
				if (from > shift.to && index >= shift.to && index < from) {
					return index + 1;
				}
				return index;
			});
		}
		case "map":
			return shift.mapping.get(pathKey(path)) ?? null;
	}
};

const indexNodes = (node: XmlNode, path: NodePath, into: Map<XmlNode, NodePath>): void => {
	into.set(node, path);
	if (node.kind === "element") {
		node.children.forEach((child, index) => indexNodes(child, [...path, index], into));
	}
};

const collectMapping = (node: XmlNode, path: NodePath, origins: ReadonlyMap<XmlNode, NodePath>, into: Map<string, NodePath>): NodePath | null => {
	const childOrigins = node.kind === "element" ? node.children.map((child, index) => collectMapping(child, [...path, index], origins, into)) : [];
	const known = origins.get(node);
	const derived = childOrigins.find((origin): origin is NodePath => origin !== null)?.slice(0, -1) ?? null;
	const origin = known ?? (path.length === 0 ? [] : derived);
	if (origin !== null) {
		into.set(pathKey(origin), path);
	}
	return origin;
};

export const pathMapping = (before: FetchXmlDocument, after: FetchXmlDocument): ReadonlyMap<string, NodePath> => {
	const origins = new Map<XmlNode, NodePath>();
	indexNodes(before.root, [], origins);
	const mapping = new Map<string, NodePath>();
	collectMapping(after.root, [], origins, mapping);
	return mapping;
};

export const remapKeys = (keys: ReadonlySet<string>, shift: PathShift): ReadonlySet<string> => {
	if (shift.kind === "none") {
		return keys;
	}
	const next = new Set<string>();
	for (const key of keys) {
		const path = key === "" ? [] : key.split(".").map(Number);
		const mapped = remapPath(path, shift);
		if (mapped !== null) {
			next.add(pathKey(mapped));
		}
	}
	return next;
};
