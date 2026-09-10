export type ControlStateTag = "Hidden" | "Read-only" | "Required" | "Recommended" | "Empty";

export interface ControlStateSource {
	visible: boolean;
	disabled: boolean;
	requiredLevel?: string;
	hasValue?: boolean;
}

export const controlStateTags = (control: ControlStateSource): ControlStateTag[] => {
	const tags: ControlStateTag[] = [];
	if (!control.visible) {
		tags.push("Hidden");
	}
	if (control.disabled) {
		tags.push("Read-only");
	}
	if (control.requiredLevel === "required") {
		tags.push("Required");
	} else if (control.requiredLevel === "recommended") {
		tags.push("Recommended");
	}
	if (control.disabled && control.requiredLevel === "required" && control.hasValue === false) {
		tags.push("Empty");
	}
	return tags;
};

export const controlIsRestricted = (control: ControlStateSource): boolean => !control.visible || control.disabled;
