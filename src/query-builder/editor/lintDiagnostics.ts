import { type Diagnostic as LintDiagnostic } from "@codemirror/lint";

import { type Diagnostic, type FetchXmlParseError, type SourceRange } from "@/shared/lib/fetchxml";

export interface LintInput {
	readonly errors: readonly FetchXmlParseError[];
	readonly diagnostics: readonly Diagnostic[];
	readonly length: number;
}

const clamped = (range: SourceRange, length: number): SourceRange => {
	const from = Math.max(0, Math.min(range.from, length));
	return { from, to: Math.max(from, Math.min(range.to, length)) };
};

export const lintDiagnostics = ({ errors, diagnostics, length }: LintInput): LintDiagnostic[] => {
	if (errors.length > 0) {
		return errors.map((error) => ({ ...clamped(error.range, length), severity: "error", message: error.message }));
	}
	return diagnostics.flatMap((diagnostic) =>
		diagnostic.range ? [{ ...clamped(diagnostic.range, length), severity: diagnostic.severity, message: diagnostic.message }] : []
	);
};
