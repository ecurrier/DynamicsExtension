import { type FetchXmlDocument, type XmlAttribute, type XmlElement, type XmlNode } from "./types";

export type SerializeOptions = { readonly minify?: boolean };

const INDENT = "  ";

const ATTRIBUTE_ESCAPES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"\t": "&#9;",
	"\n": "&#10;",
	"\r": "&#13;",
};

const TEXT_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\r": "&#13;" };

const protectComment = (value: string, insideComment: boolean): string => (insideComment ? value.replace(/--/g, "-&#45;") : value);

const escapeAttribute = (value: string, insideComment: boolean): string =>
	protectComment(
		value.replace(/[&<>"\t\n\r]/g, (char) => ATTRIBUTE_ESCAPES[char] ?? char),
		insideComment
	);

const escapeText = (value: string, insideComment: boolean): string =>
	protectComment(
		value.replace(/[&<>\r]/g, (char) => TEXT_ESCAPES[char] ?? char),
		insideComment
	);

const openTag = (element: XmlElement, insideComment: boolean): string =>
	`<${element.name}${element.attributes.map((attribute: XmlAttribute) => ` ${attribute.name}="${escapeAttribute(attribute.value, insideComment)}"`).join("")}`;

type Content = { readonly kind: "empty" } | { readonly kind: "text"; readonly value: string } | { readonly kind: "nodes"; readonly nodes: readonly XmlNode[] };

const contentOf = (element: XmlElement): Content => {
	const present = element.children.filter((child) => child.kind !== "text" || child.value !== "");
	if (present.length === 0) {
		return { kind: "empty" };
	}
	if (present.every((child) => child.kind === "text")) {
		return { kind: "text", value: present.map((child) => (child.kind === "text" ? child.value : "")).join("") };
	}
	return {
		kind: "nodes",
		nodes: present.flatMap((child): XmlNode[] => {
			if (child.kind !== "text") {
				return [child];
			}
			const value = child.value.trim();
			return value ? [{ ...child, value }] : [];
		}),
	};
};

const linesOf = (node: XmlNode, depth: number, insideComment: boolean): string[] => {
	const indent = INDENT.repeat(depth);
	if (node.kind === "text") {
		return [`${indent}${escapeText(node.value, insideComment)}`];
	}
	if (node.kind === "comment") {
		return [`${indent}<!--${node.content}-->`];
	}
	if (node.switchedOff && !insideComment) {
		const lines = linesOf(node, depth, true);
		const last = lines.length - 1;
		return lines.map((line, index) => {
			const opened = index === 0 ? `${indent}<!-- ${line.slice(indent.length)}` : line;
			return index === last ? `${opened} -->` : opened;
		});
	}
	const content = contentOf(node);
	const open = openTag(node, insideComment);
	if (content.kind === "empty") {
		return [`${indent}${open} />`];
	}
	if (content.kind === "text") {
		return [`${indent}${open}>${escapeText(content.value, insideComment)}</${node.name}>`];
	}
	return [`${indent}${open}>`, ...content.nodes.flatMap((child) => linesOf(child, depth + 1, insideComment)), `${indent}</${node.name}>`];
};

const minified = (node: XmlNode, insideComment: boolean): string => {
	if (node.kind === "text") {
		return escapeText(node.value, insideComment);
	}
	if (node.kind === "comment") {
		return `<!--${node.content}-->`;
	}
	if (node.switchedOff && !insideComment) {
		return `<!--${minified(node, true)}-->`;
	}
	const content = contentOf(node);
	const open = openTag(node, insideComment);
	if (content.kind === "empty") {
		return `${open}/>`;
	}
	const inner = content.kind === "text" ? escapeText(content.value, insideComment) : content.nodes.map((child) => minified(child, insideComment)).join("");
	return `${open}>${inner}</${node.name}>`;
};

export const serializeFetchXml = (document: FetchXmlDocument, options: SerializeOptions = {}): string => {
	const nodes: readonly XmlNode[] = [...document.leading, document.root, ...document.trailing];
	if (options.minify) {
		return nodes.map((node) => minified(node, false)).join("");
	}
	return nodes.flatMap((node) => linesOf(node, 0, false)).join("\n");
};

export const toJavaScriptString = (xml: string): string => `\`${xml.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${")}\``;

export const toCSharpString = (xml: string): string => `@"${xml.replace(/"/g, '""')}"`;
