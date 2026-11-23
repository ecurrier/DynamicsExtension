import { describe, expect, it } from "vitest";

import { type FetchXmlDocument, parseFetchXml } from "@/shared/lib/fetchxml";

import { COPY_MENU_FORMS, copyBlockedReason, copyQuery } from "./copyForms";

const TWO_EXCLUDED = [
	"<fetch>",
	'    <entity name="account">',
	'        <attribute name="name"/>',
	"        <!-- Accounts worth a call -->",
	'        <!-- <attribute name="revenue" /> -->',
	'        <filter type="and">',
	'            <condition attribute="statecode" operator="eq" value="0" />',
	'            <!-- <condition attribute="name" operator="like" value="%Contoso%" /> -->',
	"        </filter>",
	"    </entity>",
	"</fetch>",
].join("\n");

const NONE_EXCLUDED = '<fetch><entity name="account"><attribute name="name" /></entity></fetch>';

const documentOf = (text: string): FetchXmlDocument => {
	const result = parseFetchXml(text);
	if (!result.ok) {
		throw new Error("The fixture does not parse");
	}
	return result.document;
};

const source = (text: string) => ({ text, document: documentOf(text) });

const copied = (outcome: ReturnType<typeof copyQuery>) => {
	if (!outcome.ok) {
		throw new Error(outcome.reason);
	}
	return outcome;
};

describe("copyQuery", () => {
	it("copies the Query as it runs: standard formatting, Excluded rows left out, comments kept", () => {
		const outcome = copied(copyQuery("query", source(TWO_EXCLUDED)));
		expect(outcome.text).toBe(
			[
				"<fetch>",
				'  <entity name="account">',
				'    <attribute name="name" />',
				"    <!-- Accounts worth a call -->",
				'    <filter type="and">',
				'      <condition attribute="statecode" operator="eq" value="0" />',
				"    </filter>",
				"  </entity>",
				"</fetch>",
			].join("\n")
		);
		expect(outcome.message).toBe("Copied. 2 Excluded rows left out.");
	});

	it("says only Copied when no row is Excluded", () => {
		expect(copied(copyQuery("query", source(NONE_EXCLUDED))).message).toBe("Copied.");
	});

	it("uses the singular for one Excluded row", () => {
		const text = '<fetch><entity name="account"><attribute name="name" /><!-- <attribute name="revenue" /> --></entity></fetch>';
		expect(copied(copyQuery("minified", source(text))).message).toBe("Copied the minified Query. 1 Excluded row left out.");
	});

	it("copies the minified form without Excluded rows and with comments", () => {
		const outcome = copied(copyQuery("minified", source(TWO_EXCLUDED)));
		expect(outcome.text).toBe(
			'<fetch><entity name="account"><attribute name="name"/><!-- Accounts worth a call --><filter type="and"><condition attribute="statecode" operator="eq" value="0"/></filter></entity></fetch>'
		);
		expect(outcome.message).toBe("Copied the minified Query. 2 Excluded rows left out.");
	});

	it("copies a JavaScript string without Excluded rows", () => {
		const outcome = copied(copyQuery("javascript", source(TWO_EXCLUDED)));
		expect(outcome.text.startsWith("`<fetch>\n")).toBe(true);
		expect(outcome.text.endsWith("</fetch>`")).toBe(true);
		expect(outcome.text).not.toContain("revenue");
		expect(outcome.text).toContain("Accounts worth a call");
		expect(outcome.message).toBe("Copied the Query as a JavaScript string. 2 Excluded rows left out.");
	});

	it("copies a C# string without Excluded rows and with the quotes doubled", () => {
		const outcome = copied(copyQuery("csharp", source(TWO_EXCLUDED)));
		expect(outcome.text.startsWith('@"<fetch>\n')).toBe(true);
		expect(outcome.text).toContain('<attribute name=""name"" />');
		expect(outcome.text).not.toContain("Contoso");
		expect(outcome.message).toBe("Copied the Query as a C# string. 2 Excluded rows left out.");
	});

	it("copies the text exactly as written for Copy with Excluded rows", () => {
		const outcome = copied(copyQuery("asWritten", source(TWO_EXCLUDED)));
		expect(outcome.text).toBe(TWO_EXCLUDED);
		expect(outcome.message).toBe("Copied the text as written. It has 2 Excluded rows.");
	});

	it("copies the text as written and says so when the Fetch XML does not parse", () => {
		const broken = '<fetch><entity name="account">';
		const outcome = copied(copyQuery("query", { text: broken, document: null }));
		expect(outcome.text).toBe(broken);
		expect(outcome.message).toBe("Copied the text as written. The Fetch XML does not parse.");
		expect(copied(copyQuery("asWritten", { text: broken, document: null })).message).toBe("Copied the text as written.");
	});

	it("refuses the other forms while the Fetch XML does not parse", () => {
		for (const form of ["minified", "javascript", "csharp"] as const) {
			expect(copyQuery(form, { text: "<fetch>", document: null })).toEqual({ ok: false, reason: "The Fetch XML does not parse." });
		}
	});

	it("refuses every form when there is no text", () => {
		expect(copyQuery("query", { text: "  ", document: null })).toEqual({ ok: false, reason: "There is no Query to copy." });
	});
});

describe("copyBlockedReason", () => {
	it("allows every menu form when the Fetch XML parses", () => {
		expect(COPY_MENU_FORMS.map((form) => copyBlockedReason(form, { hasText: true, parses: true }))).toEqual([null, null, null, null]);
	});

	it("gives a reason for each form that needs a parsed Query", () => {
		expect(COPY_MENU_FORMS.map((form) => copyBlockedReason(form, { hasText: true, parses: false }))).toEqual([
			"The Fetch XML does not parse.",
			"The Fetch XML does not parse.",
			"The Fetch XML does not parse.",
			null,
		]);
		expect(copyBlockedReason("query", { hasText: true, parses: false })).toBeNull();
	});
});
