import { describe, expect, it } from "vitest";

import { parseFetchXml } from "./parse";
import { insertionIndex, standardChildOrder, tidy } from "./placement";
import { serializeFetchXml } from "./serialize";
import { type FetchXmlDocument, type XmlElement, type XmlNode } from "./types";

const parsed = (text: string): FetchXmlDocument => {
	const result = parseFetchXml(text);
	if (!result.ok) {
		throw new Error(result.errors.map((error) => error.message).join("; "));
	}
	return result.document;
};

const entityOf = (text: string): XmlElement => {
	const entity = parsed(`<fetch>${text}</fetch>`).root.children[0];
	if (entity?.kind !== "element") {
		throw new Error("Expected an entity");
	}
	return entity;
};

const deepFreeze = <T>(value: T): T => {
	if (value && typeof value === "object") {
		Object.values(value).forEach(deepFreeze);
		Object.freeze(value);
	}
	return value;
};

const labels = (nodes: readonly XmlNode[]): string[] =>
	nodes.map((node) => {
		if (node.kind === "comment") {
			return `#${node.content.trim()}`;
		}
		if (node.kind === "text") {
			return `"${node.value}"`;
		}
		const name = node.attributes.find((attribute) => ["name", "attribute", "alias"].includes(attribute.name))?.value;
		return `${node.excluded ? "~" : ""}${node.name}${name ? `:${name}` : ""}`;
	});

describe("standardChildOrder", () => {
	it("orders entity, link-entity and filter children", () => {
		expect(standardChildOrder("entity")).toEqual([["all-attributes", "attribute"], ["order"], ["filter"], ["link-entity"]]);
		expect(standardChildOrder("link-entity")).toEqual(standardChildOrder("entity"));
		expect(standardChildOrder("filter")).toEqual([["condition"], ["filter"], ["link-entity"]]);
		expect(standardChildOrder("condition")).toEqual([]);
	});
});

describe("insertionIndex", () => {
	it("puts a new attribute in an empty entity at 0", () => {
		expect(insertionIndex(entityOf('<entity name="a"/>'), "attribute")).toBe(0);
	});

	it("puts a new attribute after the last attribute and before the first order, filter or link-entity", () => {
		const entity = entityOf('<entity name="a"><attribute name="x"/><attribute name="y"/><order attribute="x"/><filter/><link-entity name="b"/></entity>');
		expect(insertionIndex(entity, "attribute")).toBe(2);
	});

	it("puts a new attribute after the last attribute in an entity whose children are out of order", () => {
		const entity = entityOf('<entity name="a"><link-entity name="b"/><attribute name="x"/><filter/><attribute name="y"/><order attribute="x"/></entity>');
		expect(insertionIndex(entity, "attribute")).toBe(4);
	});

	it("puts the first attribute before the first child of a later kind when there is none", () => {
		const entity = entityOf('<entity name="a"><filter/><order attribute="x"/><link-entity name="b"/></entity>');
		expect(insertionIndex(entity, "attribute")).toBe(0);
		expect(insertionIndex(entityOf('<entity name="a"><all-attributes/><link-entity name="b"/></entity>'), "attribute")).toBe(1);
	});

	it("never splits a comment from the element below it", () => {
		const entity = entityOf(
			'<entity name="a"><!-- first --><attribute name="x"/><!-- about the order --><!-- second line --><order attribute="x"/><!-- trailing --></entity>'
		);
		expect(insertionIndex(entity, "attribute")).toBe(2);
		expect(insertionIndex(entityOf('<entity name="a"><!-- about the filter --><filter/></entity>'), "attribute")).toBe(0);
		expect(insertionIndex(entity, "link-entity")).toBe(entity.children.length);
		expect(insertionIndex(entity, "order")).toBe(5);
	});

	it("counts Excluded children as their element's kind", () => {
		const entity = entityOf('<entity name="a"><attribute name="x"/><!-- <attribute name="y"/> --><order attribute="x"/></entity>');
		expect(insertionIndex(entity, "attribute")).toBe(2);
	});

	it("appends a kind outside the standard order and ignores unknown elements when placing a known kind", () => {
		const entity = entityOf('<entity name="a"><futurething/><attribute name="x"/></entity>');
		expect(insertionIndex(entity, "futurething")).toBe(1);
		expect(insertionIndex(entity, "other")).toBe(2);
		expect(insertionIndex(entity, "order")).toBe(2);
	});

	it("places conditions, filters and link-entities inside a filter", () => {
		const filter = entityOf('<entity name="a"><filter><link-entity name="b"/><filter/><condition attribute="x" operator="null"/></filter></entity>')
			.children[0];
		if (filter?.kind !== "element") {
			throw new Error("Expected a filter");
		}
		expect(insertionIndex(filter, "condition")).toBe(3);
		expect(insertionIndex(filter, "filter")).toBe(2);
		expect(insertionIndex(filter, "link-entity")).toBe(1);
	});
});

describe("tidy", () => {
	const INTERLEAVED = [
		"<fetch>",
		'<entity name="account">',
		'<order attribute="name"/>',
		'<attribute name="name"/>',
		"<!-- about the filter -->",
		'<filter type="or"><link-entity name="contact" from="parentcustomerid" to="accountid" link-type="any"/><filter/><condition attribute="a" operator="null"/></filter>',
		'<order attribute="createdon" descending="true"/>',
		"<futurething/>",
		'<link-entity name="contact" from="contactid" to="primarycontactid" alias="c"><filter/><attribute name="fullname"/></link-entity>',
		"<!-- about telephone --><!-- second line -->",
		'<attribute name="telephone1"/>',
		'<!-- <attribute name="fax"/> -->',
		"<all-attributes/>",
		"<!-- trailing -->",
		"</entity>",
		"</fetch>",
	].join("");

	it("groups an interleaved query into the standard order, stably, keeping comments above their elements", () => {
		const document = deepFreeze(parsed(INTERLEAVED));
		const tidied = tidy(document);
		const entity = tidied.root.children[0] as XmlElement;
		expect(labels(entity.children)).toEqual([
			"attribute:name",
			"#about telephone",
			"#second line",
			"attribute:telephone1",
			"~attribute:fax",
			"all-attributes",
			"order:name",
			"order:createdon",
			"#about the filter",
			"filter",
			"link-entity:contact",
			"futurething",
			"#trailing",
		]);
		const filter = entity.children[9] as XmlElement;
		expect(labels(filter.children)).toEqual(["condition:a", "filter", "link-entity:contact"]);
		const link = entity.children[10] as XmlElement;
		expect(labels(link.children)).toEqual(["attribute:fullname", "filter"]);
	});

	it("does not mutate its input and keeps unchanged subtrees by reference", () => {
		const document = deepFreeze(
			parsed('<fetch><entity name="a"><filter><condition attribute="x" operator="null"/></filter><attribute name="x"/></entity></fetch>')
		);
		const tidied = tidy(document);
		const before = document.root.children[0] as XmlElement;
		const after = tidied.root.children[0] as XmlElement;
		expect(labels(before.children)).toEqual(["filter", "attribute:x"]);
		expect(after.children[1]).toBe(before.children[0]);
		expect(after.range).toBeUndefined();
		expect(tidied.root.range).toEqual(document.root.range);
	});

	it("returns the same reference for a query already in order", () => {
		const document = parsed(
			'<fetch><entity name="a"><attribute name="x"/><!-- note --><attribute name="y"/><order attribute="x"/><filter><condition attribute="x" operator="null"/><filter/></filter><link-entity name="b"><attribute name="z"/></link-entity><futurething/><!-- end --></entity></fetch>'
		);
		expect(tidy(document)).toBe(document);
	});

	it("survives a serialise and parse with the same order", () => {
		const tidied = tidy(parsed(INTERLEAVED));
		const again = parsed(serializeFetchXml(tidied));
		expect(serializeFetchXml(tidy(again))).toBe(serializeFetchXml(tidied));
		expect(tidy(again)).toBe(again);
	});
});
