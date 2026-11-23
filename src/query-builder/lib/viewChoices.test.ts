import { describe, expect, it } from "vitest";

import { type QueryView } from "@/shared/types";

import { groupViews, hasPlaceholders, needsPlaceholderNote, viewTypeLabel } from "./viewChoices";

const view = (name: string, kind: QueryView["kind"], queryType = 0, fetchXml = "<fetch />"): QueryView => ({
	id: name,
	name,
	kind,
	queryType,
	fetchXml,
	isDefault: false,
});

const VIEWS = [view("Active Accounts", "system"), view("Quick Find Active Accounts", "system", 4), view("My big accounts", "personal")];

describe("groupViews", () => {
	it("puts System Views and Personal Views in their own groups, in order", () => {
		const groups = groupViews(VIEWS, "");
		expect(groups.system.map((each) => each.name)).toEqual(["Active Accounts", "Quick Find Active Accounts"]);
		expect(groups.personal.map((each) => each.name)).toEqual(["My big accounts"]);
	});

	it("filters both groups by name, ignoring case", () => {
		const groups = groupViews(VIEWS, "  BIG ");
		expect(groups.system).toEqual([]);
		expect(groups.personal.map((each) => each.name)).toEqual(["My big accounts"]);
	});

	it("matches the view type label", () => {
		expect(groupViews([view("Search", "system", 4), view("Other", "system")], "quick").system.map((each) => each.name)).toEqual(["Search"]);
	});
});

describe("view labels", () => {
	it("labels the view types other than Public", () => {
		expect(viewTypeLabel(0)).toBeNull();
		expect(viewTypeLabel(4)).toBe("Quick Find");
		expect(viewTypeLabel(64)).toBe("Lookup");
	});

	it("finds placeholders", () => {
		expect(hasPlaceholders('<condition value="{0}" />')).toBe(true);
		expect(hasPlaceholders('<condition value="0" />')).toBe(false);
		expect(needsPlaceholderNote(view("Quick", "system", 4))).toBe(true);
		expect(needsPlaceholderNote(view("Plain", "system", 0))).toBe(false);
	});
});
