export type WebApiComparison = "eq" | "ne" | "gt" | "ge" | "lt" | "le";

export type WebApiStringFunction = "contains" | "startswith" | "endswith";

export type QueryFunctionParameters = "none" | "value" | "integer" | "values" | "integer-pair";

export type WebApiOperatorMapping =
	| { readonly kind: "comparison"; readonly operator: WebApiComparison }
	| { readonly kind: "null"; readonly operator: "eq" | "ne" }
	| { readonly kind: "string-function"; readonly name: WebApiStringFunction; readonly negated: boolean }
	| { readonly kind: "like"; readonly negated: boolean }
	| { readonly kind: "query-function"; readonly name: string; readonly parameters: QueryFunctionParameters };

const comparison = (operator: WebApiComparison): WebApiOperatorMapping => ({ kind: "comparison", operator });

const stringFunction = (name: WebApiStringFunction, negated: boolean): WebApiOperatorMapping => ({ kind: "string-function", name, negated });

const queryFunction = (name: string, parameters: QueryFunctionParameters): WebApiOperatorMapping => ({ kind: "query-function", name, parameters });

export const WEB_API_OPERATORS: Readonly<Record<string, WebApiOperatorMapping>> = {
	eq: comparison("eq"),
	ne: comparison("ne"),
	neq: comparison("ne"),
	gt: comparison("gt"),
	ge: comparison("ge"),
	lt: comparison("lt"),
	le: comparison("le"),
	null: { kind: "null", operator: "eq" },
	"not-null": { kind: "null", operator: "ne" },
	like: { kind: "like", negated: false },
	"not-like": { kind: "like", negated: true },
	"begins-with": stringFunction("startswith", false),
	"not-begin-with": stringFunction("startswith", true),
	"ends-with": stringFunction("endswith", false),
	"not-end-with": stringFunction("endswith", true),
	between: queryFunction("Between", "values"),
	"not-between": queryFunction("NotBetween", "values"),
	in: queryFunction("In", "values"),
	"not-in": queryFunction("NotIn", "values"),
	"contain-values": queryFunction("ContainValues", "values"),
	"not-contain-values": queryFunction("DoesNotContainValues", "values"),
	"eq-userid": queryFunction("EqualUserId", "none"),
	"ne-userid": queryFunction("NotEqualUserId", "none"),
	"eq-businessid": queryFunction("EqualBusinessId", "none"),
	"ne-businessid": queryFunction("NotEqualBusinessId", "none"),
	"eq-userteams": queryFunction("EqualUserTeams", "none"),
	"eq-useroruserteams": queryFunction("EqualUserOrUserTeams", "none"),
	"eq-useroruserhierarchy": queryFunction("EqualUserOrUserHierarchy", "none"),
	"eq-useroruserhierarchyandteams": queryFunction("EqualUserOrUserHierarchyAndTeams", "none"),
	"eq-userlanguage": queryFunction("EqualUserLanguage", "none"),
	above: queryFunction("Above", "value"),
	"eq-or-above": queryFunction("AboveOrEqual", "value"),
	under: queryFunction("Under", "value"),
	"eq-or-under": queryFunction("UnderOrEqual", "value"),
	"not-under": queryFunction("NotUnder", "value"),
	on: queryFunction("On", "value"),
	"on-or-after": queryFunction("OnOrAfter", "value"),
	"on-or-before": queryFunction("OnOrBefore", "value"),
	today: queryFunction("Today", "none"),
	yesterday: queryFunction("Yesterday", "none"),
	tomorrow: queryFunction("Tomorrow", "none"),
	"this-week": queryFunction("ThisWeek", "none"),
	"this-month": queryFunction("ThisMonth", "none"),
	"this-year": queryFunction("ThisYear", "none"),
	"last-seven-days": queryFunction("Last7Days", "none"),
	"last-week": queryFunction("LastWeek", "none"),
	"last-month": queryFunction("LastMonth", "none"),
	"last-year": queryFunction("LastYear", "none"),
	"next-seven-days": queryFunction("Next7Days", "none"),
	"next-week": queryFunction("NextWeek", "none"),
	"next-month": queryFunction("NextMonth", "none"),
	"next-year": queryFunction("NextYear", "none"),
	"last-x-hours": queryFunction("LastXHours", "integer"),
	"last-x-days": queryFunction("LastXDays", "integer"),
	"last-x-weeks": queryFunction("LastXWeeks", "integer"),
	"last-x-months": queryFunction("LastXMonths", "integer"),
	"last-x-years": queryFunction("LastXYears", "integer"),
	"next-x-hours": queryFunction("NextXHours", "integer"),
	"next-x-days": queryFunction("NextXDays", "integer"),
	"next-x-weeks": queryFunction("NextXWeeks", "integer"),
	"next-x-months": queryFunction("NextXMonths", "integer"),
	"next-x-years": queryFunction("NextXYears", "integer"),
	"olderthan-x-minutes": queryFunction("OlderThanXMinutes", "integer"),
	"olderthan-x-hours": queryFunction("OlderThanXHours", "integer"),
	"olderthan-x-days": queryFunction("OlderThanXDays", "integer"),
	"olderthan-x-weeks": queryFunction("OlderThanXWeeks", "integer"),
	"olderthan-x-months": queryFunction("OlderThanXMonths", "integer"),
	"olderthan-x-years": queryFunction("OlderThanXYears", "integer"),
	"this-fiscal-period": queryFunction("ThisFiscalPeriod", "none"),
	"this-fiscal-year": queryFunction("ThisFiscalYear", "none"),
	"last-fiscal-period": queryFunction("LastFiscalPeriod", "none"),
	"last-fiscal-year": queryFunction("LastFiscalYear", "none"),
	"next-fiscal-period": queryFunction("NextFiscalPeriod", "none"),
	"next-fiscal-year": queryFunction("NextFiscalYear", "none"),
	"last-x-fiscal-periods": queryFunction("LastXFiscalPeriods", "integer"),
	"last-x-fiscal-years": queryFunction("LastXFiscalYears", "integer"),
	"next-x-fiscal-periods": queryFunction("NextXFiscalPeriods", "integer"),
	"next-x-fiscal-years": queryFunction("NextXFiscalYears", "integer"),
	"in-fiscal-period": queryFunction("InFiscalPeriod", "integer"),
	"in-fiscal-year": queryFunction("InFiscalYear", "integer"),
	"in-fiscal-period-and-year": queryFunction("InFiscalPeriodAndYear", "integer-pair"),
	"in-or-after-fiscal-period-and-year": queryFunction("InOrAfterFiscalPeriodAndYear", "integer-pair"),
	"in-or-before-fiscal-period-and-year": queryFunction("InOrBeforeFiscalPeriodAndYear", "integer-pair"),
};

export const WEB_API_UNSUPPORTED_OPERATORS: Readonly<Record<string, string>> = {};

export const webApiOperator = (name: string): WebApiOperatorMapping | undefined =>
	Object.prototype.hasOwnProperty.call(WEB_API_OPERATORS, name) ? WEB_API_OPERATORS[name] : undefined;

export const webApiUnsupportedReason = (name: string): string | undefined =>
	Object.prototype.hasOwnProperty.call(WEB_API_UNSUPPORTED_OPERATORS, name) ? WEB_API_UNSUPPORTED_OPERATORS[name] : undefined;
