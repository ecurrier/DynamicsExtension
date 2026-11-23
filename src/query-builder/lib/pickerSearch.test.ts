import { describe, expect, it } from "vitest";

import { matchRange, moreOptionsText, type PickerOption, rankPickerOptions, searchPicker } from "./pickerSearch";

const OPTIONS: PickerOption[] = [
	{ value: "accountnumber", text: "accountnumber", secondary: "Account Number" },
	{ value: "name", text: "name", secondary: "Account Name" },
	{ value: "numberofemployees", text: "numberofemployees", secondary: "Number of Employees" },
	{ value: "revenue", text: "revenue", secondary: "Annual Revenue", keys: ["money"] },
	{ value: "new_number", text: "new_number", secondary: "Reference" },
];

const values = (options: readonly PickerOption[]): string[] => options.map((option) => option.value);

describe("rankPickerOptions", () => {
	it("keeps every option in its order for an empty query", () => {
		expect(values(rankPickerOptions(OPTIONS, "  "))).toEqual(values(OPTIONS));
	});

	it("ranks main-text prefixes, then other main-text matches, then secondary text and keys", () => {
		expect(values(rankPickerOptions(OPTIONS, "num"))).toEqual(["numberofemployees", "accountnumber", "new_number"]);
		expect(values(rankPickerOptions(OPTIONS, "number"))).toEqual(["numberofemployees", "accountnumber", "new_number"]);
		expect(values(rankPickerOptions(OPTIONS, "acc"))).toEqual(["accountnumber", "name"]);
	});

	it("matches case-insensitively over the main text, the secondary text and the extra keys", () => {
		expect(values(rankPickerOptions(OPTIONS, "ANNUAL"))).toEqual(["revenue"]);
		expect(values(rankPickerOptions(OPTIONS, "Money"))).toEqual(["revenue"]);
		expect(values(rankPickerOptions(OPTIONS, "zzz"))).toEqual([]);
	});

	it("keeps the original order within a rank", () => {
		const options: PickerOption[] = [
			{ value: "b", text: "beta", secondary: "x" },
			{ value: "a", text: "alpha", secondary: "be" },
			{ value: "c", text: "best" },
		];
		expect(values(rankPickerOptions(options, "be"))).toEqual(["b", "c", "a"]);
	});

	it("finds an operator by its meaning", () => {
		const operators: PickerOption[] = [
			{ value: "ne", text: "ne", secondary: "Not equal to the value." },
			{ value: "eq", text: "eq", secondary: "Equal to the value." },
		];
		expect(values(rankPickerOptions(operators, "equal"))).toEqual(["ne", "eq"]);
		expect(values(rankPickerOptions(operators, "eq"))).toEqual(["eq", "ne"]);
	});
});

describe("searchPicker", () => {
	const many: PickerOption[] = Array.from({ length: 120 }, (_, index) => ({ value: `c${index}`, text: `column${String(index).padStart(3, "0")}` }));

	it("renders at most the cap and counts the rest", () => {
		const search = searchPicker(many, "");
		expect(search.visible).toHaveLength(50);
		expect(search.more).toBe(70);
		expect(search.matches).toBe(120);
		expect(moreOptionsText(search.more)).toBe("70 more. Type more to find them.");
	});

	it("keeps the current value visible when it is past the cap and nothing is typed", () => {
		const search = searchPicker(many, "", "c99");
		expect(search.visible).toHaveLength(50);
		expect(search.visible.at(-1)?.value).toBe("c99");
		expect(search.more).toBe(70);
	});

	it("does not add the current value once the user types", () => {
		const search = searchPicker(many, "column01", "c99");
		expect(values(search.visible)).toEqual(["c10", "c11", "c12", "c13", "c14", "c15", "c16", "c17", "c18", "c19"]);
		expect(search.more).toBe(0);
	});

	it("reports no matches", () => {
		const search = searchPicker(many, "nothing");
		expect(search.visible).toEqual([]);
		expect(search.matches).toBe(0);
		expect(search.more).toBe(0);
	});
});

describe("matchRange", () => {
	it("finds the first case-insensitive occurrence", () => {
		expect(matchRange("Account Number", "num")).toEqual({ start: 8, end: 11 });
		expect(matchRange("name", " NA ")).toEqual({ start: 0, end: 2 });
	});

	it("is null for an empty query or no match", () => {
		expect(matchRange("name", "")).toBeNull();
		expect(matchRange("name", "x")).toBeNull();
	});
});
