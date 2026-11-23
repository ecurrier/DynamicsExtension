import { describe, expect, it } from "vitest";

import {
	countExcluded,
	createElement,
	deleteExcluded,
	exclude,
	include,
	includeAll,
	insertChild,
	moveNode,
	removeAttribute,
	removeNode,
	setAttribute,
} from "./edit";
import { parseFetchXml } from "./parse";
import { nodeAtPath } from "./paths";
import { serializeFetchXml } from "./serialize";
import { type FetchXmlDocument, type FetchXmlEditResult, type XmlElement } from "./types";

const SOURCE = `<fetch><entity name="account"><attribute name="name" /><!-- note --><filter type="and"><condition attribute="statecode" operator="eq" value="0" /><condition attribute="name" operator="like" value="a%" /></filter></entity></fetch>`;

const deepFreeze = <T>(value: T): T => {
	if (value && typeof value === "object") {
		Object.values(value).forEach(deepFreeze);
		Object.freeze(value);
	}
	return value;
};

const parsed = (text: string): FetchXmlDocument => {
	const result = parseFetchXml(text);
	if (!result.ok) {
		throw new Error(result.errors.map((error) => error.message).join("; "));
	}
	return deepFreeze(result.document);
};

const applied = (result: FetchXmlEditResult): FetchXmlDocument => {
	if (!result.ok) {
		throw new Error(result.reason);
	}
	return result.document;
};

const refusal = (result: FetchXmlEditResult): string => (result.ok ? "" : result.reason);

const elementAt = (document: FetchXmlDocument, path: readonly number[]): XmlElement => {
	const node = nodeAtPath(document, path);
	if (node?.kind !== "element") {
		throw new Error("Expected an element");
	}
	return node;
};

const unchanged = (document: FetchXmlDocument, edit: (input: FetchXmlDocument) => FetchXmlEditResult): FetchXmlEditResult => {
	const before = JSON.stringify(document);
	const result = edit(document);
	expect(JSON.stringify(document)).toBe(before);
	return result;
};

describe("setAttribute", () => {
	it("changes an existing attribute in place and leaves the input untouched", () => {
		const document = parsed(SOURCE);
		const next = applied(unchanged(document, (input) => setAttribute(input, [0, 2, 1], "value", "b%")));
		expect(elementAt(next, [0, 2, 1]).attributes.map((attribute) => [attribute.name, attribute.value])).toEqual([
			["attribute", "name"],
			["operator", "like"],
			["value", "b%"],
		]);
		expect(elementAt(next, [0, 2, 1]).range).toBeUndefined();
		expect(elementAt(next, [0, 2, 0])).toBe(elementAt(document, [0, 2, 0]));
	});

	it("adds a new attribute after the existing ones", () => {
		const next = applied(setAttribute(parsed(SOURCE), [0], "alias", "a"));
		expect(elementAt(next, [0]).attributes.map((attribute) => attribute.name)).toEqual(["name", "alias"]);
	});

	it("refuses a path that is not an element", () => {
		expect(refusal(setAttribute(parsed(SOURCE), [0, 1], "x", "y"))).toBe("There is no element at that path");
		expect(refusal(setAttribute(parsed(SOURCE), [9], "x", "y"))).toBe("There is no element at that path");
	});
});

describe("removeAttribute", () => {
	it("removes the attribute and leaves the input untouched", () => {
		const document = parsed(SOURCE);
		const next = applied(unchanged(document, (input) => removeAttribute(input, [0, 2], "type")));
		expect(elementAt(next, [0, 2]).attributes).toEqual([]);
	});

	it("returns the same document when the attribute is absent", () => {
		const document = parsed(SOURCE);
		expect(applied(removeAttribute(document, [0, 2], "missing"))).toBe(document);
	});
});

describe("insertChild", () => {
	it("inserts a child at an index and leaves the input untouched", () => {
		const document = parsed(SOURCE);
		const order = createElement("order", [{ name: "attribute", value: "name" }]);
		const next = applied(unchanged(document, (input) => insertChild(input, [0], 1, order)));
		expect(elementAt(next, [0]).children.map((child) => (child.kind === "element" ? child.name : child.kind))).toEqual([
			"attribute",
			"order",
			"comment",
			"filter",
		]);
		expect(serializeFetchXml(next)).toContain('    <attribute name="name" />\n    <order attribute="name" />\n    <!-- note -->');
	});

	it("appends at the end", () => {
		const next = applied(insertChild(parsed(SOURCE), [0, 2], 2, createElement("condition")));
		expect(elementAt(next, [0, 2, 2]).name).toBe("condition");
	});

	it("refuses an index out of range or a parent that is not an element", () => {
		expect(refusal(insertChild(parsed(SOURCE), [0], 5, createElement("x")))).toBe("The index is outside the parent's children");
		expect(refusal(insertChild(parsed(SOURCE), [0, 1], 0, createElement("x")))).toBe("There is no element at that path");
	});

	it("refuses a comment or Excluded node inside an Excluded node", () => {
		const document = applied(exclude(parsed(SOURCE), [0, 2]));
		expect(refusal(insertChild(document, [0, 2], 0, { kind: "comment", content: "x" }))).toBe(
			"A comment or an Excluded row cannot go inside an Excluded row"
		);
		expect(applied(insertChild(document, [0, 2], 0, createElement("condition"))).root).toBeDefined();
	});
});

describe("removeNode", () => {
	it("removes the node and leaves the input untouched", () => {
		const document = parsed(SOURCE);
		const next = applied(unchanged(document, (input) => removeNode(input, [0, 1])));
		expect(elementAt(next, [0]).children.map((child) => child.kind)).toEqual(["element", "element"]);
		expect(serializeFetchXml(next)).not.toContain("note");
	});

	it("refuses the root and a missing node", () => {
		expect(refusal(removeNode(parsed(SOURCE), []))).toBe("You cannot delete the root element");
		expect(refusal(removeNode(parsed(SOURCE), [0, 7]))).toBe("There is no node at that path");
	});
});

describe("moveNode", () => {
	it("moves a node among its siblings and leaves the input untouched", () => {
		const document = parsed(SOURCE);
		const next = applied(unchanged(document, (input) => moveNode(input, [0, 2, 1], 0)));
		expect(elementAt(next, [0, 2]).children.map((child) => (child.kind === "element" ? child.attributes[0]?.value : ""))).toEqual(["name", "statecode"]);
	});

	it("moves a node to the end", () => {
		const next = applied(moveNode(parsed(SOURCE), [0, 0], 2));
		expect(elementAt(next, [0, 2]).name).toBe("attribute");
		expect(elementAt(next, [0, 1]).name).toBe("filter");
	});

	it("refuses the root and an index out of range", () => {
		expect(refusal(moveNode(parsed(SOURCE), [], 0))).toBe("You cannot move the root element");
		expect(refusal(moveNode(parsed(SOURCE), [0, 0], 3))).toBe("The index is outside the parent's children");
	});
});

describe("exclude and include", () => {
	it("excludes and includes a node and leaves the input untouched", () => {
		const document = parsed(SOURCE);
		const excludedDocument = applied(unchanged(document, (input) => exclude(input, [0, 2, 0])));
		expect(elementAt(excludedDocument, [0, 2, 0]).excluded).toBe(true);
		expect(serializeFetchXml(excludedDocument)).toContain('<!-- <condition attribute="statecode" operator="eq" value="0" /> -->');
		const includedDocument = applied(unchanged(excludedDocument, (input) => include(input, [0, 2, 0])));
		expect(serializeFetchXml(includedDocument)).toBe(serializeFetchXml(document));
	});

	it('keeps a value with &, <, " and -- through Exclude and Include', () => {
		const value = `a & b < c "d" -- e --- f-`;
		const withValue = applied(setAttribute(parsed(SOURCE), [0, 2, 1], "value", value));
		const excludedDocument = parsed(serializeFetchXml(applied(exclude(withValue, [0, 2, 1]))));
		expect(elementAt(excludedDocument, [0, 2, 1]).excluded).toBe(true);
		expect(elementAt(excludedDocument, [0, 2, 1]).attributes[2]?.value).toBe(value);
		const includedDocument = parsed(serializeFetchXml(applied(include(excludedDocument, [0, 2, 1]))));
		expect(elementAt(includedDocument, [0, 2, 1]).excluded).toBe(false);
		expect(elementAt(includedDocument, [0, 2, 1]).attributes[2]?.value).toBe(value);
	});

	it("keeps a subtree with value text through Exclude and Include", () => {
		const document = parsed(`<entity><filter><condition attribute="x" operator="in"><value>a--b &amp; &lt;c&gt;</value></condition></filter></entity>`);
		const excludedDocument = parsed(serializeFetchXml(applied(exclude(document, [0]))));
		expect(elementAt(excludedDocument, [0]).excluded).toBe(true);
		const includedDocument = parsed(serializeFetchXml(applied(include(excludedDocument, [0]))));
		expect(serializeFetchXml(includedDocument)).toBe(serializeFetchXml(document));
	});

	it("refuses to exclude a node that has Excluded descendants", () => {
		const document = applied(exclude(parsed(SOURCE), [0, 2, 0]));
		expect(refusal(exclude(document, [0, 2]))).toBe("First, Include or delete the Excluded rows inside this row");
		expect(refusal(exclude(document, [0]))).toBe("First, Include or delete the Excluded rows inside this row");
	});

	it("refuses to exclude a node inside an Excluded node, one holding comments, the root, or a non-element", () => {
		const excludedDocument = applied(exclude(parsed(SOURCE), [0, 2]));
		expect(refusal(exclude(excludedDocument, [0, 2, 0]))).toBe("You cannot Exclude a row inside an Excluded row");
		expect(refusal(exclude(parsed(SOURCE), [0]))).toBe("First, delete the comments inside this row");
		expect(refusal(exclude(parsed(SOURCE), []))).toBe("You cannot Exclude the root element");
		expect(refusal(exclude(parsed(SOURCE), [0, 1]))).toBe("You can Exclude only an element");
		expect(refusal(include(parsed(SOURCE), [0, 1]))).toBe("You can Include only an element");
	});

	it("treats excluding an Excluded node or including an Included node as a no-op", () => {
		const document = parsed(SOURCE);
		expect(applied(include(document, [0, 2]))).toBe(document);
		const excludedDocument = applied(exclude(document, [0, 2]));
		expect(applied(exclude(excludedDocument, [0, 2]))).toBe(excludedDocument);
	});
});

describe("Include all and Delete excluded", () => {
	const EXCLUDED = `<fetch><entity name="account"><!-- <attribute name="x" /> --><attribute name="name" /><!-- note --><filter type="and"><!-- <condition attribute="statecode" operator="eq" value="0" /> --><condition attribute="name" operator="like" value="a%" /></filter></entity></fetch>`;

	it("counts the Excluded rows", () => {
		expect(countExcluded(parsed(EXCLUDED))).toBe(2);
		expect(countExcluded(parsed(SOURCE))).toBe(0);
	});

	it("includes every Excluded row in one edit and leaves the input untouched", () => {
		const document = parsed(EXCLUDED);
		const result = applied(includeAll(document));
		expect(countExcluded(result)).toBe(0);
		expect(elementAt(result, [0, 0]).excluded).toBe(false);
		expect(elementAt(result, [0, 3, 0]).excluded).toBe(false);
		expect(serializeFetchXml(result)).toContain("<!-- note -->");
		expect(countExcluded(document)).toBe(2);
	});

	it("deletes every Excluded row in one edit and keeps ordinary comments", () => {
		const result = applied(deleteExcluded(parsed(EXCLUDED)));
		expect(serializeFetchXml(result, { omitExcluded: false })).toBe(
			[
				"<fetch>",
				'  <entity name="account">',
				'    <attribute name="name" />',
				"    <!-- note -->",
				'    <filter type="and">',
				'      <condition attribute="name" operator="like" value="a%" />',
				"    </filter>",
				"  </entity>",
				"</fetch>",
			].join("\n")
		);
	});

	it("refuses both when the Query has no Excluded rows", () => {
		expect(refusal(includeAll(parsed(SOURCE)))).toBe("The Query has no Excluded rows");
		expect(refusal(deleteExcluded(parsed(SOURCE)))).toBe("The Query has no Excluded rows");
	});
});
