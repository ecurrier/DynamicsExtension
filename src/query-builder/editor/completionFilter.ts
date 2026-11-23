import { type QueryMetadata, type TableLookup } from "@/shared/lib/fetchxml";

import { type PickerOption, rankPickerOptions } from "../lib";
import { type CompletionApply, type CompletionItem } from "./completions";

export const filterCompletionItems = (items: readonly CompletionItem[], typed: string): readonly CompletionItem[] => {
	const options = items.map((item, index): PickerOption => ({
		value: String(index),
		text: item.label,
		...(item.detail ? { secondary: item.detail } : {}),
		keys: [item.value],
	}));
	return rankPickerOptions(options, typed).flatMap((option) => {
		const item = items[Number(option.value)];
		return item ? [item] : [];
	});
};

export const reopensCompletion = (apply: CompletionApply): boolean => apply.insert.slice(apply.cursorOffset - 2, apply.cursorOffset + 1) === '=""';

export const layeredMetadata =
	(cached: (tableLogicalName: string) => TableLookup | null, fallback: QueryMetadata): QueryMetadata =>
	(tableLogicalName) =>
		cached(tableLogicalName) ?? fallback(tableLogicalName);
