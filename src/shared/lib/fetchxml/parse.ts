import { type SyntaxNode } from "@lezer/common";
import { parser } from "@lezer/xml";

import { isValidChild } from "./schema";
import {
	type FetchXmlParseError,
	type FetchXmlParseResult,
	type SourceRange,
	type XmlAttribute,
	type XmlComment,
	type XmlElement,
	type XmlNode,
} from "./types";

export type XmlParseOptions = { readonly acceptSwitchedOff?: (parent: string, element: XmlElement) => boolean };

type Context = {
	readonly source: string;
	readonly offset: number;
	readonly allowDeclaration: boolean;
	readonly acceptSwitchedOff: (parent: string, element: XmlElement) => boolean;
	readonly errors: FetchXmlParseError[];
};

type Fragment = { readonly nodes: readonly XmlNode[]; readonly errors: readonly FetchXmlParseError[] };

type PendingText = { readonly value: string; readonly from: number; readonly to: number };

const PREDEFINED_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

const REFERENCE_OR_BREAK = /&(#x[0-9a-fA-F]+|#[0-9]+|[^;\s&<]+);|\r\n?|[\t\n]/g;

const XML_DECLARATION = /^<\?xml(\s|\?>)/;

const rangeOf = (context: Context, from: number, to: number): SourceRange => ({ from: context.offset + from, to: context.offset + to });

const report = (context: Context, message: string, from: number, to: number): void => {
	const end = from === to && from < context.source.length ? from + 1 : to;
	context.errors.push({ message, range: rangeOf(context, from, end) });
};

const sliceOf = (context: Context, node: SyntaxNode): string => context.source.slice(node.from, node.to);

const isCharacter = (code: number): boolean =>
	code === 0x9 ||
	code === 0xa ||
	code === 0xd ||
	(code >= 0x20 && code <= 0xd7ff) ||
	(code >= 0xe000 && code <= 0xfffd) ||
	(code >= 0x10000 && code <= 0x10ffff);

const decodeReference = (context: Context, body: string, from: number, to: number): string | undefined => {
	if (!body.startsWith("#")) {
		const value = PREDEFINED_ENTITIES[body];
		if (value === undefined) {
			report(context, `Unknown entity &${body};`, from, to);
		}
		return value;
	}
	const code = body.startsWith("#x") ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
	if (!isCharacter(code)) {
		report(context, `&${body}; is not a valid character`, from, to);
		return undefined;
	}
	return String.fromCodePoint(code);
};

const decode = (context: Context, raw: string, start: number, inAttribute: boolean): string =>
	raw.replace(REFERENCE_OR_BREAK, (match: string, body: string | undefined, index: number) => {
		if (body === undefined) {
			return inAttribute ? " " : match === "\t" ? "\t" : "\n";
		}
		return decodeReference(context, body, start + index, start + index + match.length) ?? match;
	});

const describeError = (context: Context, node: SyntaxNode): string => {
	if (node.parent?.name === "Attribute") {
		return "Attribute values must be in quotes";
	}
	if (node.from >= context.source.length) {
		return "Unexpected end of input";
	}
	return `Unexpected "${context.source.charAt(node.from)}"`;
};

const readAttributes = (context: Context, tag: SyntaxNode): XmlAttribute[] => {
	const attributes: XmlAttribute[] = [];
	for (const attribute of tag.getChildren("Attribute")) {
		const nameNode = attribute.getChild("AttributeName");
		const valueNode = attribute.getChild("AttributeValue");
		if (!nameNode || !valueNode) {
			continue;
		}
		const name = sliceOf(context, nameNode);
		if (attributes.some((existing) => existing.name === name)) {
			report(context, `Attribute "${name}" appears more than once`, nameNode.from, nameNode.to);
		}
		const raw = context.source.slice(valueNode.from + 1, Math.max(valueNode.from + 1, valueNode.to - 1));
		attributes.push({ name, value: decode(context, raw, valueNode.from + 1, true), range: rangeOf(context, attribute.from, attribute.to) });
	}
	return attributes;
};

const arrangeChildren = (nodes: readonly XmlNode[]): readonly XmlNode[] => {
	if (nodes.every((node) => node.kind === "text")) {
		return nodes;
	}
	return nodes.flatMap((node): XmlNode[] => {
		if (node.kind !== "text") {
			return [node];
		}
		const value = node.value.trim();
		return value ? [{ ...node, value }] : [];
	});
};

const readElement = (context: Context, node: SyntaxNode): XmlElement => {
	const tag = node.firstChild;
	const nameNode = tag?.getChild("TagName");
	const name = nameNode ? sliceOf(context, nameNode) : "";
	const attributes = tag ? readAttributes(context, tag) : [];
	const range = rangeOf(context, node.from, node.to);
	if (!tag || tag.name !== "OpenTag") {
		return { kind: "element", name, attributes, children: [], switchedOff: false, range };
	}
	if (node.lastChild?.name !== "CloseTag") {
		report(context, `<${name}> is not closed`, tag.from, tag.to);
	}
	const children = arrangeChildren(readEntities(context, tag.nextSibling, name));
	return { kind: "element", name, attributes, children, switchedOff: false, range };
};

const acceptAny = (): boolean => true;

const parseFragment = (source: string, offset: number, allowDeclaration: boolean, acceptSwitchedOff: Context["acceptSwitchedOff"]): Fragment => {
	const context: Context = { source, offset, allowDeclaration, acceptSwitchedOff, errors: [] };
	const tree = parser.parse(source);
	tree.iterate({
		enter: (cursor) => {
			if (cursor.type.isError) {
				report(context, describeError(context, cursor.node), cursor.from, cursor.to);
			}
		},
	});
	const nodes = readEntities(context, tree.topNode.firstChild, undefined);
	return { nodes, errors: context.errors };
};

const switchedOffElement = (content: string, offset: number): XmlElement | undefined => {
	const fragment = parseFragment(content, offset, false, acceptAny);
	if (fragment.errors.length > 0) {
		return undefined;
	}
	const significant = fragment.nodes.filter((node) => node.kind !== "text" || node.value.trim() !== "");
	const [only] = significant;
	return significant.length === 1 && only?.kind === "element" ? only : undefined;
};

const readComment = (context: Context, node: SyntaxNode, parent: string | undefined): XmlNode => {
	const raw = sliceOf(context, node);
	const closed = raw.length >= 7 && raw.endsWith("-->");
	if (!closed) {
		report(context, "Comment is not closed", node.from, node.to);
	}
	const content = context.source.slice(node.from + 4, closed ? node.to - 3 : node.to);
	const range = rangeOf(context, node.from, node.to);
	const candidate = closed && parent !== undefined ? switchedOffElement(content, context.offset + node.from + 4) : undefined;
	const element = candidate && parent !== undefined && context.acceptSwitchedOff(parent, candidate) ? candidate : undefined;
	return element ? { ...element, switchedOff: true, range } : { kind: "comment", content, range };
};

const readCdata = (context: Context, node: SyntaxNode): string => {
	const raw = sliceOf(context, node);
	const closed = raw.endsWith("]]>") && raw.length >= 12;
	if (!closed) {
		report(context, "CDATA section is not closed", node.from, node.to);
	}
	return raw.slice(9, closed ? -3 : undefined).replace(/\r\n?/g, "\n");
};

const readProcessingInstruction = (context: Context, node: SyntaxNode): void => {
	const raw = sliceOf(context, node);
	const atStart = context.source.slice(0, node.from).trim() === "";
	if (!(context.allowDeclaration && atStart && XML_DECLARATION.test(raw))) {
		report(context, "Processing instructions are not supported", node.from, node.to);
	}
};

const readEntities = (context: Context, first: SyntaxNode | null, parent: string | undefined): XmlNode[] => {
	const nodes: XmlNode[] = [];
	let pending: PendingText | undefined;
	const appendText = (value: string, from: number, to: number): void => {
		pending = pending ? { value: pending.value + value, from: pending.from, to } : { value, from, to };
	};
	const flush = (): void => {
		if (pending) {
			nodes.push({ kind: "text", value: pending.value, range: rangeOf(context, pending.from, pending.to) });
			pending = undefined;
		}
	};
	for (let node = first; node; node = node.nextSibling) {
		switch (node.name) {
			case "Text":
			case "EntityReference":
			case "CharacterReference":
				appendText(decode(context, sliceOf(context, node), node.from, false), node.from, node.to);
				break;
			case "Cdata":
				appendText(readCdata(context, node), node.from, node.to);
				break;
			case "Element":
				flush();
				nodes.push(readElement(context, node));
				break;
			case "Comment":
				flush();
				nodes.push(readComment(context, node, parent));
				break;
			case "ProcessingInst":
				flush();
				readProcessingInstruction(context, node);
				break;
			case "MismatchedCloseTag": {
				const nameNode = node.getChild("TagName");
				report(context, `</${nameNode ? sliceOf(context, nameNode) : ""}> does not match an open element`, node.from, node.to);
				break;
			}
			case "StartCloseTag":
				report(context, "Incomplete closing tag", node.from, node.to);
				break;
			case "DoctypeDecl":
				report(context, "DOCTYPE declarations are not supported", node.from, node.to);
				break;
		}
	}
	flush();
	return nodes;
};

const uniqueErrors = (errors: readonly FetchXmlParseError[]): FetchXmlParseError[] =>
	errors.filter(
		(error, index) =>
			errors.findIndex((other) => other.message === error.message && other.range.from === error.range.from && other.range.to === error.range.to) === index
	);

export const parseXml = (text: string, options: XmlParseOptions = {}): FetchXmlParseResult => {
	const fragment = parseFragment(text, 0, true, options.acceptSwitchedOff ?? acceptAny);
	const errors = [...fragment.errors];
	const leading: XmlComment[] = [];
	const trailing: XmlComment[] = [];
	let root: XmlElement | undefined;
	for (const node of fragment.nodes) {
		if (node.kind === "text") {
			if (node.value.trim() !== "" && node.range) {
				errors.push({ message: "Text is not allowed outside the root element", range: node.range });
			}
		} else if (node.kind === "comment") {
			(root ? trailing : leading).push(node);
		} else if (root) {
			errors.push({ message: "Only one root element is allowed", range: node.range ?? { from: 0, to: text.length } });
		} else {
			root = node;
		}
	}
	if (!root && errors.length === 0) {
		errors.push({ message: "There is no root element", range: { from: 0, to: text.length } });
	}
	if (!root || errors.length > 0) {
		return { ok: false, errors: uniqueErrors(errors) };
	}
	return { ok: true, document: { root, leading, trailing } };
};

export const parseFetchXml = (text: string): FetchXmlParseResult =>
	parseXml(text, { acceptSwitchedOff: (parent, element) => isValidChild(parent, element.name) });
