import { type AttributeEdit } from "@/shared/types";

import { type AttributeProperty } from "./attributeProperties";

export type EditValues = Record<AttributeProperty, string>;

export const EMPTY_EDIT_VALUES: EditValues = {
	label: "",
	description: "",
	requiredLevel: "",
	maxLength: "",
	minValue: "",
	maxValue: "",
	precision: "",
};

const NUMBER_PROPERTIES = ["maxLength", "minValue", "maxValue", "precision"] as const;

const numberOrUndefined = (value: string): number | undefined => {
	const trimmed = value.trim();
	if (trimmed === "") {
		return undefined;
	}
	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? parsed : undefined;
};

export const attributeEditFrom = (values: EditValues): AttributeEdit => {
	const edit: AttributeEdit = {};
	if (values.label.trim() !== "") {
		edit.label = values.label.trim();
	}
	if (values.description.trim() !== "") {
		edit.description = values.description.trim();
	}
	if (values.requiredLevel !== "") {
		edit.requiredLevel = values.requiredLevel;
	}
	for (const key of NUMBER_PROPERTIES) {
		const parsed = numberOrUndefined(values[key]);
		if (parsed !== undefined) {
			edit[key] = parsed;
		}
	}
	return edit;
};
