import { matchesFilter } from "@/shared/lib";

export interface PickerOption {
	value: string;
	label: string;
	description?: string;
}

export const filterOptions = (options: PickerOption[], query: string): PickerOption[] =>
	options.filter((option) => matchesFilter([option.label, option.description, option.value], query));

export const optionLabel = (options: PickerOption[], value: string): string => options.find((option) => option.value === value)?.label ?? value;
