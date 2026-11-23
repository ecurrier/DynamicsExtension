import { describe, expect, it } from "vitest";

import { parseFetchXml } from "./parse";
import { serializeFetchXml } from "./serialize";
import { type FetchXmlDocument, type XmlNode } from "./types";

const parsed = (text: string): FetchXmlDocument => {
	const result = parseFetchXml(text);
	if (!result.ok) {
		throw new Error(result.errors.map((error) => `${error.message} at ${error.range.from}`).join("; "));
	}
	return result.document;
};

type Shape = { kind: string; name?: string; excluded?: boolean; attributes?: [string, string][]; children?: Shape[]; content?: string; value?: string };

const shapeOf = (node: XmlNode): Shape => {
	if (node.kind === "text") {
		return { kind: "text", value: node.value };
	}
	if (node.kind === "comment") {
		return { kind: "comment", content: node.content.trim() };
	}
	return {
		kind: "element",
		name: node.name,
		excluded: node.excluded,
		attributes: node.attributes.map((attribute) => [attribute.name, attribute.value]),
		children: node.children.map(shapeOf),
	};
};

const documentShape = (document: FetchXmlDocument): Shape[] => [...document.leading, document.root, ...document.trailing].map(shapeOf);

const count = (shapes: readonly Shape[], kind: string): number =>
	shapes.reduce((total, shape) => total + (shape.kind === kind ? 1 : 0) + count(shape.children ?? [], kind), 0);

const CORPUS: readonly { readonly title: string; readonly xml: string; readonly elements: number; readonly comments: number }[] = [
	{
		title: "simple query",
		xml: `<fetch><entity name="account"><attribute name="name" /><attribute name="accountid" /></entity></fetch>`,
		elements: 4,
		comments: 0,
	},
	{
		title: "nested filters",
		xml: `<fetch version="1.0" mapping="logical"><entity name="contact"><attribute name="fullname" /><filter type="and"><condition attribute="statecode" operator="eq" value="0" /><filter type="or"><condition attribute="lastname" operator="like" value="A%" /><filter type="and"><condition attribute="firstname" operator="not-null" /><condition attribute="createdon" operator="last-x-days" value="30" /></filter></filter></filter></entity></fetch>`,
		elements: 10,
		comments: 0,
	},
	{
		title: "link-entities three deep",
		xml: `<fetch><entity name="account"><attribute name="name" /><link-entity name="contact" from="parentcustomerid" to="accountid" alias="c" link-type="outer"><attribute name="fullname" /><link-entity name="systemuser" from="systemuserid" to="owninguser" alias="u"><attribute name="fullname" /><link-entity name="businessunit" from="businessunitid" to="businessunitid" alias="bu"><attribute name="name" /><filter><condition attribute="name" operator="eq" value="Sales" /></filter></link-entity></link-entity></link-entity></entity></fetch>`,
		elements: 11,
		comments: 0,
	},
	{
		title: "aggregate with grouping",
		xml: `<fetch aggregate="true"><entity name="opportunity"><attribute name="estimatedvalue" alias="total" aggregate="sum" /><attribute name="opportunityid" alias="n" aggregate="countcolumn" distinct="true" /><attribute name="ownerid" alias="owner" groupby="true" /><attribute name="createdon" alias="month" groupby="true" dategrouping="month" /><order alias="total" descending="true" /></entity></fetch>`,
		elements: 7,
		comments: 0,
	},
	{
		title: "valueof comparison",
		xml: `<fetch><entity name="account"><filter><condition attribute="revenue" operator="gt" valueof="creditlimit" /><condition attribute="c.fullname" operator="eq" valueof="name" entityname="c" /></filter></entity></fetch>`,
		elements: 5,
		comments: 0,
	},
	{
		title: "value lists",
		xml: `<fetch><entity name="incident"><filter><condition attribute="prioritycode" operator="in"><value>1</value><value>2</value><value>3</value></condition><condition attribute="title" operator="not-in"><value>Alpha &amp; Omega</value><value>&lt;none&gt;</value></condition></filter></entity></fetch>`,
		elements: 10,
		comments: 0,
	},
	{
		title: "comments between and inside elements",
		xml: `<!-- saved query --><fetch><!-- the main table --><entity name="account"><attribute name="name" /><!-- a note between attributes --><attribute name="telephone1" /><filter><!-- inside a filter --><condition attribute="statecode" operator="eq" value="0" /></filter></entity></fetch><!-- end -->`,
		elements: 6,
		comments: 5,
	},
	{
		title: "Excluded condition and filter",
		xml: `<fetch><entity name="account"><filter type="and"><!-- <condition attribute="name" operator="like" value="a-&#45;b" /> --><condition attribute="statecode" operator="eq" value="0" /><!--<filter type="or"><condition attribute="x" operator="null" /><condition attribute="y" operator="in"><value>1</value></condition></filter>--></filter></entity></fetch>`,
		elements: 9,
		comments: 0,
	},
	{
		title: "unknown element",
		xml: `<fetch><entity name="account"><attribute name="name" /><futurething mode="fast"><child>text</child></futurething></entity></fetch>`,
		elements: 5,
		comments: 0,
	},
	{
		title: "unknown attribute",
		xml: `<fetch latematerialize="true" newoption="42"><entity name="account" brandnew=""><attribute name="name" build="2030" /></entity></fetch>`,
		elements: 3,
		comments: 0,
	},
	{
		title: "single-quoted attributes",
		xml: `<fetch top='10' no-lock='true'><entity name='account'><attribute name='name' /><filter><condition attribute='name' operator='eq' value='O"Brien &apos;s' /></filter></entity></fetch>`,
		elements: 5,
		comments: 0,
	},
	{
		title: "awkward whitespace",
		xml: `\n\n   <fetch\n\tdistinct = "true"   >\r\n\t\t<entity    name="account"\n>\n<attribute name="name"/>   \n\n\n      <order attribute="name"    descending="false"  />\t\t</entity   >\n</fetch    >   \n`,
		elements: 4,
		comments: 0,
	},
	{
		title: "paging and options",
		xml: `<fetch count="50" page="2" paging-cookie="&lt;cookie page=&quot;1&quot;&gt;&lt;accountid last=&quot;{1}&quot; /&gt;&lt;/cookie&gt;" returntotalrecordcount="true" options="OptimizeForUnknown"><entity name="account"><all-attributes /></entity></fetch>`,
		elements: 3,
		comments: 0,
	},
	{
		title: "link-entity inside a filter",
		xml: `<fetch><entity name="account"><filter type="or"><condition attribute="name" operator="eq" value="x" /><link-entity name="contact" from="parentcustomerid" to="accountid" link-type="any"><filter><condition attribute="statecode" operator="eq" value="0" /></filter></link-entity></filter></entity></fetch>`,
		elements: 7,
		comments: 0,
	},
	{
		title: "XML declaration and CDATA",
		xml: `<?xml version="1.0" encoding="utf-8"?><fetch><entity name="account"><filter><condition attribute="description" operator="in"><value><![CDATA[a < b & c]]></value></condition></filter></entity></fetch>`,
		elements: 5,
		comments: 0,
	},
	{
		title: "text with padding and special characters",
		xml: `<fetch><entity name="account"><filter><condition attribute="name" operator="in"><value>  spaced  </value><value>tab\there</value><value> </value></condition></filter></entity></fetch>`,
		elements: 7,
		comments: 0,
	},
	{
		title: "attribute values with newlines, tabs, ampersands and dashes",
		xml: `<fetch><entity name="account"><filter><condition attribute="name" operator="like" value="line&#10;break&#9;tab &amp; -- &lt;&gt;" /></filter></entity></fetch>`,
		elements: 4,
		comments: 0,
	},
	{
		title: "multi-line comment and comment that is not one element",
		xml: `<fetch><entity name="account"><!--\n  two lines\n  of notes\n--><!-- <attribute name="a" /><attribute name="b" /> --><attribute name="name" /></entity></fetch>`,
		elements: 3,
		comments: 2,
	},
	{
		title: "comments holding elements that are not valid where they sit",
		xml: `<fetch><!-- <condition attribute="a" operator="null" /> --><entity name="account"><!--<value>1</value>--><filter><!--  <attribute name="x"/>  --><!-- <condition attribute="b" operator="null" /> --></filter></entity></fetch>`,
		elements: 4,
		comments: 3,
	},
];

describe("round trip", () => {
	it("has at least fifteen queries", () => {
		expect(CORPUS.length).toBeGreaterThanOrEqual(15);
	});

	for (const { title, xml, elements, comments } of CORPUS) {
		describe(title, () => {
			const first = parsed(xml);
			const once = serializeFetchXml(first);
			const second = parsed(once);
			const twice = serializeFetchXml(second);

			it("is stable after one round trip", () => {
				expect(twice).toBe(once);
			});

			it("keeps every element, attribute, attribute order, comment and text", () => {
				expect(documentShape(second)).toEqual(documentShape(first));
				expect(count(documentShape(first), "element")).toBe(elements);
				expect(count(documentShape(first), "comment")).toBe(comments);
			});

			it("is stable through the minified form", () => {
				const minified = serializeFetchXml(first, { minify: true, omitExcluded: false });
				expect(documentShape(parsed(minified))).toEqual(documentShape(first));
				expect(serializeFetchXml(parsed(minified))).toBe(once);
			});
		});
	}

	it("keeps unknown attributes and elements by name and value", () => {
		const output = serializeFetchXml(parsed(CORPUS.find((entry) => entry.title === "unknown attribute")?.xml ?? ""));
		expect(output).toContain('<fetch latematerialize="true" newoption="42">');
		expect(output).toContain('<entity name="account" brandnew="">');
		expect(output).toContain('<attribute name="name" build="2030" />');
	});
});
