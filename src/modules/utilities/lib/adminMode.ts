import { type ControlStateTag, controlStateTags } from "@/shared/lib";
import { type AdminModeResult } from "@/shared/types";

export interface AdminModeFinding {
	name: string;
	label: string;
	tags: ControlStateTag[];
	state: string;
	severe: boolean;
}

export const adminModeFindings = (result: AdminModeResult): AdminModeFinding[] =>
	result.snapshot.controls
		.filter((control) => !control.visible || control.disabled || control.requiredLevel !== "none")
		.map((control) => {
			const tags = controlStateTags(control);
			return {
				name: control.name,
				label: control.label,
				tags,
				state: tags.join(" · "),
				severe: !control.visible && control.requiredLevel === "required",
			};
		})
		.sort((left, right) => Number(right.severe) - Number(left.severe) || left.label.localeCompare(right.label));

export const adminModeToText = (result: AdminModeResult): string => {
	const findings = adminModeFindings(result);
	if (findings.length === 0) {
		return `No controls on this form were hidden, read-only, or required (${result.total} checked).`;
	}
	return [
		`${findings.length} of ${result.total} controls were restricted before admin mode ran:`,
		...findings.map((finding) => `- ${finding.label} (${finding.name}): ${finding.state}`),
	].join("\n");
};
