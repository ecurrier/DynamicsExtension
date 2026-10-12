import { describe, expect, it } from "vitest";

import { withChoiceValue, withoutChoiceValue } from "@/shared/lib";

import { relabelChoices } from "./formState";

const BLANK = { text: "", value: null as unknown as number };

const fakeControl = (attributeType: string, initial: Xrm.OptionSetValue[]) => {
	let options = [...initial];
	return {
		getAttribute: () => ({ getAttributeType: () => attributeType }),
		getOptions: () => [...options],
		clearOptions: () => {
			options = [];
		},
		addOption: (option: Xrm.OptionSetValue) => {
			options.push(option);
		},
	};
};

const fakeForm = (controls: object[]): Xrm.Page =>
	({ ui: { controls: { forEach: (callback: (control: object) => void) => controls.forEach(callback) } } }) as unknown as Xrm.Page;

describe("relabelChoices", () => {
	it("shows the value on every option of a choice and a multi-select choice, in the original order", () => {
		const choice = fakeControl("optionset", [BLANK, { text: "Hot", value: 1 }, { text: "Cold", value: 3 }]);
		const choices = fakeControl("multiselectoptionset", [
			{ text: "Email", value: 100000000 },
			{ text: "Phone", value: 100000001 },
		]);
		relabelChoices(fakeForm([choice, choices]), withChoiceValue);
		expect(choice.getOptions()).toEqual([BLANK, { text: "Hot (1)", value: 1 }, { text: "Cold (3)", value: 3 }]);
		expect(choices.getOptions()).toEqual([
			{ text: "Email (100000000)", value: 100000000 },
			{ text: "Phone (100000001)", value: 100000001 },
		]);
	});

	it("is safe to run twice and is undone by the restore pass", () => {
		const choice = fakeControl("optionset", [{ text: "Hot", value: 1 }]);
		const form = fakeForm([choice]);
		relabelChoices(form, withChoiceValue);
		relabelChoices(form, withChoiceValue);
		expect(choice.getOptions()).toEqual([{ text: "Hot (1)", value: 1 }]);
		relabelChoices(form, withoutChoiceValue);
		expect(choice.getOptions()).toEqual([{ text: "Hot", value: 1 }]);
	});

	it("leaves two-option columns and controls without options alone", () => {
		const yesNo = fakeControl("boolean", [
			{ text: "No", value: 0 },
			{ text: "Yes", value: 1 },
		]);
		const subgrid = { getName: () => "Contacts" };
		relabelChoices(fakeForm([yesNo, subgrid]), withChoiceValue);
		expect(yesNo.getOptions()).toEqual([
			{ text: "No", value: 0 },
			{ text: "Yes", value: 1 },
		]);
	});
});
