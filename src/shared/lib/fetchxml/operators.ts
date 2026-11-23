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
	operator("neq", "Old spelling of ne. Use ne.", [], "one", { deprecated: true }),
	operator("null", "Has no value.", COLUMN_TYPES, "none"),
	operator("not-null", "Has a value.", COLUMN_TYPES, "none"),
	operator("gt", "Greater than the value.", ORDERED, "one"),
	operator("ge", "Greater than or equal to the value.", ORDERED, "one"),
	operator("lt", "Less than the value.", ORDERED, "one"),
	operator("le", "Less than or equal to the value.", ORDERED, "one"),
	operator("between", "From the first value to the second value.", RANGE, "two"),
	operator("not-between", "Not from the first value to the second value.", RANGE, "two"),
	operator("in", "Equal to one of the listed values.", LIST, "list"),
	operator("not-in", "Equal to none of the listed values.", LIST, "list"),
	operator("like", "Matches the pattern. % matches any characters.", STRING, "one"),
	operator("not-like", "Does not match the pattern.", STRING, "one"),
	operator("begins-with", "Text starts with the value.", STRING, "one"),
	operator("not-begin-with", "Text does not start with the value.", STRING, "one"),
	operator("ends-with", "Text ends with the value.", STRING, "one"),
	operator("not-end-with", "Text does not end with the value.", STRING, "one"),
	operator("contain-values", "Holds one or more of the listed values.", ["multiChoice"], "list"),
	operator("not-contain-values", "Holds none of the listed values.", ["multiChoice"], "list"),
	operator("eq-userid", "Equal to the current user.", USER, "none"),
	operator("ne-userid", "Not equal to the current user.", USER, "none"),
	operator("eq-businessid", "Equal to the business unit of the current user.", USER, "none"),
	operator("ne-businessid", "Not equal to the business unit of the current user.", USER, "none"),
	operator("eq-userteams", "Owned by a team of the current user.", ["owner"], "none"),
	operator("eq-useroruserteams", "Owned by the current user or a team of the current user.", ["owner"], "none"),
	operator("eq-useroruserhierarchy", "The current user or a user below them in the security hierarchy.", ["owner", "lookup"], "none"),
	operator(
		"eq-useroruserhierarchyandteams",
		"The current user, a user below them in the security hierarchy, or one of their teams.",
		["owner", "lookup"],
		"none"
	),
	operator("eq-userlanguage", "Equal to the language of the current user.", ["wholeNumber"], "none"),
	operator("above", "Above the Record in the hierarchy.", HIERARCHY, "one"),
	operator("eq-or-above", "The Record or above it in the hierarchy.", HIERARCHY, "one"),
	operator("under", "Below the Record in the hierarchy.", HIERARCHY, "one"),
	operator("eq-or-under", "The Record or below it in the hierarchy.", HIERARCHY, "one"),
	operator("not-under", "Not below the Record in the hierarchy.", HIERARCHY, "one"),
	operator("on", "On the date.", DATE, "one"),
	operator("on-or-after", "On or after the date.", DATE, "one"),
	operator("on-or-before", "On or before the date.", DATE, "one"),
	fixedPeriod("today", "Today."),
	fixedPeriod("yesterday", "Yesterday."),
	fixedPeriod("tomorrow", "Tomorrow."),
	fixedPeriod("this-week", "In the current week."),
	fixedPeriod("this-month", "In the current calendar month."),
	fixedPeriod("this-year", "In the current calendar year."),
	fixedPeriod("last-seven-days", "In the last seven days. Includes today."),
	fixedPeriod("last-week", "In the previous week, from Sunday to Saturday."),
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
	relative("in-fiscal-period", "In fiscal period N of all fiscal years."),
	relative("in-fiscal-year", "In fiscal year N."),
	operator("in-fiscal-period-and-year", "In the fiscal period of the fiscal year.", DATE, "two", { valueKind: "integer" }),
	operator("in-or-after-fiscal-period-and-year", "In or after the fiscal period of the fiscal year.", DATE, "two", { valueKind: "integer" }),
	operator("in-or-before-fiscal-period-and-year", "In or before the fiscal period of the fiscal year.", DATE, "two", { valueKind: "integer" }),
];

const BY_NAME = new Map(OPERATORS.map((definition) => [definition.name, definition]));

export const operatorDefinition = (name: string): OperatorDefinition | undefined => BY_NAME.get(name);

export const operatorsFor = (columnType: ColumnType): readonly OperatorDefinition[] =>
	OPERATORS.filter((definition) => definition.columnTypes.includes(columnType));
