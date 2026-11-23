import { describe, expect, it } from "vitest";

import { type Diagnostic, type DiagnosticSeverity, type NodePath } from "@/shared/lib/fetchxml";
import { parse } from "@/test/queryTree";

import { attributeProblems, beneathText, problemBeneathRow, problemCounts, problemCountText, problemsOfRow, rowProblems, worstSeverity } from "./rowProblems";

const diagnostic = (severity: DiagnosticSeverity, path: NodePath, attribute?: string): Diagnostic => ({
	severity,
	rule: severity === "info" ? "unknown-attribute" : "missing-column",
	message: `${severity} at ${path.join(".")}`,
	path,
	...(attribute ? { attribute } : {}),
});

const DOCUMENT = parse(
	'<fetch><entity name="account"><attribute name="name"/><filter><condition attribute="statecode" operator="in"><value>0</value><value>x</value></condition></filter><link-entity name="contact" from="contactid" to="primarycontactid"><attribute name="fullname"/></link-entity></entity></fetch>'
);

describe("worstSeverity", () => {
	it("lets an error beat a warning and a warning beat a note", () => {
		expect(worstSeverity([])).toBeNull();
		expect(worstSeverity([diagnostic("info", []), diagnostic("warning", [])])).toBe("warning");
		expect(worstSeverity([diagnostic("warning", []), diagnostic("error", []), diagnostic("info", [])])).toBe("error");
	});
});

describe("rowProblems", () => {
	it("gives each row its own problems and nothing to rows without any", () => {
		const problems = rowProblems(DOCUMENT, [diagnostic("error", [0, 0], "name"), diagnostic("info", [0, 0])]);
		expect(problemsOfRow(problems, [0, 0]).map((each) => each.severity)).toEqual(["error", "info"]);
		expect(problemsOfRow(problems, [0, 1])).toEqual([]);
	});

	it("rolls a problem on a value element up to its condition row", () => {
		const problems = rowProblems(DOCUMENT, [diagnostic("error", [0, 1, 0, 1])]);
		expect(problemsOfRow(problems, [0, 1, 0])).toHaveLength(1);
		expect(problemsOfRow(problems, [0, 1, 0, 1])).toEqual([]);
	});

	it("marks every ancestor with the worst problem beneath it, but not the row itself", () => {
		const problems = rowProblems(DOCUMENT, [diagnostic("warning", [0, 1, 0]), diagnostic("error", [0, 2, 0]), diagnostic("info", [0, 1])]);
		expect(problemBeneathRow(problems, [])).toBe("error");
		expect(problemBeneathRow(problems, [0])).toBe("error");
		expect(problemBeneathRow(problems, [0, 1])).toBe("warning");
		expect(problemBeneathRow(problems, [0, 2])).toBe("error");
		expect(problemBeneathRow(problems, [0, 1, 0])).toBeNull();
		expect(problemBeneathRow(problems, [0, 0])).toBeNull();
	});

	it("reports nothing without diagnostics", () => {
		const problems = rowProblems(DOCUMENT, []);
		expect(problems.own.size).toBe(0);
		expect(problems.beneath.size).toBe(0);
	});
});

describe("attributeProblems", () => {
	it("finds the problems of one attribute of one element", () => {
		const diagnostics = [diagnostic("error", [0, 0], "name"), diagnostic("error", [0, 0]), diagnostic("error", [0, 2], "name")];
		expect(attributeProblems(diagnostics, [0, 0], "name")).toEqual([diagnostics[0]]);
		expect(attributeProblems(diagnostics, [0, 0], "alias")).toEqual([]);
	});
});

describe("problem counts", () => {
	it("counts errors and warnings but not notes", () => {
		const counts = problemCounts([diagnostic("error", []), diagnostic("error", []), diagnostic("warning", []), diagnostic("info", [])]);
		expect(counts).toEqual({ errors: 2, warnings: 1 });
		expect(problemCountText(counts)).toBe("2 errors and 1 warning");
		expect(problemCountText({ errors: 0, warnings: 2 })).toBe("2 warnings");
		expect(problemCountText({ errors: 1, warnings: 0 })).toBe("1 error");
		expect(problemCountText({ errors: 0, warnings: 0 })).toBeNull();
	});

	it("describes a problem beneath a collapsed row", () => {
		expect(beneathText("warning")).toBe("A row inside this collapsed row has a warning.");
	});
});
