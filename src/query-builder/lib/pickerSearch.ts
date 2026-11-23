export interface PickerOption {
	readonly value: string;
	readonly text: string;
	readonly secondary?: string;
	readonly keys?: readonly string[];
}

export interface PickerSearch {
	readonly needle: string;
	readonly matches: number;
	readonly visible: readonly PickerOption[];
	readonly more: number;
}

export interface MatchRange {
	readonly start: number;
	readonly end: number;
}

export const PICKER_RENDER_CAP = 50;

export const pickerNeedle = (query: string): string => query.trim().toLowerCase();

const rankOf = (option: PickerOption, needle: string): number => {
	const index = option.text.toLowerCase().indexOf(needle);
	if (index === 0) {
		return 0;
	}
	if (index > 0) {
		return 1;
	}
	return [option.secondary ?? "", ...(option.keys ?? [])].some((key) => key.toLowerCase().includes(needle)) ? 2 : -1;
};

export const rankPickerOptions = (options: readonly PickerOption[], query: string): readonly PickerOption[] => {
	const needle = pickerNeedle(query);
	if (needle === "") {
		return options;
	}
	const ranks: PickerOption[][] = [[], [], []];
	for (const option of options) {
		ranks[rankOf(option, needle)]?.push(option);
	}
	return ranks.flat();
};

export const searchPicker = (options: readonly PickerOption[], query: string, selected: string | null = null, cap = PICKER_RENDER_CAP): PickerSearch => {
	const needle = pickerNeedle(query);
	const ranked = rankPickerOptions(options, needle);
	const capped = ranked.slice(0, cap);
	const current = needle === "" && selected !== null ? ranked.find((option) => option.value === selected) : undefined;
	const visible = current && !capped.includes(current) ? [...capped.slice(0, Math.max(0, cap - 1)), current] : capped;
	return { needle, matches: ranked.length, visible, more: ranked.length - visible.length };
};

export const matchRange = (text: string, query: string): MatchRange | null => {
	const needle = pickerNeedle(query);
	if (needle === "") {
		return null;
	}
	const start = text.toLowerCase().indexOf(needle);
	return start < 0 ? null : { start, end: start + needle.length };
};

export const moreOptionsText = (more: number): string => `${more} more, keep typing`;
