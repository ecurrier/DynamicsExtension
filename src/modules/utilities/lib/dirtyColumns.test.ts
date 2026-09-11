import { describe, expect, it } from "vitest";

import { type DirtyColumn, type DirtyColumnsResult, type FormControlInfo } from "@/shared/types";

import { dirtyColumnFindings, dirtyColumnsSummary, dirtyColumnsToText } from "./dirtyColumns";

const control = (overrides: Partial<FormControlInfo> = {}): FormControlInfo => ({
	name: "name",
	label: "Name",
	controlType: "standard",
	tab: "General",
	section: "Summary",
	visible: true,
	disabled: false,
	...overrides,
});

const column = (overrides: Partial<DirtyColumn>): DirtyColumn => ({
	logicalName: "name",
	displayName: "Name",
	attributeType: "string",
	requiredLevel: "none",
	submitMode: "dirty",
	value: "Contoso",
	onForm: true,
	controls: [control()],
	...overrides,
});

const result = (columns: DirtyColumn[], overrides: Partial<DirtyColumnsResult> = {}): DirtyColumnsResult => ({
	entityLogicalName: "account",
	recordId: "1",
	isNew: false,
	total: 10,
	columns,
	...overrides,
});

describe("dirtyColumnFindings", () => {
	it("lists columns the save will skip first, then the rest by display name", () => {
		const findings = dirtyColumnFindings(
			result([
				column({ logicalName: "b", displayName: "Beta" }),
				column({ logicalName: "a", displayName: "Alpha" }),
				column({ logicalName: "z", displayName: "Zulu", submitMode: "never" }),
			])
		);
		expect(findings.map((finding) => finding.logicalName)).toEqual(["z", "a", "b"]);
		expect(findings[0]).toMatchObject({ outcome: "skipped", state: "Never saves" });
	});

	it("carries the control state and flags a column with no control on the form", () => {
		const findings = dirtyColumnFindings(
			result([
				column({ logicalName: "hidden", displayName: "Hidden", controls: [control({ visible: false })] }),
				column({ logicalName: "detached", displayName: "Detached", onForm: false, controls: [], submitMode: "always" }),
			])
		);
		expect(findings[0]).toMatchObject({ logicalName: "detached", tags: [], state: "Always saves · Not on form" });
		expect(findings[1]).toMatchObject({ logicalName: "hidden", tags: ["Hidden"], state: "Saves · Hidden" });
	});

	it("marks a value that was cleared", () => {
		expect(dirtyColumnFindings(result([column({ value: null })]))[0]?.value).toBe("(empty)");
	});
});

describe("dirtyColumnsSummary", () => {
	it("says so plainly when nothing changed", () => {
		expect(dirtyColumnsSummary(result([]))).toContain("None of the 10 columns");
	});

	it("explains a new record and any column the save will skip", () => {
		const summary = dirtyColumnsSummary(result([column({}), column({ logicalName: "skip", submitMode: "never" })], { isNew: true }));
		expect(summary).toContain("2 of 10 columns");
		expect(summary).toContain("has not been saved yet");
		expect(summary).toContain("1 of them is excluded");
	});
});

describe("dirtyColumnsToText", () => {
	it("writes one line per column with its value and state", () => {
		expect(dirtyColumnsToText(result([column({ value: "Contoso Ltd" })]))).toBe(
			"1 of 10 columns on this account form have unsaved changes:\n- Name (name) = Contoso Ltd [Saves]"
		);
	});

	it("reports no changes with the column count", () => {
		expect(dirtyColumnsToText(result([]))).toBe("No unsaved changes on this account form (10 columns checked).");
	});
});
