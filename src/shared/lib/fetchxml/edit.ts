import { nodeAtPath } from "./paths";
import { type FetchXmlDocument, type FetchXmlEditResult, type NodePath, type XmlAttribute, type XmlElement, type XmlNode } from "./types";

const refuse = (reason: string): FetchXmlEditResult => ({ ok: false, reason });

const withoutRange = <T extends XmlNode>(node: T): T => {
	const { range: _range, ...rest } = node;
	return rest as T;
};

const replaceIn = (node: XmlElement, path: NodePath, replacement: XmlNode): XmlElement => {
	const [index, ...rest] = path;
	if (index === undefined) {
		return replacement as XmlElement;
	}
	return {
		...node,
		children: node.children.map((child, position) =>
			position === index ? (rest.length === 0 ? replacement : replaceIn(child as XmlElement, rest, replacement)) : child
		),
	};
};

const replaceAt = (document: FetchXmlDocument, path: NodePath, replacement: XmlNode): FetchXmlEditResult => ({
	ok: true,
	document: { ...document, root: replaceIn(document.root, path, replacement) },
});

const elementAt = (document: FetchXmlDocument, path: NodePath): XmlElement | undefined => {
	const node = nodeAtPath(document, path);
	return node?.kind === "element" ? node : undefined;
};

const ancestorsOf = (document: FetchXmlDocument, path: NodePath): XmlElement[] =>
	path.map((_, length) => elementAt(document, path.slice(0, length))).filter((node): node is XmlElement => node !== undefined);

const descendantsOf = (node: XmlNode): XmlNode[] => (node.kind === "element" ? node.children.flatMap((child) => [child, ...descendantsOf(child)]) : []);

const cannotSitInComment = (node: XmlNode): boolean =>
	[node, ...descendantsOf(node)].some(
		(each) =>
			each.kind === "comment" ||
			(each.kind === "element" && (each.switchedOff || each.name.includes("--") || each.attributes.some((attribute) => attribute.name.includes("--"))))
	);

export const createElement = (name: string, attributes: readonly XmlAttribute[] = [], children: readonly XmlNode[] = []): XmlElement => ({
	kind: "element",
	name,
	attributes,
	children,
	switchedOff: false,
});

export const setAttribute = (document: FetchXmlDocument, path: NodePath, name: string, value: string): FetchXmlEditResult => {
	const element = elementAt(document, path);
	if (!element) {
		return refuse("There is no element at that path");
	}
	const exists = element.attributes.some((attribute) => attribute.name === name);
	const attributes = exists
		? element.attributes.map((attribute) => (attribute.name === name ? { name, value } : attribute))
		: [...element.attributes, { name, value }];
	return replaceAt(document, path, withoutRange({ ...element, attributes }));
};

export const removeAttribute = (document: FetchXmlDocument, path: NodePath, name: string): FetchXmlEditResult => {
	const element = elementAt(document, path);
	if (!element) {
		return refuse("There is no element at that path");
	}
	if (!element.attributes.some((attribute) => attribute.name === name)) {
		return { ok: true, document };
	}
	return replaceAt(document, path, withoutRange({ ...element, attributes: element.attributes.filter((attribute) => attribute.name !== name) }));
};

export const insertChild = (document: FetchXmlDocument, parentPath: NodePath, index: number, node: XmlNode): FetchXmlEditResult => {
	const parent = elementAt(document, parentPath);
	if (!parent) {
		return refuse("There is no element at that path");
	}
	if (!Number.isInteger(index) || index < 0 || index > parent.children.length) {
		return refuse("The index is outside the parent's children");
	}
	const insideSwitchedOff = parent.switchedOff || ancestorsOf(document, parentPath).some((ancestor) => ancestor.switchedOff);
	if (insideSwitchedOff && cannotSitInComment(node)) {
		return refuse("A comment or switched-off node cannot go inside a switched-off node");
	}
	const children = [...parent.children.slice(0, index), node, ...parent.children.slice(index)];
	return replaceAt(document, parentPath, withoutRange({ ...parent, children }));
};

export const removeNode = (document: FetchXmlDocument, path: NodePath): FetchXmlEditResult => {
	const index = path.at(-1);
	const parentPath = path.slice(0, -1);
	const parent = elementAt(document, parentPath);
	if (index === undefined) {
		return refuse("The root element cannot be removed");
	}
	if (!parent || index < 0 || index >= parent.children.length) {
		return refuse("There is no node at that path");
	}
	return replaceAt(document, parentPath, withoutRange({ ...parent, children: parent.children.filter((_, position) => position !== index) }));
};

export const moveNode = (document: FetchXmlDocument, path: NodePath, toIndex: number): FetchXmlEditResult => {
	const index = path.at(-1);
	const parentPath = path.slice(0, -1);
	const parent = elementAt(document, parentPath);
	if (index === undefined) {
		return refuse("The root element cannot be moved");
	}
	const node = parent?.children[index];
	if (!parent || !node) {
		return refuse("There is no node at that path");
	}
	if (!Number.isInteger(toIndex) || toIndex < 0 || toIndex >= parent.children.length) {
		return refuse("The index is outside the parent's children");
	}
	const rest = parent.children.filter((_, position) => position !== index);
	const children = [...rest.slice(0, toIndex), node, ...rest.slice(toIndex)];
	return replaceAt(document, parentPath, withoutRange({ ...parent, children }));
};

export const switchOff = (document: FetchXmlDocument, path: NodePath): FetchXmlEditResult => {
	const element = elementAt(document, path);
	if (path.length === 0) {
		return refuse("The root element cannot be switched off");
	}
	if (!element) {
		return refuse("Only an element can be switched off");
	}
	if (element.switchedOff) {
		return { ok: true, document };
	}
	if (ancestorsOf(document, path).some((ancestor) => ancestor.switchedOff)) {
		return refuse("A node inside a switched-off node cannot be switched off");
	}
	const descendants = descendantsOf(element);
	if (descendants.some((node) => node.kind === "element" && node.switchedOff)) {
		return refuse("Switch on or remove the switched-off nodes inside it first");
	}
	if (descendants.some((node) => node.kind === "comment")) {
		return refuse("Remove the comments inside it first");
	}
	if (cannotSitInComment(element)) {
		return refuse("A name containing -- cannot be written inside a comment");
	}
	return replaceAt(document, path, withoutRange({ ...element, switchedOff: true }));
};

export const switchOn = (document: FetchXmlDocument, path: NodePath): FetchXmlEditResult => {
	const element = elementAt(document, path);
	if (!element) {
		return refuse("Only an element can be switched on");
	}
	if (!element.switchedOff) {
		return { ok: true, document };
	}
	return replaceAt(document, path, withoutRange({ ...element, switchedOff: false }));
};
