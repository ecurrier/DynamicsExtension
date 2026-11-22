import { type FetchXmlDocument, type NodePath, type SourceRange, type XmlNode } from "./types";

export const nodeAtPath = (document: FetchXmlDocument, path: NodePath): XmlNode | undefined => {
	let node: XmlNode | undefined = document.root;
	for (const index of path) {
		node = node?.kind === "element" ? node.children[index] : undefined;
	}
	return node;
};

const findPath = (node: XmlNode, target: XmlNode, path: NodePath): NodePath | undefined => {
	if (node === target) {
		return path;
	}
	if (node.kind !== "element") {
		return undefined;
	}
	for (const [index, child] of node.children.entries()) {
		const found = findPath(child, target, [...path, index]);
		if (found) {
			return found;
		}
	}
	return undefined;
};

export const pathOfNode = (document: FetchXmlDocument, node: XmlNode): NodePath | undefined => findPath(document.root, node, []);

export const rangeOfNode = (document: FetchXmlDocument, path: NodePath): SourceRange | undefined => nodeAtPath(document, path)?.range;

const contains = (range: SourceRange | undefined, offset: number, inclusiveEnd: boolean): boolean =>
	range !== undefined && range.from <= offset && (offset < range.to || (inclusiveEnd && offset === range.to));

const deepestAt = (node: XmlNode, offset: number, path: NodePath): NodePath => {
	if (node.kind !== "element") {
		return path;
	}
	const candidates = node.children.map((child, index) => ({ child, index })).filter(({ child }) => child.kind !== "text");
	const hit = candidates.find(({ child }) => contains(child.range, offset, false)) ?? candidates.find(({ child }) => contains(child.range, offset, true));
	return hit ? deepestAt(hit.child, offset, [...path, hit.index]) : path;
};

export const pathAtOffset = (document: FetchXmlDocument, offset: number): NodePath | undefined =>
	contains(document.root.range, offset, true) ? deepestAt(document.root, offset, []) : undefined;
