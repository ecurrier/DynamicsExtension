import { type ControlStateTag, controlStateTags } from "@/shared/lib";
import { type DirtyColumnsResult } from "@/shared/types";

export type SubmitOutcome = "saved" | "always" | "skipped";

export interface DirtyColumnFinding {
	logicalName: string;
	displayName: string;
	attributeType: string;
	value: string;
	outcome: SubmitOutcome;
	onForm: boolean;
	tags: ControlStateTag[];
	state: string;
}

export const SUBMIT_OUTCOME_LABELS: Record<SubmitOutcome, string> = {
	saved: "Saves",
	always: "Always saves",
	skipped: "Never saves",
};

const EMPTY_VALUE = "(empty)";
const NOT_ON_FORM = "Not on form";

const outcomeOf = (submitMode: string): SubmitOutcome => {
	if (submitMode === "never") {
		return "skipped";
	}
	return submitMode === "always" ? "always" : "saved";
};

export const dirtyColumnFindings = (result: DirtyColumnsResult): DirtyColumnFinding[] =>
	result.columns
		.map((column) => {
			const control = column.controls[0];
			const tags = control ? controlStateTags({ visible: control.visible, disabled: control.disabled, requiredLevel: column.requiredLevel }) : [];
			const outcome = outcomeOf(column.submitMode);
			return {
				logicalName: column.logicalName,
				displayName: column.displayName,
				attributeType: column.attributeType,
				value: column.value ?? EMPTY_VALUE,
				outcome,
				onForm: column.onForm,
				tags,
				state: [SUBMIT_OUTCOME_LABELS[outcome], ...(column.onForm ? tags : [NOT_ON_FORM])].join(" · "),
			};
		})
		.sort((left, right) => Number(right.outcome === "skipped") - Number(left.outcome === "skipped") || left.displayName.localeCompare(right.displayName));

export const dirtyColumnsSummary = (result: DirtyColumnsResult): string => {
	const findings = dirtyColumnFindings(result);
	if (findings.length === 0) {
		return `None of the ${result.total} columns on this form has changed since the record was loaded or last saved.`;
	}
	const parts = [`${findings.length} of ${result.total} columns have unsaved changes.`];
	if (result.isNew) {
		parts.push("This record has not been saved yet, so every populated column counts.");
	}
	const skipped = findings.filter((finding) => finding.outcome === "skipped").length;
	if (skipped > 0) {
		parts.push(`${skipped} of them ${skipped === 1 ? "is" : "are"} excluded from the next save by a submit mode of never.`);
	}
	return parts.join(" ");
};

export const dirtyColumnsToText = (result: DirtyColumnsResult): string => {
	const findings = dirtyColumnFindings(result);
	if (findings.length === 0) {
		return `No unsaved changes on this ${result.entityLogicalName} form (${result.total} columns checked).`;
	}
	return [
		`${findings.length} of ${result.total} columns on this ${result.entityLogicalName} form have unsaved changes:`,
		...findings.map((finding) => `- ${finding.displayName} (${finding.logicalName}) = ${finding.value} [${finding.state}]`),
	].join("\n");
};
