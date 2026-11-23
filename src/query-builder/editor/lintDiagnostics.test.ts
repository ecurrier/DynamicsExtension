import { describe, expect, it } from "vitest";

import { type Diagnostic } from "@/shared/lib/fetchxml";

import { lintDiagnostics } from "./lintDiagnostics";

const missing: Diagnostic = {
	severity: "error",
	rule: "missing-column",
	message: 'The Table "account" has no Column "nmae".',
	path: [0, 0],
	attribute: "name",
	range: { from: 40, to: 46 },
};

const unknown: Diagnostic = { severity: "info", rule: "unknown-element", message: "not recognised", path: [0, 1], range: { from: 50, to: 60 } };

describe("lintDiagnostics", () => {
	it("maps validation diagnostics with a range, keeping severity and message", () => {
		expect(lintDiagnostics({ errors: [], diagnostics: [missing, unknown], length: 100 })).toEqual([
			{ from: 40, to: 46, severity: "error", message: missing.message },
			{ from: 50, to: 60, severity: "info", message: "not recognised" },
		]);
	});

	it("skips diagnostics without a range", () => {
		const { range: _range, ...rangeless } = missing;
		expect(lintDiagnostics({ errors: [], diagnostics: [rangeless], length: 100 })).toEqual([]);
	});

	it("shows only the parse errors while the XML does not parse", () => {
		expect(lintDiagnostics({ errors: [{ message: "Unclosed tag", range: { from: 7, to: 12 } }], diagnostics: [missing], length: 100 })).toEqual([
			{ from: 7, to: 12, severity: "error", message: "Unclosed tag" },
		]);
	});

	it("keeps ranges inside the document", () => {
		expect(lintDiagnostics({ errors: [{ message: "Unexpected end", range: { from: 30, to: 45 } }], diagnostics: [], length: 20 })).toEqual([
			{ from: 20, to: 20, severity: "error", message: "Unexpected end" },
		]);
	});
});
