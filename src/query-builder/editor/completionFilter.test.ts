import { describe, expect, it } from "vitest";

import { metadataFrom } from "@/shared/lib/fetchxml";
import type { QueryTable } from "@/shared/types";

import { filterCompletionItems, layeredMetadata, reopensCompletion } from "./completionFilter";
import { type CompletionItem } from "./completions";

const item = (label: string, value: string, detail?: string): CompletionItem => ({ label, value, kind: "column", rank: 0, ...(detail ? { detail } : {}) });

const COLUMNS = [
	item("Account Name", "name", "name"),
	item("Primary Contact", "primarycontactid", "primarycontactid"),
	item("Status", "statecode", "statecode"),
	item("Company Name", "companyname", "companyname"),
];

const OPERATORS = [item("eq", "eq", "Equals"), item("ne", "ne", "Does not equal"), item("like", "like", "Is like (contains)")];

const labels = (items: readonly CompletionItem[]): string[] => items.map((each) => each.label);

describe("filterCompletionItems", () => {
	it("keeps every item in order when nothing is typed", () => {
		expect(labels(filterCompletionItems(COLUMNS, ""))).toEqual(labels(COLUMNS));
	});

	it("ranks label prefixes first, then other label matches, then detail and value matches", () => {
		expect(labels(filterCompletionItems(COLUMNS, "na"))).toEqual(["Account Name", "Company Name"]);
		expect(labels(filterCompletionItems(COLUMNS, "c"))).toEqual(["Company Name", "Account Name", "Primary Contact", "Status"]);
	});

	it("finds an item by its detail or value, so a logical name finds a display-led Column", () => {
		expect(labels(filterCompletionItems(COLUMNS, "statec"))).toEqual(["Status"]);
	});

	it("finds an operator by its meaning", () => {
		expect(labels(filterCompletionItems(OPERATORS, "equal"))).toEqual(["eq", "ne"]);
		expect(labels(filterCompletionItems(OPERATORS, "contains"))).toEqual(["like"]);
	});

	it("drops items that match nowhere", () => {
		expect(filterCompletionItems(COLUMNS, "zzz")).toEqual([]);
	});
});

describe("reopensCompletion", () => {
	it("reopens when the cursor lands just inside an empty attribute value", () => {
		expect(reopensCompletion({ insert: 'condition attribute="" operator=""/>', cursorOffset: 21 })).toBe(true);
		expect(reopensCompletion({ insert: 'operator=""', cursorOffset: 10 })).toBe(true);
	});

	it("does not reopen after an element without attributes or a closing tag", () => {
		expect(reopensCompletion({ insert: "filter></filter>", cursorOffset: 7 })).toBe(false);
		expect(reopensCompletion({ insert: '"eq"', cursorOffset: 4 })).toBe(false);
	});
});

describe("layeredMetadata", () => {
	const contact: QueryTable = {
		logicalName: "contact",
		displayName: "Contact",
		entitySetName: "contacts",
		primaryIdAttribute: "contactid",
		primaryNameAttribute: "fullname",
		columns: [],
		manyToOne: [],
		oneToMany: [],
		manyToMany: [],
	};

	it("prefers a cached lookup and falls back for the rest", () => {
		const metadata = layeredMetadata((name) => (name === "contact" ? { state: "loaded", table: contact } : null), metadataFrom([], ["nope"]));
		expect(metadata("contact")).toEqual({ state: "loaded", table: contact });
		expect(metadata("nope")).toEqual({ state: "missing" });
	});
});
