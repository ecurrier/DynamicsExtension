import type { QueryColumn, QueryTable } from "@/shared/types";

import { attributeValue, columnOf, columnTableAt, linkEntityFor, type QueryMetadata, type TableLookup } from "./metadata";
import { type FetchXmlDocument, type NodePath, type XmlElement } from "./types";
import { type WebApiOperatorMapping, webApiOperator, webApiUnsupportedReason } from "./webApiOperators";

export type WebApiWarning = { readonly message: string; readonly path: NodePath; readonly attribute?: string };

export type WebApiQueryOptions = {
	readonly select: string | null;
	readonly filter: string | null;
	readonly orderby: string | null;
	readonly top: number | null;
	readonly expand: string | null;
	readonly count: boolean;
	readonly apply: string | null;
};

export type WebApiConversion = {
	readonly path: string | null;
	readonly entitySetName: string | null;
	readonly options: WebApiQueryOptions;
	readonly warnings: readonly WebApiWarning[];
};

type Located = { readonly element: XmlElement; readonly path: NodePath };

type Context = {
	readonly document: FetchXmlDocument;
	readonly metadata: QueryMetadata;
	readonly warnings: WebApiWarning[];
	readonly rawOrder: boolean;
};

type Scope = {
	readonly tableName: string | null;
	readonly lookup: TableLookup | null;
	readonly prefix: string;
	readonly inPath: boolean;
	readonly variables: readonly string[];
	readonly root: boolean;
};

type Expression = { readonly text: string; readonly compound: boolean };

type LinkPlan =
	| { readonly kind: "many-to-one"; readonly navigation: string; readonly lookupColumn: string }
	| { readonly kind: "one-to-many"; readonly navigation: string }
	| { readonly kind: "unmatched" };

type ExpandNode = {
	readonly navigation: string;
	readonly label: string;
	readonly collection: boolean;
	readonly select: readonly string[] | null;
	readonly filter: string | null;
	readonly orderby: readonly string[];
	readonly children: readonly ExpandNode[];
	readonly path: NodePath;
};

type ColumnInfo = { readonly column: QueryColumn | null; readonly reason: string | null };

type Literal = { readonly text: string; readonly problem: string | null };

const NO_OPTIONS: WebApiQueryOptions = { select: null, filter: null, orderby: null, top: null, expand: null, count: false, apply: null };

const LINK_TYPES = ["inner", "outer", "any", "not any", "all", "not all", "exists", "in", "matchfirstrowusingcrossapply"];

const FILTER_LINK_TYPES = ["any", "not any", "all", "not all"];

const ENTITY_CHILDREN = ["all-attributes", "attribute", "order", "filter", "link-entity"];

const CHOICE_TYPES = ["choice", "multiChoice", "stateOrStatus"];

const AGGREGATE_FUNCTIONS: Readonly<Record<string, string>> = { sum: "sum", avg: "average", min: "min", max: "max" };

const MAX_EXPANDS = 15;

const GUID = /^\{?([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\}?$/;
const NUMBER = /^-?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;
const INTEGER = /^-?\d+$/;
const DATE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const UNSAFE_IN_QUERY = /[%&+#\u0000-\u001f\u007f]/g;

const key = (value: string): string => value.trim().toLowerCase();

const present = (element: XmlElement, name: string): string | undefined => {
	const value = attributeValue(element, name);
	return value === undefined || value.trim() === "" ? undefined : value.trim();
};

const isTrue = (value: string | undefined): boolean => value !== undefined && ["true", "1"].includes(value.trim().toLowerCase());

const childElements = (at: Located): readonly Located[] =>
	at.element.children.flatMap((child, index) => (child.kind === "element" && !child.switchedOff ? [{ element: child, path: [...at.path, index] }] : []));

const childrenNamed = (at: Located, name: string): readonly Located[] => childElements(at).filter((child) => child.element.name === name);

const warn = (context: Context, message: string, path: NodePath, attribute?: string): void => {
	context.warnings.push({ message, path, ...(attribute === undefined ? {} : { attribute }) });
};

const unique = (warnings: readonly WebApiWarning[]): readonly WebApiWarning[] => {
	const seen = new Set<string>();
	return warnings.filter((warning) => {
		const id = `${warning.path.join("/")}|${warning.attribute ?? ""}|${warning.message}`;
		if (seen.has(id)) {
			return false;
		}
		seen.add(id);
		return true;
	});
};

const linkLabel = (element: XmlElement): string => `link-entity ${present(element, "alias") ?? present(element, "name") ?? "(unnamed)"}`;

const quoted = (value: string): string => `'${value.replace(/'/g, "''")}'`;

const bareGuid = (value: string): string => GUID.exec(value.trim())?.[1] ?? value.trim();

const loadedTable = (lookup: TableLookup | null): QueryTable | null => (lookup?.state === "loaded" ? lookup.table : null);

const tableScope = (context: Context, tableName: string | undefined, prefix: string, inPath: boolean, variables: readonly string[]): Scope => ({
	tableName: tableName ?? null,
	lookup: tableName === undefined ? null : context.metadata(tableName),
	prefix,
	inPath,
	variables,
	root: false,
});

const combine = (parts: readonly Expression[], joiner: "and" | "or"): Expression | null => {
	if (parts.length === 0) {
		return null;
	}
	if (parts.length === 1) {
		return parts[0] ?? null;
	}
	return { text: parts.map((part) => (part.compound ? `(${part.text})` : part.text)).join(` ${joiner} `), compound: true };
};

const negate = (expression: Expression): Expression => ({
	text: expression.compound ? `not (${expression.text})` : `not ${expression.text}`,
	compound: false,
});

const resolveColumn = (scope: Scope, name: string): ColumnInfo => {
	const tableName = scope.tableName;
	if (scope.lookup === null || tableName === null) {
		return { column: null, reason: "the Table that owns it is not known" };
	}
	if (scope.lookup.state === "pending") {
		return { column: null, reason: `the metadata for Table ${tableName} has not loaded yet` };
	}
	if (scope.lookup.state === "missing") {
		return { column: null, reason: `Table ${tableName} does not exist in this Environment` };
	}
	const column = columnOf(scope.lookup.table, name);
	if (!column) {
		return { column: null, reason: `Table ${tableName} has no Column ${name}` };
	}
	return column.columnType === null ? { column, reason: `the type of Column ${name} is not one the converter knows` } : { column, reason: null };
};

const propertyOf = (column: QueryColumn | null, name: string): string =>
	column && (column.columnType === "lookup" || column.columnType === "owner") ? `_${column.logicalName}_value` : (column?.logicalName ?? name.trim());

const guessedLiteral = (raw: string): string => {
	const value = raw.trim();
	const guid = GUID.exec(value);
	if (guid?.[1]) {
		return guid[1];
	}
	if (NUMBER.test(value)) {
		return value;
	}
	if (["true", "false"].includes(value.toLowerCase())) {
		return value.toLowerCase();
	}
	return DATE.test(value) ? value.replace(" ", "T") : quoted(raw);
};

const typedLiteral = (raw: string, column: QueryColumn): Literal => {
	const value = raw.trim();
	switch (column.columnType) {
		case "wholeNumber":
		case "decimalOrMoney":
		case "choice":
		case "stateOrStatus":
			return NUMBER.test(value) ? { text: value, problem: null } : { text: quoted(raw), problem: "is not a number" };
		case "yesNo":
			if (["1", "true"].includes(value.toLowerCase())) {
				return { text: "true", problem: null };
			}
			return ["0", "false"].includes(value.toLowerCase())
				? { text: "false", problem: null }
				: { text: quoted(raw), problem: "is not 0, 1, true or false" };
		case "dateTime":
			return DATE.test(value)
				? { text: value.replace(" ", "T"), problem: null }
				: { text: quoted(raw), problem: "is not an ISO date such as 2024-01-31 or 2024-01-31T09:00:00Z" };
		case "lookup":
		case "owner":
		case "uniqueIdentifier": {
			const guid = GUID.exec(value)?.[1];
			return guid ? { text: guid, problem: null } : { text: quoted(raw), problem: "is not a GUID" };
		}
		case "multiChoice":
			return { text: quoted(value), problem: null };
		default:
			return { text: quoted(raw), problem: null };
	}
};

const valuesOf = (element: XmlElement): readonly string[] => {
	const value = attributeValue(element, "value");
	if (value !== undefined) {
		return [value];
	}
	return element.children.flatMap((child) =>
		child.kind === "element" && !child.switchedOff && child.name === "value"
			? [
					child.children
						.map((text) => (text.kind === "text" ? text.value : ""))
						.join("")
						.trim(),
				]
			: []
	);
};

const likeExpression = (property: string, pattern: string, negated: boolean): Expression | null => {
	const leading = pattern.startsWith("%");
	const trailing = pattern.length > 1 && pattern.endsWith("%");
	const middle = pattern.slice(leading ? 1 : 0, trailing ? -1 : undefined);
	if (middle === "") {
		return { text: `${property} ${negated ? "eq" : "ne"} null`, compound: false };
	}
	const call = (name: string): Expression => ({ text: `${negated ? "not " : ""}${name}(${property},${quoted(middle)})`, compound: false });
	if (leading && trailing) {
		return call("contains");
	}
	if (leading) {
		return call("endswith");
	}
	if (trailing) {
		return call("startswith");
	}
	return /[%_[]/.test(middle) ? null : { text: `${property} ${negated ? "ne" : "eq"} ${quoted(middle)}`, compound: false };
};

const lambdaVariable = (tableName: string, used: readonly string[]): string => {
	const letter = /[a-z]/.exec(tableName.toLowerCase())?.[0] ?? "x";
	if (!used.includes(letter)) {
		return letter;
	}
	const free = Array.from({ length: used.length + 1 }, (_, index) => `${letter}${index + 2}`).find((candidate) => !used.includes(candidate));
	return free ?? `${letter}${used.length + 2}`;
};

const linkTypeOf = (context: Context, at: Located): string | null => {
	const type = key(present(at.element, "link-type") ?? "inner");
	if (LINK_TYPES.includes(type)) {
		return type;
	}
	warn(context, `${linkLabel(at.element)} has link-type ${type}, which has no Web API equivalent, so it is left out.`, at.path, "link-type");
	return null;
};

const planOf = (context: Context, at: Located): LinkPlan => {
	const label = linkLabel(at.element);
	const name = present(at.element, "name");
	if (name === undefined) {
		warn(context, `${label} has no name, so it is left out.`, at.path, "name");
		return { kind: "unmatched" };
	}
	const parent = columnTableAt(context.document, at.path, "to");
	if (parent.kind !== "table") {
		warn(context, `The Table that ${label} joins from is not named, so it is left out.`, at.path);
		return { kind: "unmatched" };
	}
	const lookup = context.metadata(parent.tableLogicalName);
	if (lookup.state === "pending") {
		warn(
			context,
			`The relationships of Table ${parent.tableLogicalName} have not loaded yet, so ${label} cannot be matched to a navigation property and is left out.`,
			at.path
		);
		return { kind: "unmatched" };
	}
	if (lookup.state === "missing") {
		warn(context, `Table ${parent.tableLogicalName} does not exist in this Environment, so ${label} is left out.`, at.path);
		return { kind: "unmatched" };
	}
	const from = present(at.element, "from");
	const to = present(at.element, "to");
	if (from === undefined || to === undefined) {
		warn(context, `${label} does not set both from and to, so it cannot be matched to a relationship and is left out; name both Columns.`, at.path);
		return { kind: "unmatched" };
	}
	const table = lookup.table;
	const manyToOne = table.manyToOne.find(
		(relationship) =>
			key(relationship.lookupColumn) === key(to) && key(relationship.referencedTable) === key(name) && key(relationship.referencedColumn) === key(from)
	);
	const oneToMany = table.oneToMany.find(
		(relationship) =>
			key(relationship.referencedColumn) === key(to) &&
			key(relationship.referencingTable) === key(name) &&
			key(relationship.referencingColumn) === key(from)
	);
	const relationship = manyToOne ?? oneToMany;
	if (relationship && !relationship.navigationProperty) {
		warn(context, `The relationship ${relationship.schemaName} has no navigation property, so ${label} is left out.`, at.path);
		return { kind: "unmatched" };
	}
	if (manyToOne?.navigationProperty) {
		return { kind: "many-to-one", navigation: manyToOne.navigationProperty, lookupColumn: manyToOne.lookupColumn };
	}
	if (oneToMany?.navigationProperty) {
		return { kind: "one-to-many", navigation: oneToMany.navigationProperty };
	}
	if (table.manyToMany.some((candidate) => key(candidate.intersectTable) === key(name))) {
		warn(
			context,
			`${label} joins ${name}, the intersect Table of a many-to-many relationship; the converter does not produce many-to-many joins, so it and the link-entity elements inside it are left out.`,
			at.path
		);
		return { kind: "unmatched" };
	}
	warn(
		context,
		`${label} (from ${from} to ${to}) matches no relationship of Table ${parent.tableLogicalName}, so it is a custom join the Web API cannot express and is left out.`,
		at.path
	);
	return { kind: "unmatched" };
};

const entityNameScope = (context: Context, at: Located, scope: Scope, entityName: string): Scope | null => {
	if (!scope.root) {
		warn(context, `entityname is only converted on conditions in the entity's own filter, so this condition is left out.`, at.path, "entityname");
		return null;
	}
	const link = linkEntityFor(context.document, entityName);
	if (!link) {
		warn(context, `The entityname ${entityName} does not name a link-entity, so this condition is left out.`, at.path, "entityname");
		return null;
	}
	const navigations: string[] = [];
	for (let depth = 1; depth <= link.path.length; depth += 1) {
		const located = elementAt(context.document, link.path.slice(0, depth));
		if (!located || located.element.name === "filter") {
			warn(context, `The entityname ${entityName} names a link-entity inside a filter, so this condition is left out.`, at.path, "entityname");
			return null;
		}
		if (located.element.name !== "link-entity") {
			continue;
		}
		const plan = planOf(context, located);
		if (plan.kind === "unmatched") {
			return null;
		}
		if (plan.kind === "one-to-many") {
			warn(
				context,
				`The entityname ${entityName} reaches a one-to-many link-entity; the Web API cannot test its Columns from the entity's filter, so this condition is left out. Use a link-entity with link-type any or not any inside the filter instead.`,
				at.path,
				"entityname"
			);
			return null;
		}
		navigations.push(plan.navigation);
	}
	return tableScope(context, link.tableLogicalName ?? undefined, `${navigations.join("/")}/`, true, scope.variables);
};

const elementAt = (document: FetchXmlDocument, path: NodePath): Located | null => {
	const element = path.reduce<XmlElement | null>((current, index) => {
		const child = current?.children[index];
		return child?.kind === "element" ? child : null;
	}, document.root);
	return element ? { element, path } : null;
};

const literalFor = (context: Context, at: Located, raw: string, info: ColumnInfo, attribute: string): string => {
	if (info.column === null || info.reason !== null) {
		warn(
			context,
			`The value of this condition could not be typed because ${info.reason ?? "its Column is not known"}, so it is written as a best guess.`,
			at.path,
			"value"
		);
		return guessedLiteral(raw);
	}
	const literal = typedLiteral(raw, info.column);
	if (literal.problem !== null) {
		warn(context, `The value "${raw}" ${literal.problem}, which ${attribute} expects, so it is written as a quoted string.`, at.path, "value");
	}
	return literal.text;
};

const queryFunctionExpression = (
	context: Context,
	at: Located,
	mapping: Extract<WebApiOperatorMapping, { kind: "query-function" }>,
	operator: string,
	propertyName: string,
	values: readonly string[]
): Expression | null => {
	const call = (parameters: string): Expression => ({
		text: `Microsoft.Dynamics.CRM.${mapping.name}(PropertyName=${quoted(propertyName)}${parameters})`,
		compound: false,
	});
	switch (mapping.parameters) {
		case "none":
			return call("");
		case "value": {
			const value = values[0];
			if (value === undefined) {
				warn(context, `The operator ${operator} needs a value, so this condition is left out.`, at.path, "value");
				return null;
			}
			return call(`,PropertyValue=${quoted(GUID.test(value.trim()) ? bareGuid(value) : value.trim())}`);
		}
		case "integer": {
			const value = values[0]?.trim();
			if (value === undefined || !INTEGER.test(value)) {
				warn(
					context,
					`The operator ${operator} takes a whole number, and "${value ?? ""}" is not one, so this condition is left out.`,
					at.path,
					"value"
				);
				return null;
			}
			return call(`,PropertyValue=${value}`);
		}
		case "values": {
			if (values.length === 0 || (["between", "not-between"].includes(operator) && values.length !== 2)) {
				warn(
					context,
					`The operator ${operator} needs ${["between", "not-between"].includes(operator) ? "two value elements" : "at least one value"}, so this condition is left out.`,
					at.path
				);
				return null;
			}
			return call(`,PropertyValues=[${values.map((value) => JSON.stringify(bareGuid(value))).join(",")}]`);
		}
		case "integer-pair": {
			const [first, second] = values.map((value) => value.trim());
			if (values.length !== 2 || first === undefined || second === undefined || !INTEGER.test(first) || !INTEGER.test(second)) {
				warn(context, `The operator ${operator} needs two whole-number value elements, a period and a year, so this condition is left out.`, at.path);
				return null;
			}
			return call(`,PropertyValue1=${first},PropertyValue2=${second}`);
		}
	}
};

const conditionExpression = (context: Context, at: Located, scope: Scope): Expression | null => {
	const operator = present(at.element, "operator");
	if (operator === undefined) {
		warn(context, "This condition has no operator, so it is left out.", at.path, "operator");
		return null;
	}
	const unsupported = webApiUnsupportedReason(operator);
	if (unsupported !== undefined) {
		warn(context, `The operator ${operator} has no Web API equivalent (${unsupported}), so this condition is left out.`, at.path, "operator");
		return null;
	}
	const mapping = webApiOperator(operator);
	if (!mapping) {
		warn(context, `The operator ${operator} is not recognised, so this condition is left out.`, at.path, "operator");
		return null;
	}
	const attribute = present(at.element, "attribute");
	if (attribute === undefined) {
		warn(context, "This condition has no attribute, so it is left out.", at.path, "attribute");
		return null;
	}
	const entityName = present(at.element, "entityname");
	const target = entityName === undefined ? scope : entityNameScope(context, at, scope, entityName);
	if (!target) {
		return null;
	}
	const info = resolveColumn(target, attribute);
	const property = `${target.prefix}${propertyOf(info.column, attribute)}`;
	const valueof = present(at.element, "valueof");
	if (valueof !== undefined) {
		if (mapping.kind !== "comparison") {
			warn(context, `valueof is only converted with eq, ne, gt, ge, lt and le; with ${operator} this condition is left out.`, at.path, "valueof");
			return null;
		}
		if (valueof.includes(".")) {
			warn(
				context,
				`valueof ${valueof} names a Column of a link-entity; the Web API only compares Columns of the same row, so this condition is left out.`,
				at.path,
				"valueof"
			);
			return null;
		}
		const other = resolveColumn(target, valueof);
		return { text: `${property} ${mapping.operator} ${target.prefix}${propertyOf(other.column, valueof)}`, compound: false };
	}
	const values = valuesOf(at.element);
	const first = values[0];
	switch (mapping.kind) {
		case "null":
			return { text: `${property} ${mapping.operator} null`, compound: false };
		case "comparison":
			if (first === undefined) {
				warn(context, `The operator ${operator} needs a value, so this condition is left out.`, at.path, "value");
				return null;
			}
			return { text: `${property} ${mapping.operator} ${literalFor(context, at, first, info, attribute)}`, compound: false };
		case "string-function":
			if (first === undefined) {
				warn(context, `The operator ${operator} needs a value, so this condition is left out.`, at.path, "value");
				return null;
			}
			return { text: `${mapping.negated ? "not " : ""}${mapping.name}(${property},${quoted(first)})`, compound: false };
		case "like": {
			if (first === undefined) {
				warn(context, `The operator ${operator} needs a value, so this condition is left out.`, at.path, "value");
				return null;
			}
			const expression = likeExpression(property, first, mapping.negated);
			if (!expression) {
				warn(
					context,
					`The ${operator} pattern "${first}" has a wildcard that is not a single leading or trailing %, which contains, startswith and endswith cannot express, so this condition is left out.`,
					at.path,
					"value"
				);
			}
			return expression;
		}
		case "query-function":
			if (target.prefix !== "") {
				warn(
					context,
					`The operator ${operator} becomes the query function Microsoft.Dynamics.CRM.${mapping.name}, which the Web API documentation only shows on a Column of the Table being filtered, not through a navigation property or lambda, so this condition is left out.`,
					at.path,
					"operator"
				);
				return null;
			}
			return queryFunctionExpression(context, at, mapping, operator, info.column?.logicalName ?? attribute, values);
	}
};

const filterExpression = (context: Context, at: Located, scope: Scope): Expression | null => {
	const joiner = key(present(at.element, "type") ?? "and") === "or" ? "or" : "and";
	const parts = childElements(at).flatMap((child): Expression[] => {
		const expression = (() => {
			switch (child.element.name) {
				case "condition":
					return conditionExpression(context, child, scope);
				case "filter":
					return filterExpression(context, child, scope);
				case "link-entity":
					return linkRestriction(context, child, scope, true);
				default:
					warn(context, `The element ${child.element.name} inside a filter is not recognised, so it is left out.`, child.path);
					return null;
			}
		})();
		return expression ? [expression] : [];
	});
	return combine(parts, joiner);
};

const holderCriteria = (context: Context, holder: Located, scope: Scope): Expression | null => {
	const parts = childElements(holder).flatMap((child): Expression[] => {
		const expression =
			child.element.name === "filter"
				? filterExpression(context, child, scope)
				: child.element.name === "link-entity"
					? linkRestriction(context, child, scope, false)
					: null;
		return expression ? [expression] : [];
	});
	return combine(parts, "and");
};

const linkRestriction = (context: Context, at: Located, scope: Scope, inFilter: boolean): Expression | null => {
	const type = linkTypeOf(context, at);
	if (type === null) {
		return null;
	}
	if (type === "outer") {
		if (inFilter) {
			warn(
				context,
				`${linkLabel(at.element)} has link-type outer inside a filter, which does not restrict the rows, so it is left out.`,
				at.path,
				"link-type"
			);
		}
		return null;
	}
	const plan = planOf(context, at);
	if (plan.kind === "unmatched") {
		return null;
	}
	const name = present(at.element, "name");
	const shaped = (exists: Expression, matching: Expression): Expression => {
		if (type === "not any") {
			return negate(matching);
		}
		if (type === "all") {
			return combine([exists, negate(matching)], "and") ?? exists;
		}
		return matching;
	};
	if (plan.kind === "many-to-one") {
		const inner = holderCriteria(context, at, tableScope(context, name, `${scope.prefix}${plan.navigation}/`, true, scope.variables));
		const exists: Expression = { text: `${scope.prefix}_${plan.lookupColumn}_value ne null`, compound: false };
		return shaped(exists, inner ? (combine([exists, inner], "and") ?? exists) : exists);
	}
	if (scope.inPath) {
		warn(
			context,
			`${linkLabel(at.element)} is a one-to-many link-entity under a many-to-one link-entity; the Web API cannot filter on a collection reached through a lookup, so it does not restrict the rows.`,
			at.path
		);
		return null;
	}
	const variable = lambdaVariable(name ?? "x", scope.variables);
	const inner = holderCriteria(context, at, tableScope(context, name, `${variable}/`, false, [...scope.variables, variable]));
	const collection = `${scope.prefix}${plan.navigation}`;
	const exists: Expression = { text: `${collection}/any()`, compound: false };
	return shaped(exists, inner ? { text: `${collection}/any(${variable}:${inner.text})`, compound: false } : exists);
};

const selectOf = (context: Context, holder: Located, scope: Scope): readonly string[] | null => {
	const children = childElements(holder);
	if (children.some((child) => child.element.name === "all-attributes")) {
		return null;
	}
	const attributes = children.filter((child) => child.element.name === "attribute");
	if (attributes.length > 0 && scope.lookup?.state === "pending") {
		warn(
			context,
			`The metadata for Table ${scope.tableName ?? ""} has not loaded yet, so its attribute elements are selected as written; a lookup Column needs the _name_value form.`,
			holder.path
		);
	}
	const selected = attributes.flatMap((at): string[] => {
		const name = present(at.element, "name");
		if (name === undefined) {
			warn(context, "This attribute has no name, so it is left out.", at.path, "name");
			return [];
		}
		const info = resolveColumn(scope, name);
		const base = info.column?.attributeOf ? resolveColumn(scope, info.column.attributeOf) : null;
		const property = base ? propertyOf(base.column, info.column?.attributeOf ?? name) : propertyOf(info.column, name);
		const alias = present(at.element, "alias");
		if (alias !== undefined) {
			warn(
				context,
				`The attribute ${name} has alias ${alias}; the Web API has no column alias outside $apply, so it is returned as ${property}.`,
				at.path,
				"alias"
			);
		}
		if (base) {
			warn(
				context,
				`The attribute ${name} belongs to Column ${info.column?.attributeOf ?? ""} and is not a Web API property, so ${property} is selected instead; request the formatted value annotation to read it.`,
				at.path,
				"name"
			);
		}
		if (scope.lookup?.state === "loaded" && !info.column) {
			warn(context, `Table ${scope.tableName ?? ""} has no Column ${name}, so it is selected as written.`, at.path, "name");
		}
		return [property];
	});
	return [...new Set(selected)];
};

const orderOf = (context: Context, holder: Located, scope: Scope): readonly string[] =>
	childrenNamed(holder, "order").flatMap((at): string[] => {
		const entityName = present(at.element, "entityname");
		if (entityName !== undefined) {
			warn(
				context,
				`This order sorts by a Column of link-entity ${entityName}; the Web API documentation does not describe sorting by a related Table's Column, so it is left out.`,
				at.path,
				"entityname"
			);
			return [];
		}
		const attribute = present(at.element, "attribute");
		if (attribute === undefined) {
			warn(context, "This order has no attribute (alias only applies to aggregate queries), so it is left out.", at.path, "attribute");
			return [];
		}
		const info = resolveColumn(scope, attribute);
		if (!context.rawOrder && info.column?.columnType && CHOICE_TYPES.includes(info.column.columnType)) {
			warn(
				context,
				`${attribute} is a Choice Column: Fetch XML sorts it by label but the Web API sorts it by number, so rows can come back in a different order.`,
				at.path,
				"attribute"
			);
		}
		const property = propertyOf(info.column, attribute);
		return [isTrue(attributeValue(at.element, "descending")) ? `${property} desc` : property];
	});

const hasRestrictions = (holder: Located): boolean =>
	childElements(holder).some(
		(child) =>
			(child.element.name === "filter" && childElements(child).length > 0) ||
			(child.element.name === "link-entity" && key(present(child.element, "link-type") ?? "inner") !== "outer")
	);

const expandOf = (context: Context, at: Located): ExpandNode | null => {
	const type = linkTypeOf(context, at);
	if (type === null || FILTER_LINK_TYPES.includes(type)) {
		return null;
	}
	const plan = planOf(context, at);
	if (plan.kind === "unmatched") {
		return null;
	}
	const label = linkLabel(at.element);
	const name = present(at.element, "name");
	const scope = tableScope(context, name, "", false, []);
	const selected = selectOf(context, at, scope);
	const children = childrenNamed(at, "link-entity").flatMap((child) => {
		const node = expandOf(context, child);
		return node ? [node] : [];
	});
	if (selected !== null && selected.length === 0 && children.length === 0) {
		return null;
	}
	const primaryId = loadedTable(scope.lookup)?.primaryIdAttribute;
	const select = selected !== null && selected.length === 0 ? (primaryId ? [primaryId] : null) : selected;
	if (plan.kind === "many-to-one") {
		childrenNamed(at, "order").forEach((order) =>
			warn(context, `${label} is a many-to-one link-entity; the Web API cannot sort the rows by its Columns, so this order is left out.`, order.path)
		);
		if (type === "outer" && hasRestrictions(at)) {
			warn(
				context,
				`${label} is an outer many-to-one link-entity with a filter or inner link-entity; the Web API cannot filter a single-valued navigation property inside $expand, so they are left out.`,
				at.path
			);
		}
		return { navigation: plan.navigation, label, collection: false, select, filter: null, orderby: [], children, path: at.path };
	}
	if (type === "matchfirstrowusingcrossapply") {
		warn(
			context,
			`${label} has link-type matchfirstrowusingcrossapply; the Web API $expand returns every matching row, not only the first.`,
			at.path,
			"link-type"
		);
	}
	return {
		navigation: plan.navigation,
		label,
		collection: true,
		select,
		filter: holderCriteria(context, at, scope)?.text ?? null,
		orderby: orderOf(context, at, scope),
		children,
		path: at.path,
	};
};

const renderExpand = (node: ExpandNode, dropOrder: boolean): string => {
	const options = [
		node.select !== null && node.select.length > 0 ? `$select=${node.select.join(",")}` : null,
		node.filter === null ? null : `$filter=${node.filter}`,
		!dropOrder && node.orderby.length > 0 ? `$orderby=${node.orderby.join(",")}` : null,
		node.children.length > 0 ? `$expand=${node.children.map((child) => renderExpand(child, dropOrder)).join(",")}` : null,
	].filter((option): option is string => option !== null);
	return options.length > 0 ? `${node.navigation}(${options.join(";")})` : node.navigation;
};

const flatten = (nodes: readonly ExpandNode[]): readonly ExpandNode[] => nodes.flatMap((node) => [node, ...flatten(node.children)]);

const expandText = (context: Context, nodes: readonly ExpandNode[], entityPath: NodePath): string | null => {
	if (nodes.length === 0) {
		return null;
	}
	const all = flatten(nodes);
	const nested = nodes.some((node) => node.children.length > 0);
	if (nested) {
		all.filter((node) => node.collection && node.orderby.length > 0).forEach((node) =>
			warn(
				context,
				`The order elements of ${node.label} are left out because the Web API does not allow $orderby inside $expand when the query also has a nested $expand.`,
				node.path
			)
		);
	}
	if (all.length > MAX_EXPANDS) {
		warn(context, `The query needs ${all.length} $expand options, more than the ${MAX_EXPANDS} the Web API allows.`, entityPath);
	}
	return nodes.map((node) => renderExpand(node, nested)).join(",");
};

const fetchAttributeWarnings = (context: Context, aggregate: boolean): void => {
	const root = context.document.root;
	const paging = root.attributes.find((attribute) => ["page", "count", "paging-cookie"].includes(attribute.name));
	if (paging) {
		warn(
			context,
			`The ${paging.name} attribute controls Fetch XML paging; the Web API pages with the Prefer: odata.maxpagesize header and @odata.nextLink instead, so page, count and paging-cookie are left out.`,
			[],
			paging.name
		);
	}
	root.attributes.forEach((attribute) => {
		const name = attribute.name;
		switch (name) {
			case "top":
			case "returntotalrecordcount":
				if (aggregate && (name === "top" || isTrue(attribute.value))) {
					warn(context, `The ${name} attribute has no documented Web API equivalent in an aggregate query, so it is left out.`, [], name);
				}
				return;
			case "aggregate":
			case "version":
			case "mapping":
			case "useraworderby":
			case "page":
			case "count":
			case "paging-cookie":
				return;
			case "distinct":
				if (isTrue(attribute.value) && !aggregate) {
					warn(
						context,
						"The distinct attribute has no Web API equivalent and is left out; the Web API returns each row of the Table once, with linked rows nested under $expand.",
						[],
						name
					);
				}
				return;
			case "no-lock":
			case "latematerialize":
				if (isTrue(attribute.value)) {
					warn(context, `The ${name} attribute has no Web API equivalent and is left out.`, [], name);
				}
				return;
			case "datasource":
				warn(context, `The datasource attribute (${attribute.value}) has no Web API query option, so the URL reads live rows instead.`, [], name);
				return;
			case "options":
				warn(context, `The options attribute (${attribute.value}) has no Web API equivalent and is left out.`, [], name);
				return;
			case "aggregatelimit":
				warn(
					context,
					"The aggregatelimit attribute has no Web API equivalent and is left out; the Web API always applies the 50,000-row limit.",
					[],
					name
				);
				return;
			default:
				warn(context, `The ${name} attribute on fetch is not recognised and is left out.`, [], name);
		}
	});
};

const topOf = (context: Context): number | null => {
	const top = present(context.document.root, "top");
	if (top === undefined) {
		return null;
	}
	if (!/^\d+$/.test(top) || Number.parseInt(top, 10) < 1) {
		warn(context, `The top attribute "${top}" is not a positive whole number, so it is left out.`, [], "top");
		return null;
	}
	return Number.parseInt(top, 10);
};

const encodeOption = (value: string): string =>
	value.replace(UNSAFE_IN_QUERY, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);

export const webApiPath = (entitySetName: string, options: WebApiQueryOptions): string => {
	const parts = [
		["$select", options.select],
		["$expand", options.expand],
		["$filter", options.filter],
		["$orderby", options.orderby],
		["$top", options.top === null ? null : String(options.top)],
		["$count", options.count ? "true" : null],
		["$apply", options.apply],
	].flatMap(([name, value]) => (value === null || value === undefined ? [] : [`${name}=${encodeOption(value)}`]));
	return parts.length > 0 ? `${entitySetName}?${parts.join("&")}` : entitySetName;
};

const failed = (context: Context, message: string, path: NodePath, entitySetName: string | null = null, attribute?: string): WebApiConversion => {
	warn(context, message, path, attribute);
	return { path: null, entitySetName, options: NO_OPTIONS, warnings: [] };
};

const rowConversion = (context: Context, entity: Located, table: QueryTable): WebApiConversion => {
	const scope: Scope = { tableName: table.logicalName, lookup: { state: "loaded", table }, prefix: "", inPath: false, variables: [], root: true };
	childElements(entity)
		.filter((child) => !ENTITY_CHILDREN.includes(child.element.name))
		.forEach((child) => warn(context, `The element ${child.element.name} inside entity is not recognised, so it is left out.`, child.path));
	const selected = selectOf(context, entity, scope);
	const select = selected === null ? null : selected.length > 0 ? selected : [table.primaryIdAttribute];
	const filter = holderCriteria(context, entity, scope);
	const orderby = orderOf(context, entity, scope);
	const expands = childrenNamed(entity, "link-entity").flatMap((child) => {
		const node = expandOf(context, child);
		return node ? [node] : [];
	});
	const options: WebApiQueryOptions = {
		select: select === null ? null : select.join(","),
		filter: filter?.text ?? null,
		orderby: orderby.length > 0 ? orderby.join(",") : null,
		top: topOf(context),
		expand: expandText(context, expands, entity.path),
		count: isTrue(attributeValue(context.document.root, "returntotalrecordcount")),
		apply: null,
	};
	return { path: webApiPath(table.entitySetName, options), entitySetName: table.entitySetName, options, warnings: [] };
};

const NO_EQUIVALENT = "This aggregate query has no Web API equivalent:";

const aggregateConversion = (context: Context, entity: Located, table: QueryTable): WebApiConversion => {
	const scope: Scope = { tableName: table.logicalName, lookup: { state: "loaded", table }, prefix: "", inPath: false, variables: [], root: true };
	const groups: string[] = [];
	const aggregates: string[] = [];
	const filters: Expression[] = [];
	const fail = (reason: string, path: NodePath, attribute?: string): WebApiConversion =>
		failed(context, `${NO_EQUIVALENT} ${reason}`, path, table.entitySetName, attribute);
	for (const child of childElements(entity)) {
		const element = child.element;
		if (element.name === "attribute") {
			const name = present(element, "name") ?? "";
			const alias = present(element, "alias") ?? name;
			const info = resolveColumn(scope, name);
			const property = propertyOf(info.column, name);
			const aggregate = key(present(element, "aggregate") ?? "");
			if (present(element, "rowaggregate") !== undefined) {
				return fail(`rowaggregate on attribute ${name} cannot be expressed.`, child.path, "rowaggregate");
			}
			if (isTrue(attributeValue(element, "groupby"))) {
				if (present(element, "dategrouping") !== undefined) {
					return fail(
						`grouping attribute ${name} by dategrouping is not covered by the Web API aggregate documentation.`,
						child.path,
						"dategrouping"
					);
				}
				if (info.column?.columnType === "dateTime") {
					return fail(`the Web API cannot groupby a date and time Column such as ${name}.`, child.path, "groupby");
				}
				groups.push(property);
				continue;
			}
			if (aggregate === "count") {
				aggregates.push(`$count as ${alias}`);
				continue;
			}
			const fn = AGGREGATE_FUNCTIONS[aggregate];
			if (fn) {
				aggregates.push(`${property} with ${fn} as ${alias}`);
				continue;
			}
			if (aggregate === "countcolumn") {
				return fail(
					`aggregate countcolumn${isTrue(attributeValue(element, "distinct")) ? " with distinct" : ""} on attribute ${name} cannot be expressed with $apply.`,
					child.path,
					"aggregate"
				);
			}
			return fail(`attribute ${name} has neither aggregate nor groupby.`, child.path);
		}
		if (element.name === "filter") {
			const usesLinks = elementsBelow(child).some(
				(below) => below.element.name === "link-entity" || (below.element.name === "condition" && present(below.element, "entityname") !== undefined)
			);
			if (usesLinks) {
				return fail("the filter uses a link-entity or entityname, and $apply's filter() is only documented on the Table's own Columns.", child.path);
			}
			const expression = filterExpression(context, child, scope);
			if (expression) {
				filters.push(expression);
			}
			continue;
		}
		if (element.name === "order") {
			warn(
				context,
				"Sorting an aggregate query has no documented Web API equivalent ($orderby cannot use aggregate values), so this order is left out.",
				child.path
			);
			continue;
		}
		if (element.name === "link-entity") {
			const label = linkLabel(element);
			const type = linkTypeOf(context, child);
			const plan = planOf(context, child);
			const inside = childElements(child);
			const groupOnly = inside.every(
				(below) =>
					below.element.name === "attribute" &&
					isTrue(attributeValue(below.element, "groupby")) &&
					present(below.element, "dategrouping") === undefined
			);
			if (type === null || plan.kind !== "many-to-one" || !["inner", "outer"].includes(type) || !groupOnly) {
				return fail(
					`${label} can only be expressed when it is an inner or outer many-to-one link-entity whose attributes all have groupby.`,
					child.path
				);
			}
			const linkScope = tableScope(context, present(element, "name"), "", false, []);
			inside.forEach((below) => {
				const name = present(below.element, "name") ?? "";
				groups.push(`${plan.navigation}/${propertyOf(resolveColumn(linkScope, name).column, name)}`);
			});
			if (type === "inner") {
				filters.push({ text: `_${plan.lookupColumn}_value ne null`, compound: false });
			}
			continue;
		}
		return fail(`the element ${element.name} cannot be used in an aggregate query.`, child.path);
	}
	if (groups.length === 0 && aggregates.length === 0) {
		return fail("it has no attribute with aggregate or groupby.", entity.path);
	}
	const aggregation = aggregates.length > 0 ? `aggregate(${aggregates.join(",")})` : null;
	const transformation = groups.length > 0 ? `groupby((${groups.join(",")})${aggregation ? `,${aggregation}` : ""})` : (aggregation ?? "");
	const filter = combine(filters, "and");
	const options: WebApiQueryOptions = { ...NO_OPTIONS, apply: filter ? `filter(${filter.text})/${transformation}` : transformation };
	return { path: webApiPath(table.entitySetName, options), entitySetName: table.entitySetName, options, warnings: [] };
};

const elementsBelow = (at: Located): readonly Located[] => childElements(at).flatMap((child) => [child, ...elementsBelow(child)]);

const convert = (context: Context): WebApiConversion => {
	const root = context.document.root;
	if (root.name !== "fetch") {
		return failed(context, `The root element is ${root.name}, not fetch, so no Web API URL can be produced.`, []);
	}
	const entity = childrenNamed({ element: root, path: [] }, "entity")[0];
	if (!entity) {
		return failed(context, "The fetch element has no entity, so no Web API URL can be produced.", []);
	}
	const tableName = present(entity.element, "name");
	if (tableName === undefined) {
		return failed(context, "The entity has no name, so no Web API URL can be produced.", entity.path, null, "name");
	}
	const lookup = context.metadata(tableName);
	if (lookup.state === "missing") {
		return failed(context, `Table ${tableName} does not exist in this Environment, so no Web API URL can be produced.`, entity.path, null, "name");
	}
	if (lookup.state === "pending") {
		return failed(
			context,
			`The metadata for Table ${tableName} has not loaded yet, so its entity set name is unknown and no Web API URL can be produced.`,
			entity.path,
			null,
			"name"
		);
	}
	if (lookup.table.entitySetName.trim() === "") {
		return failed(context, `Table ${tableName} has no entity set name, so it cannot be queried through the Web API.`, entity.path, null, "name");
	}
	const aggregate = isTrue(attributeValue(root, "aggregate"));
	fetchAttributeWarnings(context, aggregate);
	return aggregate ? aggregateConversion(context, entity, lookup.table) : rowConversion(context, entity, lookup.table);
};

export const toWebApi = (document: FetchXmlDocument, metadata: QueryMetadata): WebApiConversion => {
	const context: Context = { document, metadata, warnings: [], rawOrder: isTrue(attributeValue(document.root, "useraworderby")) };
	try {
		const result = convert(context);
		return { ...result, warnings: unique(context.warnings) };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			path: null,
			entitySetName: null,
			options: NO_OPTIONS,
			warnings: [...unique(context.warnings), { message: `The Web API conversion failed unexpectedly: ${message}`, path: [] }],
		};
	}
};
