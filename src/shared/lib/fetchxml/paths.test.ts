import { describe, expect, it } from "vitest";

import { createElement, setAttribute } from "./edit";
import { parseFetchXml } from "./parse";
import { nodeAtPath, pathAtOffset, pathOfNode, rangeOfNode } from "./paths";
import { type FetchXmlDocument } from "./types";

const SOURCE = [
	"<!-- top -->",
	"<fetch>",
	'  <entity name="account">',
	'    <attribute name="name" />',
	"    <!-- note -->",
	"    <filter>",
	'      <!-- <condition attribute="a" operator="null" /> -->',
	'      <condition attribute="b" operator="in"><value>1</value></condition>',
	"    </filter>",
	"  </entity>",
	"</fetch>",
].join("\n");

const parsed = (text: string): FetchXmlDocument => {
	const result = parseFetchXml(text);
	if (!result.ok) {
		throw new Error(result.errors.map((error) => error.message).join("; "));
	}
	return result.document;
};

const offsetOf = (fragment: string): number => SOURCE.indexOf(fragment);

describe("nodeAtPath", () => {
	it("finds the root, nested nodes and nothing past the end", () => {
		const document = parsed(SOURCE);
		expect(nodeAtPath(document, [])).toBe(document.root);
		expect(nodeAtPath(document, [0, 1])).toEqual(expect.objectContaining({ kind: "comment", content: " note " }));
		expect(nodeAtPath(document, [0, 2, 1, 0, 0])).toEqual(expect.objectContaining({ kind: "text", value: "1" }));
		expect(nodeAtPath(document, [0, 9])).toBeUndefined();
		expect(nodeAtPath(document, [0, 1, 0])).toBeUndefined();
	});
});

describe("pathOfNode", () => {
	it("returns the index path of a node in the tree and nothing for a node outside it", () => {
		const document = parsed(SOURCE);
		const condition = nodeAtPath(document, [0, 2, 1]);
		expect(condition && pathOfNode(document, condition)).toEqual([0, 2, 1]);
		expect(pathOfNode(document, document.root)).toEqual([]);
		expect(pathOfNode(document, createElement("condition"))).toBeUndefined();
	});
});

describe("rangeOfNode", () => {
	it("returns the source range of a parsed node", () => {
		const document = parsed(SOURCE);
		const range = rangeOfNode(document, [0, 0]);
		expect(range && SOURCE.slice(range.from, range.to)).toBe('<attribute name="name" />');
		const off = rangeOfNode(document, [0, 2, 0]);
		expect(off && SOURCE.slice(off.from, off.to)).toBe('<!-- <condition attribute="a" operator="null" /> -->');
	});

	it("returns nothing for a node created by an edit", () => {
		const result = setAttribute(parsed(SOURCE), [0, 0], "alias", "n");
		expect(result.ok && rangeOfNode(result.document, [0, 0])).toBeUndefined();
	});
});

describe("pathAtOffset", () => {
	it("returns the deepest element or comment at an offset", () => {
		const document = parsed(SOURCE);
		expect(pathAtOffset(document, offsetOf('name="name"'))).toEqual([0, 0]);
		expect(pathAtOffset(document, offsetOf("note"))).toEqual([0, 1]);
		expect(pathAtOffset(document, offsetOf('attribute="a"'))).toEqual([0, 2, 0]);
		expect(pathAtOffset(document, offsetOf("<value>1") + 7)).toEqual([0, 2, 1, 0]);
		expect(pathAtOffset(document, offsetOf("    </filter>"))).toEqual([0, 2]);
		expect(pathAtOffset(document, offsetOf("<entity"))).toEqual([0]);
	});

	it("prefers the node starting at an offset and accepts the end of a node", () => {
		const document = parsed("<a><b /><c /></a>");
		expect(pathAtOffset(document, 8)).toEqual([1]);
		expect(pathAtOffset(document, 13)).toEqual([1]);
		expect(pathAtOffset(document, 17)).toEqual([]);
	});

	it("returns nothing outside the root element", () => {
		const document = parsed(SOURCE);
		expect(pathAtOffset(document, 2)).toBeUndefined();
	});
});
