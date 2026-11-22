import { describe, expect, it } from "vitest";

import { createElement, insertChild, moveNode, removeAttribute, removeNode, setAttribute, switchOff, switchOn } from "./edit";
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

	it("refuses a comment or switched-off node inside a switched-off node", () => {
		const document = applied(switchOff(parsed(SOURCE), [0, 2]));
		expect(refusal(insertChild(document, [0, 2], 0, { kind: "comment", content: "x" }))).toBe(
			"A comment or switched-off node cannot go inside a switched-off node"
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
		expect(refusal(removeNode(parsed(SOURCE), []))).toBe("The root element cannot be removed");
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
		expect(refusal(moveNode(parsed(SOURCE), [], 0))).toBe("The root element cannot be moved");
		expect(refusal(moveNode(parsed(SOURCE), [0, 0], 3))).toBe("The index is outside the parent's children");
	});
});

describe("switchOff and switchOn", () => {
	it("switches a node off and on and leaves the input untouched", () => {
		const document = parsed(SOURCE);
		const off = applied(unchanged(document, (input) => switchOff(input, [0, 2, 0])));
		expect(elementAt(off, [0, 2, 0]).switchedOff).toBe(true);
		expect(serializeFetchXml(off)).toContain('<!-- <condition attribute="statecode" operator="eq" value="0" /> -->');
		const on = applied(unchanged(off, (input) => switchOn(input, [0, 2, 0])));
		expect(serializeFetchXml(on)).toBe(serializeFetchXml(document));
	});

	it('keeps a value with &, <, " and -- through switching off and on again', () => {
		const value = `a & b < c "d" -- e --- f-`;
		const withValue = applied(setAttribute(parsed(SOURCE), [0, 2, 1], "value", value));
		const off = parsed(serializeFetchXml(applied(switchOff(withValue, [0, 2, 1]))));
		expect(elementAt(off, [0, 2, 1]).switchedOff).toBe(true);
		expect(elementAt(off, [0, 2, 1]).attributes[2]?.value).toBe(value);
		const on = parsed(serializeFetchXml(applied(switchOn(off, [0, 2, 1]))));
		expect(elementAt(on, [0, 2, 1]).switchedOff).toBe(false);
		expect(elementAt(on, [0, 2, 1]).attributes[2]?.value).toBe(value);
	});

	it("keeps a subtree with value text through switching off and on again", () => {
		const document = parsed(`<entity><filter><condition attribute="x" operator="in"><value>a--b &amp; &lt;c&gt;</value></condition></filter></entity>`);
		const off = parsed(serializeFetchXml(applied(switchOff(document, [0]))));
		expect(elementAt(off, [0]).switchedOff).toBe(true);
		const on = parsed(serializeFetchXml(applied(switchOn(off, [0]))));
		expect(serializeFetchXml(on)).toBe(serializeFetchXml(document));
	});

	it("refuses to switch off a node that has switched-off descendants", () => {
		const document = applied(switchOff(parsed(SOURCE), [0, 2, 0]));
		expect(refusal(switchOff(document, [0, 2]))).toBe("Switch on or remove the switched-off nodes inside it first");
		expect(refusal(switchOff(document, [0]))).toBe("Switch on or remove the switched-off nodes inside it first");
	});

	it("refuses to switch off a node inside a switched-off node, one holding comments, the root, or a non-element", () => {
		const off = applied(switchOff(parsed(SOURCE), [0, 2]));
		expect(refusal(switchOff(off, [0, 2, 0]))).toBe("A node inside a switched-off node cannot be switched off");
		expect(refusal(switchOff(parsed(SOURCE), [0]))).toBe("Remove the comments inside it first");
		expect(refusal(switchOff(parsed(SOURCE), []))).toBe("The root element cannot be switched off");
		expect(refusal(switchOff(parsed(SOURCE), [0, 1]))).toBe("Only an element can be switched off");
		expect(refusal(switchOn(parsed(SOURCE), [0, 1]))).toBe("Only an element can be switched on");
	});

	it("treats switching an already switched node as a no-op", () => {
		const document = parsed(SOURCE);
		expect(applied(switchOn(document, [0, 2]))).toBe(document);
		const off = applied(switchOff(document, [0, 2]));
		expect(applied(switchOff(off, [0, 2]))).toBe(off);
	});
});
