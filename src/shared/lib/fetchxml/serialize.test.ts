import { describe, expect, it } from "vitest";

import { createElement } from "./edit";
import { parseFetchXml } from "./parse";
import { serializeFetchXml, toCSharpString, toJavaScriptString } from "./serialize";
import { type FetchXmlDocument } from "./types";

const parsed = (text: string): FetchXmlDocument => {
	const result = parseFetchXml(text);
	if (!result.ok) {
		throw new Error(result.errors.map((error) => error.message).join("; "));
	}
	return result.document;
};

const SOURCE = `<!-- top --><fetch top='5'><entity name="account"><attribute name="name"></attribute><!-- why --><filter type="or"><condition attribute="name" operator="like" value="a&amp;b%" /><condition attribute="statecode" operator="in"><value>0</value><value>1</value></condition></filter></entity></fetch>`;

describe("serializeFetchXml", () => {
	it("writes standard formatting with two-space indent, double quotes, self-closing empty elements and comments in place", () => {
		expect(serializeFetchXml(parsed(SOURCE))).toBe(
			[
				"<!-- top -->",
				'<fetch top="5">',
				'  <entity name="account">',
				'    <attribute name="name" />',
				"    <!-- why -->",
				'    <filter type="or">',
				'      <condition attribute="name" operator="like" value="a&amp;b%" />',
				'      <condition attribute="statecode" operator="in">',
				"        <value>0</value>",
				"        <value>1</value>",
				"      </condition>",
				"    </filter>",
				"  </entity>",
				"</fetch>",
			].join("\n")
		);
	});

	it("writes a minified form", () => {
		expect(serializeFetchXml(parsed(SOURCE), { minify: true })).toBe(
			`<!-- top --><fetch top="5"><entity name="account"><attribute name="name"/><!-- why --><filter type="or"><condition attribute="name" operator="like" value="a&amp;b%"/><condition attribute="statecode" operator="in"><value>0</value><value>1</value></condition></filter></entity></fetch>`
		);
	});

	it("encodes characters that cannot appear literally in attribute values and text", () => {
		const document: FetchXmlDocument = {
			root: createElement("a", [{ name: "v", value: `&<>"\t\n\r'` }], [createElement("value", [], [{ kind: "text", value: "1 < 2 & 3 > 0\r" }])]),
			leading: [],
			trailing: [],
		};
		expect(serializeFetchXml(document)).toBe(`<a v="&amp;&lt;&gt;&quot;&#9;&#10;&#13;'">\n  <value>1 &lt; 2 &amp; 3 &gt; 0&#13;</value>\n</a>`);
	});

	it("writes a switched-off element as a comment holding it, with -- in values written as -&#45;", () => {
		const document = parsed(
			'<filter><!--<condition attribute="x" operator="like" value="a-&#45;b" />--><condition attribute="y" operator="null" /></filter>'
		);
		expect(serializeFetchXml(document)).toBe(
			[
				"<filter>",
				'  <!-- <condition attribute="x" operator="like" value="a-&#45;b" /> -->',
				'  <condition attribute="y" operator="null" />',
				"</filter>",
			].join("\n")
		);
		expect(serializeFetchXml(document, { minify: true })).toBe(
			'<filter><!--<condition attribute="x" operator="like" value="a-&#45;b"/>--><condition attribute="y" operator="null"/></filter>'
		);
	});

	it("indents a switched-off element's subtree like any other", () => {
		const document = parsed(
			'<entity><!-- <filter type="or"><condition attribute="x" /><condition attribute="y"><value>a--b</value></condition></filter> --></entity>'
		);
		expect(serializeFetchXml(document)).toBe(
			[
				"<entity>",
				'  <!-- <filter type="or">',
				'    <condition attribute="x" />',
				'    <condition attribute="y">',
				"      <value>a-&#45;b</value>",
				"    </condition>",
				"  </filter> -->",
				"</entity>",
			].join("\n")
		);
	});

	it("writes mixed-content text trimmed on its own line", () => {
		expect(serializeFetchXml(parsed("<a>  loose  <b /></a>"))).toBe("<a>\n  loose\n  <b />\n</a>");
	});
});

describe("toJavaScriptString", () => {
	it("escapes backslashes, backticks and interpolation in a template literal", () => {
		expect(toJavaScriptString('<a v="c:\\x`${y}" />\n<b />')).toBe('`<a v="c:\\\\x\\`\\${y}" />\n<b />`');
	});
});

describe("toCSharpString", () => {
	it("doubles quotes in a verbatim string", () => {
		expect(toCSharpString('<a v="1" />\n<b />')).toBe('@"<a v=""1"" />\n<b />"');
	});
});
