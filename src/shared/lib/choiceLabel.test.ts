import { describe, expect, it } from "vitest";

import { withChoiceValue, withoutChoiceValue } from "./choiceLabel";

describe("withChoiceValue", () => {
	it("puts the value beside the label", () => {
		expect(withChoiceValue({ text: "Preferred Customer", value: 100000001 })).toEqual({ text: "Preferred Customer (100000001)", value: 100000001 });
	});

	it("does not add the value a second time", () => {
		const option = withChoiceValue({ text: "Active", value: 0 });
		expect(withChoiceValue(option)).toBe(option);
	});

	it("leaves the blank option alone", () => {
		const blank = { text: "", value: null as unknown as number };
		expect(withChoiceValue(blank)).toBe(blank);
	});

	it("keeps whatever else the platform put on the option", () => {
		expect(withChoiceValue({ text: "Hot", value: 1, color: "#ff0000" })).toEqual({ text: "Hot (1)", value: 1, color: "#ff0000" });
	});
});

describe("withoutChoiceValue", () => {
	it("undoes withChoiceValue", () => {
		const option = { text: "Preferred Customer", value: 100000001 };
		expect(withoutChoiceValue(withChoiceValue(option))).toEqual(option);
	});

	it("leaves a label that shows some other number", () => {
		const option = { text: "Tier (2)", value: 1 };
		expect(withoutChoiceValue(option)).toBe(option);
	});
});
