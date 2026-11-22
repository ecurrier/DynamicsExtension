export type ColumnType =
	| "text"
	| "memo"
	| "wholeNumber"
	| "decimalOrMoney"
	| "dateTime"
	| "choice"
	| "multiChoice"
	| "yesNo"
	| "lookup"
	| "owner"
	| "uniqueIdentifier"
	| "stateOrStatus";

export type OperatorValueCount = "none" | "one" | "two" | "list";

export type OperatorValueKind = "column" | "integer";

export type OperatorDefinition = {
	readonly name: string;
	readonly meaning: string;
	readonly columnTypes: readonly ColumnType[];
	readonly values: OperatorValueCount;
	readonly valueKind: OperatorValueKind;
	readonly requiresTime: boolean;
	readonly deprecated: boolean;
};

export const COLUMN_TYPES: readonly ColumnType[] = [
	"text",
	"memo",
	"wholeNumber",
	"decimalOrMoney",
	"dateTime",
	"choice",
	"multiChoice",
	"yesNo",
	"lookup",
	"owner",
	"uniqueIdentifier",
	"stateOrStatus",
];

const STRING: readonly ColumnType[] = ["text", "memo"];
const NUMBER: readonly ColumnType[] = ["wholeNumber", "decimalOrMoney"];
const CHOICE: readonly ColumnType[] = ["choice", "multiChoice", "stateOrStatus"];
const DATE: readonly ColumnType[] = ["dateTime"];
const IDENTIFIER: readonly ColumnType[] = ["uniqueIdentifier", "lookup"];
const HIERARCHY: readonly ColumnType[] = ["uniqueIdentifier", "lookup"];
const USER: readonly ColumnType[] = ["uniqueIdentifier", "lookup", "owner"];
const LIST: readonly ColumnType[] = [...STRING, ...NUMBER, ...CHOICE, "owner", ...IDENTIFIER];
const ORDERED: readonly ColumnType[] = [...NUMBER, ...DATE, ...STRING];
const RANGE: readonly ColumnType[] = [...NUMBER, ...DATE];

type Options = { readonly valueKind?: OperatorValueKind; readonly requiresTime?: boolean; readonly deprecated?: boolean };

const operator = (
	name: string,
	meaning: string,
	columnTypes: readonly ColumnType[],
	values: OperatorValueCount,
	options: Options = {}
): OperatorDefinition => ({
	name,
	meaning,
	columnTypes,
	values,
	valueKind: options.valueKind ?? "column",
	requiresTime: options.requiresTime ?? false,
	deprecated: options.deprecated ?? false,
});

const relative = (name: string, meaning: string, options: Options = {}): OperatorDefinition =>
	operator(name, meaning, DATE, "one", { valueKind: "integer", ...options });

const fixedPeriod = (name: string, meaning: string): OperatorDefinition => operator(name, meaning, DATE, "none");

export const OPERATORS: readonly OperatorDefinition[] = [
	operator("eq", "Equal to the value.", COLUMN_TYPES, "one"),
	operator("ne", "Not equal to the value.", COLUMN_TYPES, "one"),
	operator("neq", "Deprecated spelling of ne.", [], "one", { deprecated: true }),
	operator("null", "Has no value.", COLUMN_TYPES, "none"),
	operator("not-null", "Has a value.", COLUMN_TYPES, "none"),
	operator("gt", "Greater than the value.", ORDERED, "one"),
	operator("ge", "Greater than or equal to the value.", ORDERED, "one"),
	operator("lt", "Less than the value.", ORDERED, "one"),
	operator("le", "Less than or equal to the value.", ORDERED, "one"),
	operator("between", "Between the first value and the second.", RANGE, "two"),
	operator("not-between", "Outside the range from the first value to the second.", RANGE, "two"),
	operator("in", "Equal to one of the listed values.", LIST, "list"),
	operator("not-in", "Equal to none of the listed values.", LIST, "list"),
	operator("like", "Matches the pattern, where % stands for any run of characters.", STRING, "one"),
	operator("not-like", "Does not match the pattern.", STRING, "one"),
	operator("begins-with", "Text starts with the value.", STRING, "one"),
	operator("not-begin-with", "Text does not start with the value.", STRING, "one"),
	operator("ends-with", "Text ends with the value.", STRING, "one"),
	operator("not-end-with", "Text does not end with the value.", STRING, "one"),
	operator("contain-values", "The multi-select Choice holds at least one of the listed values.", ["multiChoice"], "list"),
	operator("not-contain-values", "The multi-select Choice holds none of the listed values.", ["multiChoice"], "list"),
	operator("eq-userid", "Equal to the calling user.", USER, "none"),
	operator("ne-userid", "Not equal to the calling user.", USER, "none"),
	operator("eq-businessid", "Equal to the calling user's business unit.", USER, "none"),
	operator("ne-businessid", "Not equal to the calling user's business unit.", USER, "none"),
	operator("eq-userteams", "Owned by a team the calling user belongs to.", ["owner"], "none"),
	operator("eq-useroruserteams", "Owned by the calling user or a team they belong to.", ["owner"], "none"),
	operator("eq-useroruserhierarchy", "The calling user or someone below them in the hierarchy security model.", ["owner", "lookup"], "none"),
	operator(
		"eq-useroruserhierarchyandteams",
		"The calling user, someone below them in the hierarchy security model, or any of their teams.",
		["owner", "lookup"],
		"none"
	),
	operator("eq-userlanguage", "Equal to the calling user's language.", ["wholeNumber"], "none"),
	operator("above", "Records above the given record in its hierarchy, not including it.", HIERARCHY, "one"),
	operator("eq-or-above", "The given record and the records above it in its hierarchy.", HIERARCHY, "one"),
	operator("under", "Records below the given record in its hierarchy, not including it.", HIERARCHY, "one"),
	operator("eq-or-under", "The given record and the records below it in its hierarchy.", HIERARCHY, "one"),
	operator("not-under", "Records that are not below the given record in its hierarchy.", HIERARCHY, "one"),
	operator("on", "On the given date.", DATE, "one"),
	operator("on-or-after", "On or after the given date.", DATE, "one"),
	operator("on-or-before", "On or before the given date.", DATE, "one"),
	fixedPeriod("today", "On today's date."),
	fixedPeriod("yesterday", "On yesterday's date."),
	fixedPeriod("tomorrow", "On tomorrow's date."),
	fixedPeriod("this-week", "In the current week."),
	fixedPeriod("this-month", "In the current calendar month."),
	fixedPeriod("this-year", "In the current calendar year."),
	fixedPeriod("last-seven-days", "In the last seven days, including today."),
	fixedPeriod("last-week", "In the previous week, Sunday to Saturday."),
	fixedPeriod("last-month", "In the previous calendar month."),
	fixedPeriod("last-year", "In the previous calendar year."),
	fixedPeriod("next-seven-days", "In the next seven days."),
	fixedPeriod("next-week", "In the next week."),
	fixedPeriod("next-month", "In the next calendar month."),
	fixedPeriod("next-year", "In the next calendar year."),
	relative("last-x-hours", "In the last N hours.", { requiresTime: true }),
	relative("last-x-days", "In the last N days."),
	relative("last-x-weeks", "In the last N weeks."),
	relative("last-x-months", "In the last N months."),
	relative("last-x-years", "In the last N years."),
	relative("next-x-hours", "In the next N hours.", { requiresTime: true }),
	relative("next-x-days", "In the next N days."),
	relative("next-x-weeks", "In the next N weeks."),
	relative("next-x-months", "In the next N months."),
	relative("next-x-years", "In the next N years."),
	relative("olderthan-x-minutes", "More than N minutes ago.", { requiresTime: true }),
	relative("olderthan-x-hours", "More than N hours ago.", { requiresTime: true }),
	relative("olderthan-x-days", "More than N days ago."),
	relative("olderthan-x-weeks", "More than N weeks ago."),
	relative("olderthan-x-months", "More than N months ago."),
	relative("olderthan-x-years", "More than N years ago."),
	fixedPeriod("this-fiscal-period", "In the current fiscal period."),
	fixedPeriod("this-fiscal-year", "In the current fiscal year."),
	fixedPeriod("last-fiscal-period", "In the previous fiscal period."),
	fixedPeriod("last-fiscal-year", "In the previous fiscal year."),
	fixedPeriod("next-fiscal-period", "In the next fiscal period."),
	fixedPeriod("next-fiscal-year", "In the next fiscal year."),
	relative("last-x-fiscal-periods", "In the last N fiscal periods."),
	relative("last-x-fiscal-years", "In the last N fiscal years."),
	relative("next-x-fiscal-periods", "In the next N fiscal periods."),
	relative("next-x-fiscal-years", "In the next N fiscal years."),
	relative("in-fiscal-period", "In the given fiscal period of any fiscal year."),
	relative("in-fiscal-year", "In the given fiscal year."),
	operator("in-fiscal-period-and-year", "In the given fiscal period of the given fiscal year.", DATE, "two", { valueKind: "integer" }),
	operator("in-or-after-fiscal-period-and-year", "In or after the given fiscal period of the given fiscal year.", DATE, "two", { valueKind: "integer" }),
	operator("in-or-before-fiscal-period-and-year", "In or before the given fiscal period of the given fiscal year.", DATE, "two", { valueKind: "integer" }),
];

const BY_NAME = new Map(OPERATORS.map((definition) => [definition.name, definition]));

export const operatorDefinition = (name: string): OperatorDefinition | undefined => BY_NAME.get(name);

export const operatorsFor = (columnType: ColumnType): readonly OperatorDefinition[] =>
	OPERATORS.filter((definition) => definition.columnTypes.includes(columnType));
