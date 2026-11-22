import { describe, expect, it } from "vitest";

import { parseFetchXml, parseXml } from "./parse";
import { type FetchXmlDocument, type FetchXmlParseError, type XmlElement } from "./types";

const parsed = (text: string): FetchXmlDocument => {
	const result = parseFetchXml(text);
	if (!result.ok) {
		throw new Error(result.errors.map((error) => error.message).join("; "));
	}
	return result.document;
};

const errorsOf = (text: string): readonly FetchXmlParseError[] => {
	const result = parseFetchXml(text);
	return result.ok ? [] : result.errors;
};

const element = (node: unknown): XmlElement => {
	const candidate = node as XmlElement | undefined;
	if (candidate?.kind !== "element") {
		throw new Error("Expected an element");
	}
	return candidate;
};

describe("parseFetchXml", () => {
	it("builds an ordered tree with attributes in source order and source ranges", () => {
		const text = '<fetch top="5"><entity name="account"><attribute name="name" /></entity></fetch>';
		const { root } = parsed(text);
		expect(root.name).toBe("fetch");
		expect(root.attributes).toEqual([{ name: "top", value: "5", range: { from: 7, to: 14 } }]);
		expect(root.range).toEqual({ from: 0, to: text.length });
		const entity = element(root.children[0]);
		expect(entity.name).toBe("entity");
		expect(text.slice(entity.range?.from, entity.range?.to)).toBe('<entity name="account"><attribute name="name" /></entity>');
		expect(element(entity.children[0]).name).toBe("attribute");
		expect(root.switchedOff).toBe(false);
	});

	it("keeps attribute order and reads single-quoted values", () => {
		const { root } = parsed(`<fetch version='1.0' mapping="logical" distinct='false' />`);
		expect(root.attributes.map((attribute) => [attribute.name, attribute.value])).toEqual([
			["version", "1.0"],
			["mapping", "logical"],
			["distinct", "false"],
		]);
	});

	it("decodes entity and character references in attribute values and text", () => {
		const { root } = parsed(`<a v="&amp;&lt;&gt;&quot;&apos;&#45;&#x2D;"><value>x &amp; y &#60; <![CDATA[<raw> & ]]></value></a>`);
		expect(root.attributes[0]?.value).toBe("&<>\"'--");
		expect(element(root.children[0]).children).toEqual([{ kind: "text", value: "x & y < <raw> & ", range: expect.anything() }]);
	});

	it("normalises literal whitespace in attribute values but not character references", () => {
		const { root } = parsed('<a v="one\ttwo\r\nthree&#10;four" />');
		expect(root.attributes[0]?.value).toBe("one two three\nfour");
	});

	it("drops whitespace-only text between elements and trims text in mixed content", () => {
		const { root } = parsed("<a>\n  <b />\n  loose text  \n  <c />\n</a>");
		expect(root.children.map((child) => (child.kind === "text" ? child.value : child.kind))).toEqual(["element", "loose text", "element"]);
	});

	it("keeps text that is an element's only content exactly as written", () => {
		const { root } = parsed("<a><value>  padded  </value><value> </value><value /></a>");
		expect(root.children.map((child) => element(child).children.map((text) => (text.kind === "text" ? text.value : "")))).toEqual([
			["  padded  "],
			[" "],
			[],
		]);
	});

	it("keeps comments in place and puts comments outside the root beside it", () => {
		const document = parsed("<!-- before --><fetch><!-- inside --><entity name='a' /></fetch>\n<!-- after -->");
		expect(document.leading.map((comment) => comment.content)).toEqual([" before "]);
		expect(document.trailing.map((comment) => comment.content)).toEqual([" after "]);
		expect(document.root.children[0]).toEqual({ kind: "comment", content: " inside ", range: { from: 22, to: 37 } });
	});

	it("reads a comment holding exactly one element as a switched-off element with its subtree", () => {
		const text = '<entity name="a"><!-- <filter type="or"><condition attribute="x" operator="eq" value="1" /></filter> --></entity>';
		const { root } = parsed(text);
		const filter = element(root.children[0]);
		expect(filter.switchedOff).toBe(true);
		expect(filter.name).toBe("filter");
		expect(filter.attributes[0]?.value).toBe("or");
		expect(text.slice(filter.range?.from, filter.range?.to)).toMatch(/^<!--.*-->$/);
		const condition = element(filter.children[0]);
		expect(condition.switchedOff).toBe(false);
		expect(text.slice(condition.range?.from, condition.range?.to)).toBe('<condition attribute="x" operator="eq" value="1" />');
	});

	it("decodes -&#45; inside a switched-off element", () => {
		const { root } = parsed('<filter><!--<condition value="x-&#45;y" />--></filter>');
		expect(element(root.children[0]).attributes[0]?.value).toBe("x--y");
	});

	it("reads a comment as a switched-off row only when its element is valid under the comment's parent", () => {
		const condition = '<condition attribute="name" operator="eq" value="a" />';
		const underFilter = parsed(`<fetch><entity name="a"><filter><!-- ${condition} --></filter></entity></fetch>`);
		const filter = element(element(underFilter.root.children[0]).children[0]);
		expect(element(filter.children[0]).switchedOff).toBe(true);
		const underFetch = parsed(`<fetch><!-- ${condition} --><entity name="a" /></fetch>`);
		expect(underFetch.root.children[0]).toEqual({ kind: "comment", content: ` ${condition} `, range: { from: 7, to: 7 + condition.length + 9 } });
	});

	it("keeps an invalid or unknown element's comment content exactly as written", () => {
		const text =
			"<fetch><entity name='a'><!--<value>1</value>--><!--  <futurething  a='1'/>\n--><filter><!-- <entity name='b' /> --></filter></entity></fetch>";
		const entity = element(parsed(text).root.children[0]);
		expect(entity.children[0]).toMatchObject({ kind: "comment", content: "<value>1</value>" });
		expect(entity.children[1]).toMatchObject({ kind: "comment", content: "  <futurething  a='1'/>\n" });
		expect(element(entity.children[2]).children[0]).toMatchObject({ kind: "comment", content: " <entity name='b' /> " });
	});

	it("parseXml reads any single well-formed element in a comment as switched off unless told otherwise", () => {
		const text = '<a><!--<b v="x-&#45;y" />--></a>';
		const loose = parseXml(text);
		expect(loose.ok && element(loose.document.root.children[0]).switchedOff).toBe(true);
		const strict = parseXml(text, { acceptSwitchedOff: (parent, candidate) => parent === "a" && candidate.name === "c" });
		expect(strict.ok && strict.document.root.children[0]?.kind).toBe("comment");
	});

	it("keeps any other comment as a comment", () => {
		const { root } = parsed("<a><!-- note --><!-- <b /><c /> --><!-- <b> --><!-- <b /> trailing --><!----></a>");
		expect(root.children.map((child) => child.kind)).toEqual(["comment", "comment", "comment", "comment", "comment"]);
	});

	it("does not treat a comment outside the root as switched off", () => {
		expect(parsed("<!-- <fetch /> --><fetch />").leading).toEqual([{ kind: "comment", content: " <fetch /> ", range: { from: 0, to: 18 } }]);
	});

	it("accepts an XML declaration at the start and drops it", () => {
		expect(parsed('<?xml version="1.0" encoding="utf-8"?>\n<fetch />').root.name).toBe("fetch");
	});

	it("rejects other processing instructions and doctypes", () => {
		expect(errorsOf("<fetch><?pi data?></fetch>")[0]?.message).toBe("Processing instructions are not supported");
		expect(errorsOf("<!DOCTYPE fetch><fetch />")[0]?.message).toBe("DOCTYPE declarations are not supported");
	});

	it("reports an unclosed tag with its range", () => {
		const errors = errorsOf("<fetch><entity name='a'></fetch>");
		expect(errors).toContainEqual({ message: "<entity> is not closed", range: { from: 7, to: 24 } });
	});

	it("reports a tag left open at the end of the input", () => {
		const errors = errorsOf("<fetch>");
		expect(errors.map((error) => error.message)).toContain("<fetch> is not closed");
	});

	it("reports a stray <", () => {
		const errors = errorsOf("<fetch><</fetch>");
		expect(errors.length).toBeGreaterThan(0);
		expect(errors.every((error) => error.range.from >= 0 && error.range.to <= 16)).toBe(true);
	});

	it("reports a mismatched close tag", () => {
		const errors = errorsOf("<fetch><entity></fetsh></entity></fetch>");
		expect(errors).toContainEqual({ message: "</fetsh> does not match an open element", range: { from: 15, to: 23 } });
	});

	it("reports an unquoted attribute value", () => {
		expect(errorsOf("<fetch top=5 />").map((error) => error.message)).toContain("Attribute values must be in quotes");
	});

	it("reports a duplicate attribute", () => {
		expect(errorsOf('<fetch top="1" top="2" />')).toEqual([{ message: 'Attribute "top" appears more than once', range: { from: 15, to: 18 } }]);
	});

	it("reports an unknown entity and an invalid character reference", () => {
		expect(errorsOf('<a v="&nbsp;" />')).toEqual([{ message: "Unknown entity &nbsp;", range: { from: 6, to: 12 } }]);
		expect(errorsOf('<a v="&#0;" />')[0]?.message).toBe("&#0; is not a valid character");
	});

	it("reports text outside the root, a second root and a missing root", () => {
		expect(errorsOf("hello <fetch />")[0]?.message).toBe("Text is not allowed outside the root element");
		expect(errorsOf("<fetch /><fetch />")).toEqual([{ message: "Only one root element is allowed", range: { from: 9, to: 18 } }]);
		expect(errorsOf("   ")).toEqual([{ message: "There is no root element", range: { from: 0, to: 3 } }]);
	});

	it("never throws, whatever it is given", () => {
		const inputs = ["", "<", ">", "</", "<!--", "<![CDATA[", "<a b='", '<a b="&"/>', "&", "<a><b><c></a>", "<<<>>>", "<a>&#xZZ;</a>", "\u0000"];
		for (const input of inputs) {
			expect(() => parseFetchXml(input)).not.toThrow();
			const result = parseFetchXml(input);
			expect(result.ok ? 0 : result.errors.length).toBeGreaterThan(0);
		}
	});
});
