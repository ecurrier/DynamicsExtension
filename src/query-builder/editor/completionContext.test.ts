import { describe, expect, it } from "vitest";

import { type CompletionContext, completionContextAt } from "./completionContext";

const contextOf = (marked: string): CompletionContext => {
	const offset = marked.indexOf("|");
	return completionContextAt(marked.slice(0, offset) + marked.slice(offset + 1), offset);
};

const offsetOf = (marked: string, fragment: string): number => marked.replace("|", "").indexOf(fragment);

const ENTITY = '<fetch><entity name="account">';

describe("element names", () => {
	it("offers the root when the text is empty", () => {
		expect(contextOf("|")).toEqual({ kind: "none" });
		expect(contextOf("<|")).toEqual({ kind: "element-name", from: 1, to: 1, typed: "", parent: null, siblings: [], bare: true });
	});

	it("finds the parent in valid XML", () => {
		const marked = `${ENTITY}<attribute name="name"/><|</entity></fetch>`;
		expect(contextOf(marked)).toMatchObject({ kind: "element-name", parent: "entity", siblings: ["attribute"], typed: "", bare: true });
	});

	it("finds the parent at the very end of broken text", () => {
		expect(contextOf(`${ENTITY}<filter><|`)).toMatchObject({ kind: "element-name", parent: "filter", siblings: [] });
	});

	it("reports what has been typed of the name and the range it covers", () => {
		const marked = `${ENTITY}<attr|</entity></fetch>`;
		expect(contextOf(marked)).toMatchObject({
			kind: "element-name",
			parent: "entity",
			typed: "attr",
			from: offsetOf(marked, "attr"),
			to: offsetOf(marked, "attr") + 4,
		});
	});

	it("treats the position right after a complete tag name as the name", () => {
		const marked = `${ENTITY}<filter|></filter></entity></fetch>`;
		expect(contextOf(marked)).toMatchObject({ kind: "element-name", typed: "filter", parent: "entity", bare: false, siblings: [] });
	});

	it("skips an unclosed element that cannot have children", () => {
		expect(contextOf(`${ENTITY}<attribute name="name"><|`)).toMatchObject({ kind: "element-name", parent: "entity", siblings: ["attribute"] });
	});

	it("does not swallow the element written after a lone <", () => {
		const marked = `${ENTITY}<|\n<all-attributes/><filter></filter></entity></fetch>`;
		expect(contextOf(marked)).toMatchObject({ kind: "element-name", parent: "entity", siblings: ["all-attributes", "filter"] });
	});

	it("finds the parent through nested unclosed elements", () => {
		expect(contextOf(`${ENTITY}<link-entity name="contact"><filter><condition attribute="x" operator="in"><|`)).toMatchObject({
			kind: "element-name",
			parent: "condition",
		});
	});

	it("is not confused by an unterminated attribute value before the cursor", () => {
		expect(contextOf(`${ENTITY}<attribute name="\n<|`)).toMatchObject({ kind: "element-name", parent: "entity" });
	});

	it("ends a tag that was left without > when a new tag starts", () => {
		expect(contextOf(`${ENTITY}<filter type="and"\n<|`)).toMatchObject({ kind: "element-name", parent: "filter" });
		expect(contextOf(`${ENTITY}<attribute name="name"\n<|`)).toMatchObject({ kind: "element-name", parent: "entity" });
	});

	it("copes with text broken both before and after the cursor", () => {
		const marked = `${ENTITY}<attribute name="\n<link-entity name="contact" alias="c"><filter><|\n<condition attribute="x" operator=</entity>`;
		expect(contextOf(marked)).toMatchObject({ kind: "element-name", parent: "filter", siblings: ["condition"] });
	});
});

describe("closing tags", () => {
	it("names the element to close after </ at the end of the text", () => {
		const marked = `${ENTITY}<filter></filter></|`;
		expect(contextOf(marked)).toEqual({
			kind: "closing-tag",
			from: marked.length - 1,
			to: marked.length - 1,
			typed: "",
			element: "entity",
			open: ["entity", "fetch"],
			terminated: false,
		});
	});

	it("lists every open element, innermost first, with a partly typed name", () => {
		expect(contextOf(`${ENTITY}<filter></ent|`)).toMatchObject({
			kind: "closing-tag",
			element: "filter",
			open: ["filter", "entity", "fetch"],
			typed: "ent",
		});
	});

	it("covers an existing closing tag's name in valid XML", () => {
		const marked = `${ENTITY}</|entity></fetch>`;
		expect(contextOf(marked)).toMatchObject({
			kind: "closing-tag",
			element: "entity",
			typed: "",
			terminated: true,
			to: offsetOf(marked, "entity></fetch>") + 6,
		});
	});

	it("offers the innermost unclosed element when the typed name matches an outer one", () => {
		expect(contextOf(`${ENTITY}<filter></fet|`)).toMatchObject({ kind: "closing-tag", open: ["filter", "entity", "fetch"] });
	});
});

describe("attribute names", () => {
	it("offers names between attributes", () => {
		const marked = `${ENTITY}<link-entity name="contact" | to="accountid"></link-entity></entity></fetch>`;
		expect(contextOf(marked)).toMatchObject({ kind: "attribute-name", element: "link-entity", present: ["name", "to"], typed: "", hasValue: false });
	});

	it("covers a partly typed name at the end of the text", () => {
		const marked = `${ENTITY}<link-entity name="contact" al|`;
		expect(contextOf(marked)).toMatchObject({ kind: "attribute-name", element: "link-entity", typed: "al", present: ["name"], from: marked.length - 3 });
	});

	it("works inside a self-closing tag", () => {
		expect(contextOf(`${ENTITY}<attribute name="name" |/></entity></fetch>`)).toMatchObject({
			kind: "attribute-name",
			element: "attribute",
			present: ["name"],
		});
	});

	it("knows when the attribute already has a value", () => {
		expect(contextOf(`${ENTITY}<order attr|="name"/></entity></fetch>`)).toMatchObject({
			kind: "attribute-name",
			element: "order",
			typed: "attr",
			hasValue: true,
		});
	});

	it("offers nothing straight after a closing quote", () => {
		expect(contextOf(`<fetch><entity name="account"|></entity></fetch>`)).toEqual({ kind: "none" });
	});

	it("offers names after an unterminated value is broken off by a new line", () => {
		expect(contextOf(`${ENTITY}<attribute name="\n|`)).toMatchObject({ kind: "attribute-name", element: "attribute", present: ["name"] });
		expect(contextOf(`${ENTITY}<attribute alias="x\n |`)).toMatchObject({ kind: "attribute-name", element: "attribute", present: ["alias"] });
	});
});

describe("attribute values", () => {
	it("covers the whole quoted value and reports what was typed", () => {
		const marked = `<fetch><entity name="acc|ount"></entity></fetch>`;
		expect(contextOf(marked)).toMatchObject({
			kind: "attribute-value",
			element: "entity",
			attribute: "name",
			typed: "acc",
			value: "account",
			quoted: true,
			from: offsetOf(marked, "account"),
			to: offsetOf(marked, "account") + 7,
		});
	});

	it("offers a value right after = before any quote", () => {
		const marked = `${ENTITY}<link-entity link-type=|`;
		expect(contextOf(marked)).toMatchObject({
			kind: "attribute-value",
			element: "link-entity",
			attribute: "link-type",
			quoted: false,
			typed: "",
			from: marked.length - 1,
		});
	});

	it("handles an unterminated value at the end of the text", () => {
		expect(contextOf(`${ENTITY}<filter><condition attribute="na|`)).toMatchObject({
			kind: "attribute-value",
			attribute: "attribute",
			typed: "na",
			value: "na",
			scope: { tableLogicalName: "account" },
		});
	});

	it("does not run an unterminated value into the next line", () => {
		const marked = `${ENTITY}<filter><condition attribute="|\n<condition attribute="name" operator="eq"/></filter></entity></fetch>`;
		const context = contextOf(marked);
		expect(context).toMatchObject({ kind: "attribute-value", attribute: "attribute", typed: "", value: "", scope: { tableLogicalName: "account" } });
		expect(context).toMatchObject({ from: marked.indexOf("|"), to: marked.indexOf("|") });
	});

	it("maps positions back past repaired quotes", () => {
		const marked = `${ENTITY}<attribute name="\n<filter><condition attribute="na|me" operator="eq"/></filter></entity></fetch>`;
		const text = marked.replace("|", "");
		const context = contextOf(marked);
		expect(context).toMatchObject({ kind: "attribute-value", element: "condition", typed: "na", value: "name" });
		if (context.kind === "attribute-value") {
			expect(text.slice(context.from, context.to)).toBe("name");
		}
	});

	it("lists the element's other attributes", () => {
		expect(contextOf(`${ENTITY}<filter><condition attribute="statecode" operator="|" value="0"/>`)).toMatchObject({
			kind: "attribute-value",
			attribute: "operator",
			attributes: [
				{ name: "attribute", value: "statecode" },
				{ name: "value", value: "0" },
			],
		});
	});
});

const JOINED = [
	'<fetch><entity name="account">',
	'<link-entity name="contact" from="parentcustomerid" to="accountid" alias="c">',
	'<link-entity name="systemuser" from="systemuserid" to="owninguser">',
	"<filter>{inner}</filter>",
	"</link-entity>",
	"<filter>{contact}</filter>",
	"</link-entity>",
	"<filter>{outer}</filter>",
	'<attribute name="name" alias="accountname"/>',
	"</entity></fetch>",
].join("");

const joined = (slot: string, content: string): string =>
	["inner", "contact", "outer"].reduce((text, name) => text.replace(`{${name}}`, name === slot ? content : ""), JOINED);

describe("scope", () => {
	it("resolves a condition in the root entity's filter to the root Table", () => {
		expect(contextOf(joined("outer", '<condition attribute="|"/>'))).toMatchObject({ scope: { tableLogicalName: "account" } });
	});

	it("resolves a condition inside a link-entity's filter to that link-entity's Table", () => {
		expect(contextOf(joined("contact", '<condition attribute="|"/>'))).toMatchObject({ scope: { tableLogicalName: "contact" } });
	});

	it("resolves nested link-entities to the nearest one", () => {
		expect(contextOf(joined("inner", '<condition attribute="|"/>'))).toMatchObject({ scope: { tableLogicalName: "systemuser" } });
	});

	it("resolves from to the link-entity's own Table and to to its parent's", () => {
		const marked = `${ENTITY}<link-entity name="contact" from="parentcustomerid" to="accountid"><link-entity name="systemuser" from="|" to="owninguser"/>`;
		expect(contextOf(marked)).toMatchObject({ scope: { tableLogicalName: "systemuser" } });
		expect(contextOf(marked.replace('from="|" to="owninguser"', 'from="systemuserid" to="|"'))).toMatchObject({ scope: { tableLogicalName: "contact" } });
	});

	it("resolves a condition with entityname to the link-entity of that alias, even one defined after it", () => {
		expect(contextOf(joined("outer", '<condition entityname="c" attribute="|"/>'))).toMatchObject({ scope: { tableLogicalName: "contact" } });
		expect(contextOf(joined("outer", '<condition entityname="systemuser" attribute="|"/>'))).toMatchObject({ scope: { tableLogicalName: "systemuser" } });
		expect(contextOf(joined("outer", '<condition entityname="nope" attribute="|"/>'))).toMatchObject({ scope: { tableLogicalName: null } });
	});

	it("resolves an order with entityname", () => {
		expect(contextOf(joined("outer", "").replace("<filter></filter><attribute", '<order entityname="c" attribute="|"/><attribute'))).toMatchObject({
			kind: "attribute-value",
			element: "order",
			scope: { tableLogicalName: "contact" },
		});
	});

	it("collects aliases from anywhere in the text, including after the cursor", () => {
		const context = contextOf(joined("outer", '<condition entityname="|"/>'));
		expect(context).toMatchObject({
			scope: {
				links: [
					{ reference: "c", alias: "c", tableLogicalName: "contact" },
					{ reference: "systemuser", alias: null, tableLogicalName: "systemuser" },
				],
				aliases: [
					{ alias: "c", definedBy: "link-entity", tableLogicalName: "contact", columnLogicalName: null },
					{ alias: "accountname", definedBy: "attribute", tableLogicalName: "account", columnLogicalName: "name" },
				],
			},
		});
	});

	it("leaves Excluded link-entities out of the aliases", () => {
		const marked = `${ENTITY}<!--<link-entity name="contact" alias="gone"/>--><filter><condition entityname="|"/></filter></entity></fetch>`;
		expect(contextOf(marked)).toMatchObject({ scope: { links: [], aliases: [] } });
	});

	it("gives valueof the own Table and the other link-entities", () => {
		expect(contextOf(joined("contact", '<condition attribute="lastname" operator="eq" valueof="|"/>'))).toMatchObject({
			scope: {
				valueOfTargets: [
					{ prefix: null, tableLogicalName: "contact" },
					{ prefix: "systemuser", tableLogicalName: "systemuser" },
				],
				column: { tableLogicalName: "contact", columnLogicalName: "lastname" },
			},
		});
	});

	it("names the condition's Column, honouring entityname", () => {
		expect(contextOf(joined("outer", '<condition entityname="c" attribute="statecode" operator="|"/>'))).toMatchObject({
			scope: { column: { tableLogicalName: "contact", columnLogicalName: "statecode" } },
		});
	});

	it("resolves scope while the text after the cursor is broken", () => {
		expect(contextOf(`${ENTITY}<link-entity name="contact" alias="c"><filter><condition attribute="|`)).toMatchObject({
			scope: { tableLogicalName: "contact" },
		});
	});
});

describe("value bodies", () => {
	it("offers the condition's values inside <value>", () => {
		const marked = `${ENTITY}<filter><condition attribute="statecode" operator="in"><value> 1| </value></condition></filter></entity></fetch>`;
		const context = contextOf(marked);
		expect(context).toMatchObject({ kind: "value-text", typed: "1", scope: { column: { tableLogicalName: "account", columnLogicalName: "statecode" } } });
		if (context.kind === "value-text") {
			expect(marked.replace("|", "").slice(context.from, context.to)).toBe("1");
		}
	});

	it("works at the end of broken text", () => {
		expect(contextOf(`${ENTITY}<filter><condition attribute="statecode" operator="in"><value>|`)).toMatchObject({ kind: "value-text", typed: "" });
	});
});

describe("nothing to complete", () => {
	it.each([
		["inside a comment", `${ENTITY}<!-- <condition attribute="| --></entity></fetch>`],
		["inside an unclosed comment", `${ENTITY}<!-- <condition |`],
		["inside an Excluded row", `${ENTITY}<!--<attribute name="na|me"/>--></entity></fetch>`],
		["in text content", `${ENTITY}some te|xt</entity></fetch>`],
		["between elements", `${ENTITY}<attribute name="name"/>|</entity></fetch>`],
		["after the root", `<fetch></fetch>|`],
		["after a closing quote", `${ENTITY}<attribute name="name"|/></entity></fetch>`],
	])("%s", (_name, marked) => {
		expect(contextOf(marked)).toEqual({ kind: "none" });
	});

	it("clamps offsets outside the text", () => {
		expect(completionContextAt("<", 99)).toMatchObject({ kind: "element-name" });
		expect(completionContextAt("<fetch>", -4)).toEqual({ kind: "none" });
	});
});
