import { OPERATORS } from "./operators";

export type EnumerationValue = { readonly value: string; readonly description: string };

export type AttributeValueKind =
	| { readonly kind: "enumeration"; readonly values: readonly EnumerationValue[]; readonly multiple: boolean }
	| { readonly kind: "number"; readonly minimum?: number; readonly maximum?: number }
	| { readonly kind: "boolean" | "text" | "table" | "column" | "alias" };

export type AttributeDefinition = {
	readonly name: string;
	readonly value: AttributeValueKind;
	readonly required: boolean;
	readonly description: string;
	readonly common: boolean;
	readonly documented: boolean;
};

export type ChildRule = { readonly name: string; readonly max?: number };

export type ElementDefinition = {
	readonly name: string;
	readonly description: string;
	readonly attributes: readonly AttributeDefinition[];
	readonly children: readonly ChildRule[];
	readonly parents: readonly string[];
	readonly text: boolean;
};

type AttributeOptions = { readonly required?: boolean; readonly common?: boolean; readonly documented?: boolean };

const attribute = (name: string, value: AttributeValueKind, description: string, options: AttributeOptions = {}): AttributeDefinition => ({
	name,
	value,
	required: options.required ?? false,
	description,
	common: options.common ?? false,
	documented: options.documented ?? true,
});

const BOOLEAN: AttributeValueKind = { kind: "boolean" };
const TEXT: AttributeValueKind = { kind: "text" };
const TABLE: AttributeValueKind = { kind: "table" };
const COLUMN: AttributeValueKind = { kind: "column" };
const ALIAS: AttributeValueKind = { kind: "alias" };

const enumeration = (values: readonly (readonly [string, string])[], multiple = false): AttributeValueKind => ({
	kind: "enumeration",
	values: values.map(([value, description]) => ({ value, description })),
	multiple,
});

const QUERY_OPTIONS = enumeration(
	[
		["ForceOrder", "SQL Server FORCE ORDER hint: join tables in the order written."],
		["DisableRowGoal", "SQL Server DISABLE_OPTIMIZER_ROWGOAL hint."],
		["EnableOptimizerHotfixes", "SQL Server ENABLE_QUERY_OPTIMIZER_HOTFIXES hint."],
		["LoopJoin", "SQL Server LOOP JOIN hint."],
		["MergeJoin", "SQL Server MERGE JOIN hint."],
		["HashJoin", "SQL Server HASH JOIN hint."],
		["NO_PERFORMANCE_SPOOL", "SQL Server NO_PERFORMANCE_SPOOL hint."],
		["ENABLE_HIST_AMENDMENT_FOR_ASC_KEYS", "SQL Server ENABLE_HIST_AMENDMENT_FOR_ASC_KEYS hint."],
	],
	true
);

const LINK_TYPES = enumeration([
	["inner", "Only rows with a match in both tables; the default."],
	["outer", "Also parent rows with no match in the joined table."],
	["any", "Inside a filter: parent rows with at least one matching row."],
	["not any", "Inside a filter: parent rows with no matching row."],
	["all", "Inside a filter: parent rows that have matching rows, none of which meet this link-entity's filter."],
	["not all", "Inside a filter: parent rows with at least one matching row, the same as any."],
	["exists", "Like inner, written as EXISTS, so parent rows are not repeated."],
	["in", "Like inner, written as IN, so parent rows are not repeated."],
	["matchfirstrowusingcrossapply", "Like inner, joining only the first matching row, so parent rows are not repeated."],
]);

const ENTITY_CHILDREN: readonly ChildRule[] = [
	{ name: "all-attributes", max: 1 },
	{ name: "attribute" },
	{ name: "order" },
	{ name: "filter", max: 1 },
	{ name: "link-entity" },
];

type ElementSource = Omit<ElementDefinition, "parents">;

const SOURCES: readonly ElementSource[] = [
	{
		name: "fetch",
		description: "The root of a query, holding its paging, aggregate and option settings.",
		text: false,
		children: [{ name: "entity", max: 1 }],
		attributes: [
			attribute(
				"top",
				{ kind: "number", minimum: 1, maximum: 5000 },
				"Returns at most this many rows; not used with page, count or returntotalrecordcount.",
				{
					common: true,
				}
			),
			attribute("count", { kind: "number", minimum: 1 }, "Number of rows in each page."),
			attribute("page", { kind: "number", minimum: 1 }, "Page number to return, starting at 1."),
			attribute("paging-cookie", TEXT, "Cookie returned with the previous page, which makes fetching the next page faster."),
			attribute("distinct", BOOLEAN, "Leaves duplicate rows out of the results.", { common: true }),
			attribute("aggregate", BOOLEAN, "Returns aggregate values instead of rows.", { common: true }),
			attribute("aggregatelimit", { kind: "number", minimum: 1, maximum: 50000 }, "Lowers the 50,000-row limit for an aggregate query."),
			attribute("returntotalrecordcount", BOOLEAN, "Also returns the total number of rows that match the query."),
			attribute(
				"datasource",
				enumeration([
					["retained", "Only rows moved to long-term data retention."],
					["bin", "Only deleted rows that can still be restored."],
				]),
				"Reads retained or deleted rows instead of live ones."
			),
			attribute("latematerialize", BOOLEAN, "Splits the query into smaller parts and reassembles the results, which can speed up some slow queries."),
			attribute("no-lock", BOOLEAN, "Legacy setting that avoided shared locks; no longer needed."),
			attribute("options", QUERY_OPTIONS, "Comma-separated SQL Server hints, to use only when Microsoft support recommends them."),
			attribute("useraworderby", BOOLEAN, "Sorts Choice columns by their stored number instead of their label."),
			attribute("version", TEXT, "Schema version written by saved views, usually 1.0.", { documented: false }),
			attribute("mapping", enumeration([["logical", "Names are logical names."]]), "Name mapping written by saved views, always logical.", {
				documented: false,
			}),
		],
	},
	{
		name: "entity",
		description: "The table the query returns rows from.",
		text: false,
		children: ENTITY_CHILDREN,
		attributes: [attribute("name", TABLE, "Logical name of the table the query returns rows from.", { required: true, common: true })],
	},
	{
		name: "all-attributes",
		description: "Returns every column of the table.",
		text: false,
		children: [],
		attributes: [],
	},
	{
		name: "attribute",
		description: "A column to return.",
		text: false,
		children: [],
		attributes: [
			attribute("name", COLUMN, "Logical name of the column to return.", { required: true, common: true }),
			attribute("alias", TEXT, "Name the column is returned under; aggregate values need one.", { common: true }),
			attribute(
				"aggregate",
				enumeration([
					["avg", "Average of the values that have data."],
					["count", "Number of rows."],
					["countcolumn", "Number of rows with a value in this column."],
					["max", "Largest value in the column."],
					["min", "Smallest value in the column."],
					["sum", "Total of the values that have data."],
				]),
				"Aggregate function to apply in an aggregate query.",
				{ common: true }
			),
			attribute("groupby", BOOLEAN, "Groups the aggregate results by this column.", { common: true }),
			attribute("distinct", BOOLEAN, "With countcolumn, counts each distinct value once."),
			attribute(
				"dategrouping",
				enumeration([
					["day", "Day of the month."],
					["week", "Week of the year."],
					["month", "Month of the year."],
					["quarter", "Quarter of the fiscal year."],
					["year", "Year."],
					["fiscal-period", "Period of the fiscal year."],
					["fiscal-year", "Fiscal year."],
				]),
				"Part of the date to group by when grouping on a date column."
			),
			attribute("usertimezone", BOOLEAN, "Set to false to group dates by their UTC value instead of the user's time zone."),
			attribute(
				"rowaggregate",
				enumeration([["CountChildren", "Number of rows below this one in its hierarchy."]]),
				"Adds the number of hierarchical child rows to each row."
			),
		],
	},
	{
		name: "order",
		description: "A sort; with several, rows sort by the first, then the next.",
		text: false,
		children: [],
		attributes: [
			attribute("attribute", COLUMN, "Column to sort by; aggregate queries sort by alias instead.", { common: true }),
			attribute("alias", ALIAS, "Alias of an attribute to sort by, used in aggregate queries.", { common: true }),
			attribute("descending", BOOLEAN, "Sorts from highest to lowest.", { common: true }),
			attribute("entityname", ALIAS, "Alias of a link-entity whose column this entity-level order sorts by, so it is not applied last."),
		],
	},
	{
		name: "filter",
		description: "A group of conditions combined with and or or.",
		text: false,
		children: [{ name: "condition", max: 500 }, { name: "filter" }, { name: "link-entity" }],
		attributes: [
			attribute(
				"type",
				enumeration([
					["and", "Every condition must match."],
					["or", "At least one condition must match."],
				]),
				"Whether all or any of the conditions must match; and when left out.",
				{ common: true }
			),
			attribute(
				"hint",
				enumeration([["union", "Run the filter as a union of separate queries."]]),
				"Set to union to speed up an or filter over columns of different tables."
			),
			attribute("isquickfindfields", BOOLEAN, "Runs the filter as a quick find query."),
			attribute("overridequickfindrecordlimitenabled", BOOLEAN, "Applies the quick find record limit even when the environment has it turned off."),
			attribute("overridequickfindrecordlimitdisabled", BOOLEAN, "Bypasses the quick find record limit even when the environment has it turned on."),
		],
	},
	{
		name: "condition",
		description: "A test on one column's value.",
		text: false,
		children: [{ name: "value" }],
		attributes: [
			attribute("attribute", COLUMN, "Column whose value is tested.", { common: true }),
			attribute(
				"operator",
				enumeration(OPERATORS.map((definition) => [definition.name, definition.meaning] as const)),
				"How the column is compared with the value.",
				{ required: true, common: true }
			),
			attribute("value", TEXT, "Value to compare with, for operators that take one value.", { common: true }),
			attribute("valueof", COLUMN, "Column of the same row to compare with instead of a fixed value.", { common: true }),
			attribute("entityname", ALIAS, "Name or alias of the link-entity the condition tests, applied after an outer join."),
			attribute("uiname", TEXT, "Display name of the record in value, written by saved views for lookup conditions.", { documented: false }),
			attribute("uitype", TABLE, "Table of the record in value, written by saved views for lookup conditions.", { documented: false }),
		],
	},
	{
		name: "value",
		description: "One value of a condition whose operator takes several, such as in or between.",
		text: true,
		children: [],
		attributes: [],
	},
	{
		name: "link-entity",
		description: "A join to a related table.",
		text: false,
		children: ENTITY_CHILDREN,
		attributes: [
			attribute("name", TABLE, "Logical name of the table to join.", { required: true, common: true }),
			attribute("from", COLUMN, "Column of the joined table that matches the to column.", { common: true }),
			attribute("to", COLUMN, "Column of the parent entity or link-entity that matches the from column.", { common: true }),
			attribute("alias", TEXT, "Name for the join, used to refer to it and to prefix its columns in the results.", { common: true }),
			attribute("link-type", LINK_TYPES, "How the join limits the rows returned; inner when left out.", { common: true }),
			attribute("intersect", BOOLEAN, "Marks a join that returns no columns, such as the intersect table of a many-to-many relationship."),
			attribute("visible", BOOLEAN, "Legacy flag written by saved views; not in the current reference.", { documented: false }),
		],
	},
];

export const ELEMENTS: readonly ElementDefinition[] = SOURCES.map((source) => ({
	...source,
	parents: SOURCES.filter((candidate) => candidate.children.some((child) => child.name === source.name)).map((candidate) => candidate.name),
}));

const BY_NAME = new Map(ELEMENTS.map((definition) => [definition.name, definition]));

export const elementDefinition = (name: string): ElementDefinition | undefined => BY_NAME.get(name);

export const isKnownElement = (name: string): boolean => BY_NAME.has(name);

export const attributesOf = (element: string): readonly AttributeDefinition[] => BY_NAME.get(element)?.attributes ?? [];

export const attributeDefinition = (element: string, name: string): AttributeDefinition | undefined =>
	attributesOf(element).find((definition) => definition.name === name);

export const childrenOf = (element: string): readonly string[] => BY_NAME.get(element)?.children.map((child) => child.name) ?? [];

export const isValidChild = (parent: string, child: string): boolean => childrenOf(parent).includes(child);
