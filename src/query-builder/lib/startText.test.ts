import { describe, expect, it } from "vitest";

import { blankQueryText, editorText } from "./startText";

describe("blankQueryText", () => {
	it("starts a Query on the Table with its primary name Column", () => {
		expect(blankQueryText({ logicalName: "account", primaryNameAttribute: "name", primaryIdAttribute: "accountid" })).toBe(
			'<fetch>\n  <entity name="account">\n    <attribute name="name" />\n  </entity>\n</fetch>'
		);
	});

	it("uses the primary key when the Table has no primary name", () => {
		expect(blankQueryText({ logicalName: "activitymimeattachment", primaryNameAttribute: null, primaryIdAttribute: "activitymimeattachmentid" })).toContain(
			'<attribute name="activitymimeattachmentid" />'
		);
	});
});

describe("editorText", () => {
	it("formats Fetch XML that parses", () => {
		expect(editorText("<fetch version='1.0'><entity name='contact'><attribute name='fullname' /></entity></fetch>")).toBe(
			'<fetch version="1.0">\n  <entity name="contact">\n    <attribute name="fullname" />\n  </entity>\n</fetch>'
		);
	});

	it("keeps text that does not parse as written", () => {
		expect(editorText("  <fetch><entity  ")).toBe("<fetch><entity");
	});
});
