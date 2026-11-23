import { type Diagnostic, type DiagnosticSeverity, type FetchXmlDocument, type NodePath } from "@/shared/lib/fetchxml";

import { pathKey, rowPathOf, samePath } from "./treePaths";

export interface RowProblems {
	readonly own: ReadonlyMap<string, readonly Diagnostic[]>;
	readonly beneath: ReadonlyMap<string, DiagnosticSeverity>;
}

export interface ProblemCounts {
	readonly errors: number;
	readonly warnings: number;
}

const SEVERITY_ORDER: readonly DiagnosticSeverity[] = ["error", "warning", "info"];

const severityIndex = (severity: DiagnosticSeverity): number => SEVERITY_ORDER.indexOf(severity);

export const worseSeverity = (left: DiagnosticSeverity | null, right: DiagnosticSeverity | null): DiagnosticSeverity | null => {
	if (left === null) {
		return right;
	}
	if (right === null) {
		return left;
	}
	return severityIndex(left) <= severityIndex(right) ? left : right;
};

export const worstSeverity = (diagnostics: readonly Diagnostic[]): DiagnosticSeverity | null =>
	diagnostics.reduce<DiagnosticSeverity | null>((worst, diagnostic) => worseSeverity(worst, diagnostic.severity), null);

export const NO_ROW_PROBLEMS: RowProblems = { own: new Map(), beneath: new Map() };

export const rowProblems = (document: FetchXmlDocument, diagnostics: readonly Diagnostic[]): RowProblems => {
	if (diagnostics.length === 0) {
		return NO_ROW_PROBLEMS;
	}
	const own = new Map<string, Diagnostic[]>();
	const beneath = new Map<string, DiagnosticSeverity>();
	for (const diagnostic of diagnostics) {
		const rowPath = rowPathOf(document, diagnostic.path);
		const key = pathKey(rowPath);
		own.set(key, [...(own.get(key) ?? []), diagnostic]);
		for (let length = 0; length < rowPath.length; length += 1) {
			const ancestor = pathKey(rowPath.slice(0, length));
			beneath.set(ancestor, worseSeverity(beneath.get(ancestor) ?? null, diagnostic.severity) ?? diagnostic.severity);
		}
	}
	return { own, beneath };
};

export const problemsOfRow = (problems: RowProblems, path: NodePath): readonly Diagnostic[] => problems.own.get(pathKey(path)) ?? [];

export const problemBeneathRow = (problems: RowProblems, path: NodePath): DiagnosticSeverity | null => problems.beneath.get(pathKey(path)) ?? null;

export const attributeProblems = (diagnostics: readonly Diagnostic[], path: NodePath, attribute: string): readonly Diagnostic[] =>
	diagnostics.filter((diagnostic) => diagnostic.attribute === attribute && samePath(diagnostic.path, path));

export const problemCounts = (diagnostics: readonly Diagnostic[]): ProblemCounts => ({
	errors: diagnostics.filter((diagnostic) => diagnostic.severity === "error").length,
	warnings: diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length,
});

const counted = (count: number, singular: string): string => `${count} ${singular}${count === 1 ? "" : "s"}`;

export const problemCountText = ({ errors, warnings }: ProblemCounts): string | null => {
	const parts = [...(errors > 0 ? [counted(errors, "error")] : []), ...(warnings > 0 ? [counted(warnings, "warning")] : [])];
	return parts.length === 0 ? null : parts.join(" and ");
};

const SEVERITY_NOUNS: Record<DiagnosticSeverity, string> = { error: "an error", warning: "a warning", info: "a note" };

export const beneathText = (severity: DiagnosticSeverity): string => `A row inside this collapsed row has ${SEVERITY_NOUNS[severity]}.`;
