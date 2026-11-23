import { OPERATORS } from "./operators";

export type EnumerationValue = { readonly value: string; readonly description?: string };

export type AttributeValueKind =
	| { readonly kind: "enumeration"; readonly values: readonly EnumerationValue[]; readonly multiple: boolean }
	| { readonly kind: "number"; readonly minimum?: number; readonly maximum?: number }
	| { readonly kind: "boolean" | "text" | "table" | "column" | "alias" };

export type AttributeGroup = "main" | "more" | "legacy";

export type AttributeDefinition = {
	readonly name: string;
	readonly value: AttributeValueKind;
	readonly required: boolean;
	readonly description?: string;
	readonly group: AttributeGroup;
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

type AttributeOptions = {
	readonly description?: string;
	readonly required?: boolean;
	readonly group?: AttributeGroup;
	readonly documented?: boolean;
};

const attribute = (name: string, value: AttributeValueKind, options: AttributeOptions = {}): AttributeDefinition => ({
	name,
	value,
	required: options.required ?? false,
	...(options.description === undefined ? {} : { description: options.description }),
	group: options.group ?? (options.documented === false ? "legacy" : "more"),
	documented: options.documented ?? true,
});

const BOOLEAN: AttributeValueKind = { kind: "boolean" };
const TEXT: AttributeValueKind = { kind: "text" };
const TABLE: AttributeValueKind = { kind: "table" };
const COLUMN: AttributeValueKind = { kind: "column" };
const ALIAS: AttributeValueKind = { kind: "alias" };

const enumeration = (values: readonly (readonly [string, string?])[], multiple = false): AttributeValueKind => ({
	kind: "enumeration",
	values: values.map(([value, description]) => (description === undefined ? { value } : { value, description })),
	multiple,
});

const QUERY_OPTIONS = enumeration(
	[
		["ForceOrder", "Adds the SQL Server hint FORCE ORDER. Tables join in the written order."],
		["DisableRowGoal", "Adds the SQL Server hint DISABLE_OPTIMIZER_ROWGOAL."],
		["EnableOptimizerHotfixes", "Adds the SQL Server hint ENABLE_QUERY_OPTIMIZER_HOTFIXES."],
		["LoopJoin", "Adds the SQL Server hint LOOP JOIN."],
		["MergeJoin", "Adds the SQL Server hint MERGE JOIN."],
		["HashJoin", "Adds the SQL Server hint HASH JOIN."],
		["NO_PERFORMANCE_SPOOL"],
		["ENABLE_HIST_AMENDMENT_FOR_ASC_KEYS"],
	],
	true
);

const LINK_TYPES = enumeration([
	["inner", "Returns only Records with a match in both Tables. This is the default."],
	["outer", "Also returns parent Records that have no match."],
	["any", "In a filter: parent Records with one or more matches."],
	["not any", "In a filter: parent Records with no match."],
	["all", "In a filter: parent Records that have matches, and no match passes the link-entity filter."],
	["not all", "In a filter: the same as any."],
	["exists", "Same as inner, but uses EXISTS. Parent Records do not repeat."],
	["in", "Same as inner, but uses IN. Parent Records do not repeat."],
	["matchfirstrowusingcrossapply", "Same as inner, but joins only the first match. Parent Records do not repeat."],
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
		description: "The root element of a Query.",
		text: false,
		children: [{ name: "entity", max: 1 }],
		attributes: [
			attribute("top", { kind: "number", minimum: 1, maximum: 5000 }, { group: "main" }),
			attribute("count", { kind: "number", minimum: 1 }),
			attribute("page", { kind: "number", minimum: 1 }),
			attribute("paging-cookie", TEXT, { description: "The paging cookie from the previous page. It makes the next page faster." }),
			attribute("distinct", BOOLEAN, { group: "main" }),
			attribute("aggregate", BOOLEAN, { group: "main" }),
			attribute(
				"aggregatelimit",
				{ kind: "number", minimum: 1, maximum: 50000 },
				{ description: "Sets a Record limit for an aggregate Query that is lower than 50,000." }
			),
			attribute("returntotalrecordcount", BOOLEAN, { group: "main", description: "Also returns the total number of matching Records." }),
			attribute(
				"datasource",
				enumeration([
					["retained", "Records in long-term retention."],
					["bin", "Deleted Records that you can restore."],
				]),
				{ description: "Reads retained or deleted Records. Does not read live data." }
			),
			attribute("latematerialize", BOOLEAN, { description: "Runs the Query in smaller parts to make some slow Queries faster." }),
			attribute("no-lock", BOOLEAN, { group: "legacy", description: "Legacy. It is not necessary now." }),
			attribute("options", QUERY_OPTIONS, { description: "SQL Server hints. Use them only if Microsoft Support tells you to." }),
			attribute("useraworderby", BOOLEAN, { description: "Sorts Choice Columns by their number, not by their label." }),
			attribute("version", TEXT, { documented: false }),
			attribute("mapping", enumeration([["logical", "Names are logical names."]]), { documented: false }),
		],
	},
	{
		name: "entity",
		description: "The Table that the Query reads Records from.",
		text: false,
		children: ENTITY_CHILDREN,
		attributes: [attribute("name", TABLE, { required: true, group: "main" })],
	},
	{
		name: "all-attributes",
		description: "Returns all Columns of the Table.",
		text: false,
		children: [],
		attributes: [],
	},
	{
		name: "attribute",
		description: "A Column to return.",
		text: false,
		children: [],
		attributes: [
			attribute("name", COLUMN, { required: true, group: "main" }),
			attribute("alias", TEXT, { group: "main" }),
			attribute(
				"aggregate",
				enumeration([
					["avg", "The average of the values that are not empty."],
					["count", "The number of Records."],
					["countcolumn", "The number of Records with a value in this Column."],
					["max", "The largest value."],
					["min", "The smallest value."],
					["sum", "The total of the values that are not empty."],
				])
			),
			attribute("groupby", BOOLEAN),
			attribute("distinct", BOOLEAN, { description: "With countcolumn, counts each value one time." }),
			attribute(
				"dategrouping",
				enumeration([
					["day", "The day of the month."],
					["week", "The week of the year."],
					["month", "The month of the year."],
					["quarter", "The quarter of the fiscal year."],
					["year"],
					["fiscal-period", "The period of the fiscal year."],
					["fiscal-year"],
				])
			),
			attribute("usertimezone", BOOLEAN, { description: "If false, groups dates by UTC, not by the time zone of the user." }),
			attribute("rowaggregate", enumeration([["CountChildren"]]), { description: "Adds the number of child Records in the hierarchy to each Record." }),
		],
	},
	{
		name: "order",
		description: "Sorts the Records by a Column.",
		text: false,
		children: [],
		attributes: [
			attribute("attribute", COLUMN, { group: "main" }),
			attribute("alias", ALIAS, { description: "Sorts by the attribute that has this alias." }),
			attribute("descending", BOOLEAN, { group: "main" }),
			attribute("entityname", ALIAS, { description: "Sorts by a Column of the link-entity that has this alias." }),
		],
	},
	{
		name: "filter",
		description: "Joins conditions with AND or OR.",
		text: false,
		children: [{ name: "condition", max: 500 }, { name: "filter" }, { name: "link-entity" }],
		attributes: [
			attribute(
				"type",
				enumeration([
					["and", "All conditions are true."],
					["or", "One or more conditions are true."],
				]),
				{ group: "main" }
			),
			attribute("hint", enumeration([["union", "Runs the filter as a UNION of separate Queries."]]), {
				description: "Set to union to make an OR filter on Columns of different Tables faster.",
			}),
			attribute("isquickfindfields", BOOLEAN, { group: "legacy", description: "Runs the filter as a quick find search." }),
			attribute("overridequickfindrecordlimitenabled", BOOLEAN, {
				group: "legacy",
				description: "Applies the quick find Record limit, also if the Environment turns the limit off.",
			}),
			attribute("overridequickfindrecordlimitdisabled", BOOLEAN, {
				group: "legacy",
				description: "Ignores the quick find Record limit, also if the Environment turns the limit on.",
			}),
		],
	},
	{
		name: "condition",
		description: "Tests the value of one Column.",
		text: false,
		children: [{ name: "value" }],
		attributes: [
			attribute("attribute", COLUMN, { group: "main" }),
			attribute("operator", enumeration(OPERATORS.map((definition) => [definition.name, definition.meaning] as const)), {
				required: true,
				group: "main",
			}),
			attribute("value", TEXT, { group: "main" }),
			attribute("valueof", COLUMN, { group: "main", description: "Compares with another Column of the same Record." }),
			attribute("entityname", ALIAS, { description: "Tests a Column of the link-entity that has this name or alias." }),
			attribute("uiname", TEXT, { documented: false, description: "The name of the Record in value. Saved views write it." }),
			attribute("uitype", TABLE, { documented: false, description: "The Table of the Record in value. Saved views write it." }),
		],
	},
	{
		name: "value",
		description: "One value for an operator that takes more than one value, such as in.",
		text: true,
		children: [],
		attributes: [],
	},
	{
		name: "link-entity",
		description: "Joins a related Table.",
		text: false,
		children: ENTITY_CHILDREN,
		attributes: [
			attribute("name", TABLE, { required: true, group: "main" }),
			attribute("from", COLUMN, { group: "main" }),
			attribute("to", COLUMN, { group: "main" }),
			attribute("alias", TEXT, { group: "main" }),
			attribute("link-type", LINK_TYPES, { group: "main" }),
			attribute("intersect", BOOLEAN, { description: "Marks a join that returns no Columns, such as a many-to-many intersect Table." }),
			attribute("visible", BOOLEAN, { documented: false }),
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
