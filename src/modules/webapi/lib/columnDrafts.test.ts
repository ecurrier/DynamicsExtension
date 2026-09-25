import { describe, expect, it } from "vitest";

import { SAMPLE_TABLE } from "@/modules/codegen/lib";
import { type LookupSelection } from "@/shared/types";

import {
	applyDraft,
	buildSavePayload,
	checkDraft,
	describeDraft,
	type Drafts,
	fromDateInput,
	isDraftChanged,
	isRequiredCleared,
	loadedDraft,
	reconcileDrafts,
	removeDraft,
	toDateInput,
} from "./columnDrafts";
import { buildRecordColumns } from "./recordColumns";
import { SAMPLE_VALUES, sampleRow, sampleRows } from "./sampleRecord";

const contact: LookupSelection = {
	id: "contact-1",
	name: "Jane Doe",
	entityLogicalName: "contact",
	entitySetName: "contacts",
	navigationProperty: "parentaccountid",
};

const text = (value: string) => ({ kind: "text" as const, text: value });

describe("loadedDraft", () => {
	it("pre-fills every editor with the current value", () => {
		expect(loadedDraft(sampleRow("name"))).toEqual(text("Contoso"));
		expect(loadedDraft(sampleRow("new_creditlimit"))).toEqual(text("5000"));
		expect(loadedDraft(sampleRow("new_customerscore"))).toEqual(text(""));
		expect(loadedDraft(sampleRow("new_renewaldate"))).toEqual(text("2026-01-31"));
		expect(loadedDraft(sampleRow("new_status"))).toEqual({ kind: "option", value: 100000001 });
		expect(loadedDraft(sampleRow("industrycode"))).toEqual({ kind: "option", value: null });
		expect(loadedDraft(sampleRow("donotemail"))).toEqual({ kind: "option", value: 1 });
		expect(loadedDraft(sampleRow("new_tags"))).toEqual({ kind: "options", values: [1, 2] });
		expect(loadedDraft(sampleRow("parentaccountid"))).toEqual({
			kind: "lookup",
			value: { id: "id-2", name: "Parent Ltd", entityLogicalName: "account", entitySetName: "accounts", navigationProperty: "parentaccountid" },
		});
		expect(loadedDraft(sampleRow("createdon"))).toBeNull();
	});
});

describe("date inputs", () => {
	it("keeps date-only and time-zone independent values as stored", () => {
		expect(toDateInput("dateOnly", "2026-01-31")).toBe("2026-01-31");
		expect(toDateInput("floatingDate", "2026-01-31T00:00:00Z")).toBe("2026-01-31");
		expect(toDateInput("floatingDateTime", "2026-01-31T14:45:10Z")).toBe("2026-01-31T14:45");
		expect(fromDateInput("dateOnly", "2026-01-31")).toBe("2026-01-31");
		expect(fromDateInput("floatingDate", "2026-01-31")).toBe("2026-01-31T00:00:00Z");
		expect(fromDateInput("floatingDateTime", "2026-01-31T14:45")).toBe("2026-01-31T14:45:00Z");
	});

	it("round-trips user-local values through browser local time", () => {
		const iso = "2026-03-10T17:05:00.000Z";
		expect(fromDateInput("localDateTime", toDateInput("localDateTime", iso))).toBe(iso);
		expect(toDateInput("localDate", fromDateInput("localDate", "2026-03-10"))).toBe("2026-03-10");
	});

	it("rejects malformed input", () => {
		expect(fromDateInput("dateOnly", "31/01/2026")).toBeNull();
		expect(fromDateInput("localDateTime", "2026-01-31")).toBeNull();
		expect(toDateInput("localDateTime", null)).toBe("");
	});
});

describe("drafts", () => {
	it("is a Draft only while the value differs from the loaded one", () => {
		const row = sampleRow("name");
		const changed = applyDraft({}, row, text("Contoso Ltd"));
		expect(changed).toEqual({ name: text("Contoso Ltd") });
		expect(applyDraft(changed, row, text("Contoso"))).toEqual({});
	});

	it("compares numbers by value and choices ignoring order", () => {
		expect(isDraftChanged(sampleRow("new_creditlimit"), text("5000.00"))).toBe(false);
		expect(isDraftChanged(sampleRow("new_creditlimit"), text("5001"))).toBe(true);
		expect(isDraftChanged(sampleRow("new_tags"), { kind: "options", values: [2, 1] })).toBe(false);
		expect(isDraftChanged(sampleRow("parentaccountid"), { kind: "lookup", value: { ...contact, id: "ID-2", entityLogicalName: "account" } })).toBe(false);
	});

	it("keeps trailing spaces in text as a change", () => {
		expect(isDraftChanged(sampleRow("name"), text("Contoso "))).toBe(true);
	});

	it("drops Drafts that match reloaded values and keeps the rest", () => {
		const drafts: Drafts = { name: text("Fabrikam"), numberofemployees: text("20"), createdon: text("x"), gone: text("y") };
		const reloaded = buildRecordColumns(SAMPLE_TABLE, { ...SAMPLE_VALUES, name: "Fabrikam" }, null);
		expect(reconcileDrafts(drafts, reloaded)).toEqual({ numberofemployees: text("20") });
	});

	it("removes a single Draft", () => {
		expect(removeDraft({ name: text("A"), numberofemployees: text("1") }, "name")).toEqual({ numberofemployees: text("1") });
	});
});

describe("checkDraft", () => {
	it("treats an empty editor as cleared", () => {
		expect(checkDraft(sampleRow("name"), text(""))).toEqual({ ok: true, payload: { name: null }, cleared: true });
		expect(checkDraft(sampleRow("numberofemployees"), text("  "))).toEqual({ ok: true, payload: { numberofemployees: null }, cleared: true });
		expect(checkDraft(sampleRow("new_tags"), { kind: "options", values: [] })).toMatchObject({ payload: { new_tags: null } });
	});

	it("clears a lookup through its current navigation property", () => {
		expect(checkDraft(sampleRow("parentaccountid"), { kind: "lookup", value: null })).toEqual({
			ok: true,
			payload: { "parentaccountid@odata.bind": null },
			cleared: true,
		});
		expect(checkDraft(sampleRow("ownerid"), { kind: "lookup", value: null })).toMatchObject({ payload: { "ownerid@odata.bind": null } });
	});

	it("binds a chosen record through its navigation property and entity set", () => {
		expect(checkDraft(sampleRow("parentaccountid"), { kind: "lookup", value: contact })).toMatchObject({
			payload: { "parentaccountid@odata.bind": "/contacts(contact-1)" },
		});
		expect(checkDraft(sampleRow("parentaccountid"), { kind: "lookup", value: { ...contact, entitySetName: "" } }).ok).toBe(false);
	});

	it("validates numbers, whole numbers, dates, and length", () => {
		expect(checkDraft(sampleRow("new_creditlimit"), text("abc"))).toEqual({ ok: false, message: "Enter a number" });
		expect(checkDraft(sampleRow("numberofemployees"), text("1.5"))).toEqual({ ok: false, message: "Enter a whole number" });
		expect(checkDraft(sampleRow("numberofemployees"), text("15"))).toMatchObject({ payload: { numberofemployees: 15 } });
		expect(checkDraft(sampleRow("new_renewaldate"), text("2026-13"))).toEqual({ ok: false, message: "Enter a valid date" });
		const limited = { ...sampleRow("name"), column: { ...sampleRow("name").column, maxLength: 3 } };
		expect(checkDraft(limited, text("Contoso"))).toEqual({ ok: false, message: "Enter at most 3 characters" });
	});

	it("serialises choices, booleans, and multi-choice", () => {
		expect(checkDraft(sampleRow("new_status"), { kind: "option", value: 100000002 })).toMatchObject({ payload: { new_status: 100000002 } });
		expect(checkDraft(sampleRow("donotemail"), { kind: "option", value: 0 })).toMatchObject({ payload: { donotemail: false } });
		expect(checkDraft(sampleRow("new_tags"), { kind: "options", values: [2] })).toMatchObject({ payload: { new_tags: "2" } });
	});

	it("warns when a required column is cleared", () => {
		expect(isRequiredCleared(sampleRow("name"), text(""))).toBe(true);
		expect(isRequiredCleared(sampleRow("name"), text("A"))).toBe(false);
		expect(isRequiredCleared(sampleRow("numberofemployees"), text(""))).toBe(false);
	});
});

describe("buildSavePayload", () => {
	it("merges every valid Draft into one body and reports the invalid ones", () => {
		const drafts: Drafts = {
			name: text("Contoso Ltd"),
			parentaccountid: { kind: "lookup", value: null },
			new_status: { kind: "option", value: 100000002 },
			numberofemployees: text("many"),
			createdon: text("2026-01-01"),
		};
		expect(buildSavePayload(sampleRows(), drafts)).toEqual({
			payload: { name: "Contoso Ltd", "parentaccountid@odata.bind": null, new_status: 100000002 },
			count: 3,
			invalid: [{ logicalName: "numberofemployees", message: "Enter a number" }],
		});
	});
});

describe("describeDraft", () => {
	it("shows the new value the way the list does", () => {
		expect(describeDraft(sampleRow("new_status"), { kind: "option", value: 100000002 })).toBe("Done");
		expect(describeDraft(sampleRow("new_tags"), { kind: "options", values: [1, 2] })).toBe("Key Account; Partner");
		expect(describeDraft(sampleRow("parentaccountid"), { kind: "lookup", value: contact })).toBe("Jane Doe");
		expect(describeDraft(sampleRow("name"), text(""))).toBeNull();
	});
});
