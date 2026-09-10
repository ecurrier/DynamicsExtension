import { describe, expect, it } from "vitest";

import { formatXml, toggleQuotes } from "./formatXml";

describe("formatXml", () => {
	it("indents nested elements", () => {
		const input =
			'<fetch><entity name="account"><attribute name="name" /><filter><condition attribute="x" operator="eq" value="1" /></filter></entity></fetch>';
		expect(formatXml(input)).toBe(
			[
				"<fetch>",
				'  <entity name="account">',
				'    <attribute name="name" />',
				"    <filter>",
				'      <condition attribute="x" operator="eq" value="1" />',
				"    </filter>",
				"  </entity>",
				"</fetch>",
			].join("\n")
		);
	});

	it("keeps inline text elements on one line", () => {
		expect(formatXml("<a><b>text</b></a>")).toBe("<a>\n  <b>text</b>\n</a>");
	});

	it("toggles quote styles", () => {
		expect(toggleQuotes(`<a b='1' c="2" />`, true)).toBe('<a b="1" c="2" />');
		expect(toggleQuotes(`<a b='1' c="2" />`, false)).toBe(`<a b='1' c='2' />`);
	});
});
