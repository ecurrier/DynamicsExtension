export interface ChoiceOptionLabel {
	text: string;
	value: number;
}

const valueSuffix = (value: number): string => ` (${value})`;

const showsValue = (option: ChoiceOptionLabel): boolean => option.text.endsWith(valueSuffix(option.value));

const isLabelled = (option: ChoiceOptionLabel): boolean => !!option.text && Number.isFinite(option.value);

export const withChoiceValue = <T extends ChoiceOptionLabel>(option: T): T =>
	isLabelled(option) && !showsValue(option) ? { ...option, text: `${option.text}${valueSuffix(option.value)}` } : option;

export const withoutChoiceValue = <T extends ChoiceOptionLabel>(option: T): T =>
	isLabelled(option) && showsValue(option) ? { ...option, text: option.text.slice(0, -valueSuffix(option.value).length) } : option;
