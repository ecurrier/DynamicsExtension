import { type SyntaxNode, type Tree } from "@lezer/common";
import { parser } from "@lezer/xml";

import { elementDefinition } from "@/shared/lib/fetchxml";

export type LenientAttribute = { readonly name: string; readonly value: string | null };

export type LinkReference = { readonly reference: string; readonly alias: string | null; readonly tableLogicalName: string | null };

export type AliasReference = {
	readonly alias: string;
	readonly definedBy: "link-entity" | "attribute";
	readonly tableLogicalName: string | null;
	readonly columnLogicalName: string | null;
};

export type ValueOfTarget = { readonly prefix: string | null; readonly tableLogicalName: string };

export type ConditionColumn = { readonly tableLogicalName: string | null; readonly columnLogicalName: string };

export type CompletionScope = {
	readonly tableLogicalName: string | null;
	readonly links: readonly LinkReference[];
	readonly aliases: readonly AliasReference[];
	readonly valueOfTargets: readonly ValueOfTarget[];
	readonly column: ConditionColumn | null;
};

type Range = { readonly from: number; readonly to: number; readonly typed: string };

export type ElementNameContext = Range & {
	readonly kind: "element-name";
	readonly parent: string | null;
	readonly siblings: readonly string[];
	readonly bare: boolean;
};

export type ClosingTagContext = Range & {
	readonly kind: "closing-tag";
	readonly element: string;
	readonly open: readonly string[];
	readonly terminated: boolean;
};

export type AttributeNameContext = Range & {
	readonly kind: "attribute-name";
	readonly element: string;
	readonly present: readonly string[];
	readonly hasValue: boolean;
};

export type AttributeValueContext = Range & {
	readonly kind: "attribute-value";
	readonly element: string;
	readonly attribute: string;
	readonly value: string;
	readonly quoted: boolean;
	readonly attributes: readonly LenientAttribute[];
	readonly scope: CompletionScope;
};

export type ValueTextContext = Range & {
	readonly kind: "value-text";
	readonly scope: CompletionScope;
};

export type NoCompletionContext = { readonly kind: "none" };

export type CompletionContext = ElementNameContext | ClosingTagContext | AttributeNameContext | AttributeValueContext | ValueTextContext | NoCompletionContext;

const NONE: NoCompletionContext = { kind: "none" };

const TABLE_ELEMENTS = ["entity", "link-entity"];

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

const MAX_REPAIRS = 64;

type Source = {
	readonly text: string;
	readonly tree: Tree;
	readonly position: number;
	readonly original: (position: number) => number;
};

type Holder = { readonly node: SyntaxNode; readonly name: string | null };

const decode = (raw: string): string =>
	raw.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-z]+);/g, (match: string, body: string) => {
		if (body.startsWith("#x")) {
			return String.fromCodePoint(parseInt(body.slice(2), 16));
		}
		if (body.startsWith("#")) {
			return String.fromCodePoint(parseInt(body.slice(1), 10));
		}
		return ENTITIES[body] ?? match;
	});

const present = (value: string | null | undefined): string | null => (value === null || value === undefined || value.trim() === "" ? null : value.trim());

type Fix = { readonly at: number; readonly insert: string };

const unterminatedValue = (text: string, value: SyntaxNode): Fix | undefined => {
	const raw = text.slice(value.from, value.to);
	const quote = raw.charAt(0);
	const closed = raw.length >= 2 && raw.endsWith(quote);
	const at = raw.slice(1, closed ? -1 : undefined).search(/[\n<]/);
	return at >= 0 ? { at: value.from + 1 + at, insert: quote } : undefined;
};

const unendedTag = (text: string, tag: SyntaxNode, limit: number): Fix | undefined => {
	const values = tag.getChildren("Attribute").flatMap((attribute) => attribute.getChildren("AttributeValue"));
	if (tag.getChild("EndTag") || tag.getChild("SelfCloseEndTag") || values.some((value) => unterminatedValue(text, value))) {
		return undefined;
	}
	const last = [...tag.getChildren("TagName"), ...tag.getChildren("Attribute")].sort((left, right) => right.to - left.to)[0];
	if (!last) {
		return undefined;
	}
	const gap = text.slice(last.to).search(/\S/);
	const next = last.to + Math.max(gap, 0);
	return gap >= 0 && next < limit && text.charAt(next) === "<" ? { at: last.to, insert: ">" } : undefined;
};

const firstFix = (text: string, tree: Tree, limit: number): Fix | undefined => {
	let found: Fix | undefined;
	tree.iterate({
		enter: (cursor) => {
			if (found || cursor.from >= limit) {
				return false;
			}
			if (cursor.name === "OpenTag") {
				found = unendedTag(text, cursor.node, limit);
			}
			if (cursor.name === "AttributeValue") {
				found = unterminatedValue(text, cursor.node);
				return false;
			}
			return undefined;
		},
	});
	return found;
};

const repaired = (text: string, offset: number): Source => {
	const points: number[] = [];
	const toRepaired = (position: number): number => position + points.filter((point) => point < position).length;
	const quoteIndexes = (): number[] => points.map((point) => toRepaired(point) + points.filter((other) => other === point).length - 1);
	const original = (position: number): number => position - quoteIndexes().filter((index) => index < position).length;
	let current = text;
	for (let attempt = 0; attempt < MAX_REPAIRS; attempt += 1) {
		const tree = parser.parse(current);
		const position = toRepaired(offset);
		const fix = firstFix(current, tree, position);
		if (!fix) {
			return { text: current, tree, position, original };
		}
		points.push(original(fix.at));
		points.sort((left, right) => left - right);
		current = current.slice(0, fix.at) + fix.insert + current.slice(fix.at);
	}
	return { text: current, tree: parser.parse(current), position: toRepaired(offset), original };
};

const sliceOf = (source: Source, node: SyntaxNode): string => source.text.slice(node.from, node.to);

const tagOf = (element: SyntaxNode): SyntaxNode | null => {
	const first = element.firstChild;
	return first && (first.name === "OpenTag" || first.name === "SelfClosingTag") ? first : null;
};

const elementName = (source: Source, element: SyntaxNode): string => {
	const name = tagOf(element)?.getChild("TagName");
	return name ? sliceOf(source, name) : "";
};

const attributesOfTag = (source: Source, tag: SyntaxNode | null): LenientAttribute[] =>
	(tag?.getChildren("Attribute") ?? []).flatMap((attribute): LenientAttribute[] => {
		const name = attribute.getChild("AttributeName");
		if (!name) {
			return [];
		}
		const valueNode = attribute.getChild("AttributeValue");
		if (!valueNode) {
			return [{ name: sliceOf(source, name), value: null }];
		}
		const raw = sliceOf(source, valueNode);
		const quote = raw.charAt(0);
		const closed = raw.length >= 2 && raw.endsWith(quote);
		return [{ name: sliceOf(source, name), value: decode(raw.slice(1, closed ? -1 : undefined)) }];
	});

const attributesOfElement = (source: Source, element: SyntaxNode): LenientAttribute[] => attributesOfTag(source, tagOf(element));

const attributeOf = (attributes: readonly LenientAttribute[], name: string): string | null | undefined =>
	attributes.find((attribute) => attribute.name === name)?.value;

const isClosed = (element: SyntaxNode): boolean => {
	const tag = tagOf(element);
	if (tag?.name === "SelfClosingTag") {
		return true;
	}
	const last = element.lastChild;
	return last !== null && last !== tag && last.name === "CloseTag";
};

const isTransparent = (source: Source, element: SyntaxNode): boolean => elementName(source, element) === "";

const isStrayLeaf = (source: Source, element: SyntaxNode): boolean => {
	const definition = elementDefinition(elementName(source, element));
	return definition !== undefined && definition.children.length === 0 && !isClosed(element);
};

const enclosingElement = (source: Source, node: SyntaxNode, skipStrayLeaves: boolean): SyntaxNode | null => {
	for (let current = node.parent; current; current = current.parent) {
		if (current.name !== "Element" || isTransparent(source, current)) {
			continue;
		}
		if (skipStrayLeaves && isStrayLeaf(source, current)) {
			continue;
		}
		return current;
	}
	return null;
};

const lineage = (source: Source, element: SyntaxNode): SyntaxNode[] => {
	const chain: SyntaxNode[] = [element];
	for (let current = enclosingElement(source, element, false); current; current = enclosingElement(source, current, false)) {
		chain.push(current);
	}
	return chain;
};

const childElements = (source: Source, node: SyntaxNode): SyntaxNode[] =>
	node.getChildren("Element").flatMap((child) => {
		if (isTransparent(source, child)) {
			return childElements(source, child);
		}
		if (isStrayLeaf(source, child)) {
			return [child, ...childElements(source, child)];
		}
		return [child];
	});

const allElements = (source: Source): SyntaxNode[] => {
	const elements: SyntaxNode[] = [];
	source.tree.iterate({
		enter: (cursor) => {
			if (cursor.name === "Element" && !isTransparent(source, cursor.node)) {
				elements.push(cursor.node);
			}
		},
	});
	return elements;
};

const holderOf = (source: Source, chain: readonly SyntaxNode[]): Holder | null => {
	const node = chain.find((element) => TABLE_ELEMENTS.includes(elementName(source, element)));
	return node ? { node, name: present(attributeOf(attributesOfElement(source, node), "name")) } : null;
};

const linkReferences = (source: Source): (LinkReference & { readonly node: SyntaxNode })[] =>
	allElements(source).flatMap((element) => {
		if (elementName(source, element) !== "link-entity") {
			return [];
		}
		const attributes = attributesOfElement(source, element);
		const alias = present(attributeOf(attributes, "alias"));
		const tableLogicalName = present(attributeOf(attributes, "name"));
		const reference = alias ?? tableLogicalName;
		return reference === null ? [] : [{ reference, alias, tableLogicalName, node: element }];
	});

const columnHolder = (source: Source, element: SyntaxNode, attributeName: string): Holder | null => {
	const chain = lineage(source, element);
	const name = elementName(source, element);
	if (name === "link-entity" && attributeName === "to") {
		return holderOf(source, chain.slice(1));
	}
	const entityName = ["condition", "order"].includes(name) ? attributeOf(attributesOfElement(source, element), "entityname") : undefined;
	if (entityName !== undefined && entityName !== null) {
		const link = linkReferences(source).find((candidate) => candidate.reference === entityName.trim());
		return link ? { node: link.node, name: link.tableLogicalName } : null;
	}
	return holderOf(source, chain);
};

const aliasReferences = (source: Source): AliasReference[] =>
	allElements(source).flatMap((element): AliasReference[] => {
		const name = elementName(source, element);
		const attributes = attributesOfElement(source, element);
		const alias = ["link-entity", "attribute"].includes(name) ? present(attributeOf(attributes, "alias")) : null;
		if (alias === null) {
			return [];
		}
		if (name === "link-entity") {
			return [{ alias, definedBy: "link-entity", tableLogicalName: present(attributeOf(attributes, "name")), columnLogicalName: null }];
		}
		return [
			{
				alias,
				definedBy: "attribute",
				tableLogicalName: columnHolder(source, element, "name")?.name ?? null,
				columnLogicalName: present(attributeOf(attributes, "name")),
			},
		];
	});

const scopeOf = (source: Source, element: SyntaxNode, attributeName: string): CompletionScope => {
	const links = linkReferences(source);
	const name = elementName(source, element);
	const condition = name === "condition" ? element : null;
	const own = condition ? columnHolder(source, condition, "attribute") : null;
	const ownTargets: ValueOfTarget[] = own?.name ? [{ prefix: null, tableLogicalName: own.name }] : [];
	const linkedTargets: ValueOfTarget[] = condition
		? links.flatMap((link) =>
				link.tableLogicalName === null || (own && link.node.from === own.node.from)
					? []
					: [{ prefix: link.reference, tableLogicalName: link.tableLogicalName }]
			)
		: [];
	const conditionColumn = condition ? present(attributeOf(attributesOfElement(source, condition), "attribute")) : null;
	return {
		tableLogicalName: columnHolder(source, element, attributeName)?.name ?? null,
		links: links.map(({ reference, alias, tableLogicalName }) => ({ reference, alias, tableLogicalName })),
		aliases: aliasReferences(source),
		valueOfTargets: [...ownTargets, ...linkedTargets],
		column: conditionColumn === null ? null : { tableLogicalName: own?.name ?? null, columnLogicalName: conditionColumn },
	};
};

const rangeOf = (source: Source, from: number, to: number): Range => ({
	from: source.original(from),
	to: source.original(to),
	typed: source.text.slice(from, source.position),
});

const elementNameContext = (source: Source, tag: SyntaxNode, from: number, to: number): ElementNameContext => {
	const element = tag.parent;
	const parent = element ? enclosingElement(source, element, true) : null;
	const siblingNodes = parent ? childElements(source, parent) : source.tree.topNode.getChildren("Element");
	const siblings = siblingNodes.filter((node) => node.from !== element?.from).map((node) => elementName(source, node));
	const bare = tag.getChildren("Attribute").length === 0 && !tag.getChild("EndTag") && !tag.getChild("SelfCloseEndTag");
	return { kind: "element-name", ...rangeOf(source, from, to), parent: parent ? elementName(source, parent) : null, siblings, bare };
};

const isSpace = (character: string): boolean => /\s/.test(character);

const tagContext = (source: Source, tag: SyntaxNode): CompletionContext => {
	const position = source.position;
	const start = tag.firstChild;
	const startEnd = start?.name === "StartTag" ? start.to : tag.from + 1;
	const nameNode = tag.getChild("TagName");
	if (!nameNode) {
		return position === startEnd ? elementNameContext(source, tag, position, position) : NONE;
	}
	if (position < nameNode.from) {
		return NONE;
	}
	if (position <= nameNode.to) {
		return elementNameContext(source, tag, nameNode.from, nameNode.to);
	}
	const element = sliceOf(source, nameNode);
	const attributes = attributesOfTag(source, tag);
	for (const attribute of tag.getChildren("Attribute")) {
		if (position < attribute.from || position > attribute.to) {
			continue;
		}
		const name = attribute.getChild("AttributeName");
		const is = attribute.getChild("Is");
		const valueNode = attribute.getChild("AttributeValue");
		const attributeName = name ? sliceOf(source, name) : "";
		if (name && position <= name.to) {
			return {
				kind: "attribute-name",
				...rangeOf(source, name.from, name.to),
				element,
				present: attributes.map((entry) => entry.name).filter((entry) => entry !== attributeName),
				hasValue: is !== null,
			};
		}
		const others = attributes.filter((entry) => entry.name !== attributeName);
		const owner = tag.parent;
		if (valueNode && position > valueNode.from && owner) {
			const raw = sliceOf(source, valueNode);
			const quote = raw.charAt(0);
			const closed = raw.length >= 2 && raw.endsWith(quote);
			if (closed && position >= valueNode.to) {
				return NONE;
			}
			const from = valueNode.from + 1;
			const to = closed ? valueNode.to - 1 : valueNode.to;
			return {
				kind: "attribute-value",
				...rangeOf(source, from, to),
				element,
				attribute: attributeName,
				value: source.text.slice(from, to),
				quoted: true,
				attributes: others,
				scope: scopeOf(source, owner, attributeName),
			};
		}
		if (is && !valueNode && position >= is.to && owner && source.text.slice(is.to, position).trim() === "") {
			return {
				kind: "attribute-value",
				...rangeOf(source, position, position),
				element,
				attribute: attributeName,
				value: "",
				quoted: false,
				attributes: others,
				scope: scopeOf(source, owner, attributeName),
			};
		}
		return NONE;
	}
	if (isSpace(source.text.charAt(position - 1))) {
		return {
			kind: "attribute-name",
			...rangeOf(source, position, position),
			element,
			present: attributes.map((entry) => entry.name),
			hasValue: false,
		};
	}
	return NONE;
};

const isOpenAt = (source: Source, element: SyntaxNode, position: number): boolean => {
	const tag = tagOf(element);
	if (!tag || tag.name !== "OpenTag" || tag.to > position || isTransparent(source, element)) {
		return false;
	}
	const last = element.lastChild;
	return !(last && last !== tag && last.name === "CloseTag" && last.from < position);
};

const closingTagContext = (source: Source, startClose: SyntaxNode, closeTag: SyntaxNode | null): CompletionContext => {
	const position = source.position;
	const nameNode = closeTag?.getChild("TagName") ?? null;
	const end = closeTag?.getChild("EndTag") ?? null;
	if (position < startClose.to || (end && position > end.from) || (nameNode && position < nameNode.from)) {
		return NONE;
	}
	const open: string[] = [];
	for (let node: SyntaxNode | null = source.tree.resolveInner(startClose.from, -1); node; node = node.parent) {
		if (node.name === "Element" && isOpenAt(source, node, startClose.from)) {
			open.push(elementName(source, node));
		}
	}
	const [element] = open;
	if (element === undefined) {
		return NONE;
	}
	const from = nameNode ? nameNode.from : startClose.to;
	const to = nameNode ? nameNode.to : Math.max(position, startClose.to);
	return { kind: "closing-tag", ...rangeOf(source, from, to), element, open, terminated: end !== null };
};

const valueTextContext = (source: Source, element: SyntaxNode, contentFrom: number, contentTo: number): CompletionContext => {
	const condition = enclosingElement(source, element, false);
	if (!condition || elementName(source, condition) !== "condition") {
		return NONE;
	}
	const raw = source.text.slice(contentFrom, contentTo);
	const from = Math.min(contentFrom + (raw.length - raw.trimStart().length), source.position);
	const to = Math.max(contentTo - (raw.length - raw.trimEnd().length), source.position);
	return { kind: "value-text", ...rangeOf(source, from, to), scope: scopeOf(source, condition, "attribute") };
};

const contentContext = (source: Source, element: SyntaxNode): CompletionContext | undefined => {
	const tag = tagOf(element);
	const end = tag?.getChild("EndTag");
	if (!tag || tag.name !== "OpenTag" || !end || tag.to > source.position) {
		return undefined;
	}
	const last = element.lastChild;
	const closeTag = last && last !== tag && (last.name === "CloseTag" || last.name === "MismatchedCloseTag") ? last : null;
	const contentTo = closeTag ? closeTag.from : element.to;
	if (source.position > contentTo) {
		return undefined;
	}
	return elementName(source, element) === "value" ? valueTextContext(source, element, tag.to, contentTo) : NONE;
};

const isInsideTag = (source: Source, tag: SyntaxNode): boolean => {
	const end = tag.getChild("EndTag") ?? tag.getChild("SelfCloseEndTag");
	return source.position > tag.from && !(end && source.position > end.from);
};

const isInsideLeaf = (source: Source, node: SyntaxNode): boolean => {
	if (source.position <= node.from) {
		return false;
	}
	const raw = sliceOf(source, node);
	const closed = node.name === "Comment" ? raw.length >= 7 && raw.endsWith("-->") : node.name === "Cdata" ? raw.endsWith("]]>") : raw.endsWith(">");
	return !closed || source.position < node.to;
};

const classify = (source: Source): CompletionContext => {
	for (let node: SyntaxNode | null = source.tree.resolveInner(source.position, -1); node; node = node.parent) {
		switch (node.name) {
			case "Comment":
			case "Cdata":
			case "ProcessingInst":
			case "DoctypeDecl":
				if (isInsideLeaf(source, node)) {
					return NONE;
				}
				break;
			case "OpenTag":
			case "SelfClosingTag":
				if (isInsideTag(source, node)) {
					return tagContext(source, node);
				}
				break;
			case "CloseTag":
			case "MismatchedCloseTag": {
				const startClose = node.getChild("StartCloseTag");
				const end = node.getChild("EndTag");
				if (startClose && source.position >= startClose.to && !(end && source.position > end.from)) {
					return closingTagContext(source, startClose, node);
				}
				break;
			}
			case "StartCloseTag":
				if (node.parent?.name !== "CloseTag" && node.parent?.name !== "MismatchedCloseTag" && source.position >= node.to) {
					return closingTagContext(source, node, null);
				}
				break;
			case "Element": {
				const context = contentContext(source, node);
				if (context) {
					return context;
				}
				break;
			}
		}
	}
	return NONE;
};

export const completionContextAt = (text: string, offset: number): CompletionContext => {
	const clamped = Math.max(0, Math.min(offset, text.length));
	return classify(repaired(text, clamped));
};
