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
	at.element.children.flatMap((child, index) => (child.kind === "element" && !child.excluded ? [{ element: child, path: [...at.path, index] }] : []));

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
		return { column: null, reason: "the Table of the Column is not known" };
	}
	if (scope.lookup.state === "pending") {
		return { column: null, reason: `the metadata for Table ${tableName} is not loaded yet` };
	}
	if (scope.lookup.state === "missing") {
		return { column: null, reason: `Table ${tableName} is not in this Environment` };
	}
	const column = columnOf(scope.lookup.table, name);
	if (!column) {
		return { column: null, reason: `Column ${name} is not in Table ${tableName}` };
	}
	return column.columnType === null ? { column, reason: `the converter does not know the type of Column ${name}` } : { column, reason: null };
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
			return NUMBER.test(value) ? { text: value, problem: null } : { text: quoted(raw), problem: "a number" };
		case "yesNo":
			if (["1", "true"].includes(value.toLowerCase())) {
				return { text: "true", problem: null };
			}
			return ["0", "false"].includes(value.toLowerCase()) ? { text: "false", problem: null } : { text: quoted(raw), problem: "0, 1, true or false" };
		case "dateTime":
			return DATE.test(value)
				? { text: value.replace(" ", "T"), problem: null }
				: { text: quoted(raw), problem: "an ISO date, such as 2024-01-31 or 2024-01-31T09:00:00Z" };
		case "lookup":
		case "owner":
		case "uniqueIdentifier": {
			const guid = GUID.exec(value)?.[1];
			return guid ? { text: guid, problem: null } : { text: quoted(raw), problem: "a GUID" };
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
		child.kind === "element" && !child.excluded && child.name === "value"
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
	warn(context, `The Web API has no equivalent for link-type ${type} on ${linkLabel(at.element)}. The URL leaves it out.`, at.path, "link-type");
	return null;
};

const planOf = (context: Context, at: Located): LinkPlan => {
	const label = linkLabel(at.element);
	const name = present(at.element, "name");
	if (name === undefined) {
		warn(context, `${label} has no name. The URL leaves it out.`, at.path, "name");
		return { kind: "unmatched" };
	}
	const parent = columnTableAt(context.document, at.path, "to");
	if (parent.kind !== "table") {
		warn(context, `The parent of ${label} has no Table name. The URL leaves it out.`, at.path);
		return { kind: "unmatched" };
	}
	const lookup = context.metadata(parent.tableLogicalName);
	if (lookup.state === "pending") {
		warn(context, `The relationships of Table ${parent.tableLogicalName} are not loaded yet. The URL leaves out ${label}.`, at.path);
		return { kind: "unmatched" };
	}
	if (lookup.state === "missing") {
		warn(context, `Table ${parent.tableLogicalName} is not in this Environment. The URL leaves out ${label}.`, at.path);
		return { kind: "unmatched" };
	}
	const from = present(at.element, "from");
	const to = present(at.element, "to");
	if (from === undefined || to === undefined) {
		warn(context, `${label} does not have both from and to. The URL leaves it out. Set both Columns.`, at.path);
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
		warn(context, `Relationship ${relationship.schemaName} has no navigation property. The URL leaves out ${label}.`, at.path);
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
			`${label} joins ${name}, the intersect Table of a many-to-many relationship. The converter cannot make many-to-many joins. The URL leaves out ${label} and the link-entity elements in it.`,
			at.path
		);
		return { kind: "unmatched" };
	}
	warn(
		context,
		`${label} (from ${from} to ${to}) matches no relationship of Table ${parent.tableLogicalName}. The Web API cannot make a custom join. The URL leaves it out.`,
		at.path
	);
	return { kind: "unmatched" };
};

const entityNameScope = (context: Context, at: Located, scope: Scope, entityName: string): Scope | null => {
	if (!scope.root) {
		warn(
			context,
			`The converter uses entityname only on conditions in the filter of the entity. The URL leaves out this condition.`,
			at.path,
			"entityname"
		);
		return null;
	}
	const link = linkEntityFor(context.document, entityName);
	if (!link) {
		warn(context, `entityname ${entityName} does not refer to a link-entity. The URL leaves out this condition.`, at.path, "entityname");
		return null;
	}
	const navigations: string[] = [];
	for (let depth = 1; depth <= link.path.length; depth += 1) {
		const located = elementAt(context.document, link.path.slice(0, depth));
		if (!located || located.element.name === "filter") {
			warn(context, `entityname ${entityName} refers to a link-entity inside a filter. The URL leaves out this condition.`, at.path, "entityname");
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
				`entityname ${entityName} refers to a one-to-many link-entity. The Web API cannot test its Columns from the filter of the entity. The URL leaves out this condition. Use a link-entity with link-type any or not any inside the filter.`,
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
		warn(context, `The type of this value is not known, because ${info.reason ?? "the Column is not known"}. The URL uses a best guess.`, at.path, "value");
		return guessedLiteral(raw);
	}
	const literal = typedLiteral(raw, info.column);
	if (literal.problem !== null) {
		warn(
			context,
			`Column ${attribute} expects ${literal.problem}. The value "${raw}" is not correct. The URL writes it as a quoted string.`,
			at.path,
			"value"
		);
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
				warn(context, `Operator ${operator} needs a value. The URL leaves out this condition.`, at.path, "value");
				return null;
			}
			return call(`,PropertyValue=${quoted(GUID.test(value.trim()) ? bareGuid(value) : value.trim())}`);
		}
		case "integer": {
			const value = values[0]?.trim();
			if (value === undefined || !INTEGER.test(value)) {
				warn(
					context,
					`Operator ${operator} takes a whole number. "${value ?? ""}" is not a whole number. The URL leaves out this condition.`,
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
					`Operator ${operator} needs ${["between", "not-between"].includes(operator) ? "two value elements" : "one or more values"}. The URL leaves out this condition.`,
					at.path
				);
				return null;
			}
			return call(`,PropertyValues=[${values.map((value) => JSON.stringify(bareGuid(value))).join(",")}]`);
		}
		case "integer-pair": {
			const [first, second] = values.map((value) => value.trim());
			if (values.length !== 2 || first === undefined || second === undefined || !INTEGER.test(first) || !INTEGER.test(second)) {
				warn(
					context,
					`Operator ${operator} needs two value elements with whole numbers: a period and a year. The URL leaves out this condition.`,
					at.path
				);
				return null;
			}
			return call(`,PropertyValue1=${first},PropertyValue2=${second}`);
		}
	}
};

const conditionExpression = (context: Context, at: Located, scope: Scope): Expression | null => {
	const operator = present(at.element, "operator");
	if (operator === undefined) {
		warn(context, "This condition has no operator. The URL leaves it out.", at.path, "operator");
		return null;
	}
	const unsupported = webApiUnsupportedReason(operator);
	if (unsupported !== undefined) {
		warn(context, `The Web API has no equivalent for operator ${operator} (${unsupported}). The URL leaves out this condition.`, at.path, "operator");
		return null;
	}
	const mapping = webApiOperator(operator);
	if (!mapping) {
		warn(context, `Operator ${operator} is not a Fetch XML operator. The URL leaves out this condition.`, at.path, "operator");
		return null;
	}
	const attribute = present(at.element, "attribute");
	if (attribute === undefined) {
		warn(context, "This condition has no attribute. The URL leaves it out.", at.path, "attribute");
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
			warn(
				context,
				`The converter uses valueof only with eq, ne, gt, ge, lt and le, not with ${operator}. The URL leaves out this condition.`,
				at.path,
				"valueof"
			);
			return null;
		}
		if (valueof.includes(".")) {
			warn(
				context,
				`valueof ${valueof} refers to a Column of a link-entity. The Web API compares only Columns of the same Record. The URL leaves out this condition.`,
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
				warn(context, `Operator ${operator} needs a value. The URL leaves out this condition.`, at.path, "value");
				return null;
			}
			return { text: `${property} ${mapping.operator} ${literalFor(context, at, first, info, attribute)}`, compound: false };
		case "string-function":
			if (first === undefined) {
				warn(context, `Operator ${operator} needs a value. The URL leaves out this condition.`, at.path, "value");
				return null;
			}
			return { text: `${mapping.negated ? "not " : ""}${mapping.name}(${property},${quoted(first)})`, compound: false };
		case "like": {
			if (first === undefined) {
				warn(context, `Operator ${operator} needs a value. The URL leaves out this condition.`, at.path, "value");
				return null;
			}
			const expression = likeExpression(property, first, mapping.negated);
			if (!expression) {
				warn(
					context,
					`The ${operator} pattern "${first}" has a wildcard that is not one % at the start or end. contains, startswith and endswith cannot express it. The URL leaves out this condition.`,
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
					`Operator ${operator} becomes the query function Microsoft.Dynamics.CRM.${mapping.name}. The Web API documentation shows this function only on a Column of the filtered Table. The URL leaves out this condition.`,
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
					warn(context, `Element ${child.element.name} inside a filter is not in the Fetch XML reference. The URL leaves it out.`, child.path);
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
				`${linkLabel(at.element)} has link-type outer inside a filter. This does not limit the Records. The URL leaves it out.`,
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
			`${linkLabel(at.element)} is a one-to-many link-entity under a many-to-one link-entity. The Web API cannot filter on a collection through a lookup. It does not limit the Records.`,
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
			`The metadata for Table ${scope.tableName ?? ""} is not loaded yet. The URL selects its attribute elements as written. A lookup Column needs the _name_value form.`,
			holder.path
		);
	}
	const selected = attributes.flatMap((at): string[] => {
		const name = present(at.element, "name");
		if (name === undefined) {
			warn(context, "This attribute has no name. The URL leaves it out.", at.path, "name");
			return [];
		}
		const info = resolveColumn(scope, name);
		const base = info.column?.attributeOf ? resolveColumn(scope, info.column.attributeOf) : null;
		const property = base ? propertyOf(base.column, info.column?.attributeOf ?? name) : propertyOf(info.column, name);
		const alias = present(at.element, "alias");
		if (alias !== undefined) {
			warn(
				context,
				`attribute ${name} has alias ${alias}. The Web API has no Column alias outside $apply. The URL returns it as ${property}.`,
				at.path,
				"alias"
			);
		}
		if (base) {
			warn(
				context,
				`attribute ${name} is part of Column ${info.column?.attributeOf ?? ""} and is not a Web API property. The URL selects ${property}. Request the formatted value annotation to read it.`,
				at.path,
				"name"
			);
		}
		if (scope.lookup?.state === "loaded" && !info.column) {
			warn(context, `Column ${name} is not in Table ${scope.tableName ?? ""}. The URL selects it as written.`, at.path, "name");
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
				`This order sorts by a Column of link-entity ${entityName}. The Web API documentation does not show how to sort by a Column of a related Table. The URL leaves it out.`,
				at.path,
				"entityname"
			);
			return [];
		}
		const attribute = present(at.element, "attribute");
		if (attribute === undefined) {
			warn(context, "This order has no attribute. alias applies only to aggregate Queries. The URL leaves it out.", at.path, "attribute");
			return [];
		}
		const info = resolveColumn(scope, attribute);
		if (!context.rawOrder && info.column?.columnType && CHOICE_TYPES.includes(info.column.columnType)) {
			warn(
				context,
				`${attribute} is a Choice Column. Fetch XML sorts it by label, but the Web API sorts it by number. The Records can come back in a different order.`,
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
			warn(
				context,
				`${label} is a many-to-one link-entity. The Web API cannot sort the Records by its Columns. The URL leaves out this order.`,
				order.path
			)
		);
		if (type === "outer" && hasRestrictions(at)) {
			warn(
				context,
				`${label} is an outer many-to-one link-entity with a filter or an inner link-entity. The Web API cannot filter a single-valued navigation property inside $expand. The URL leaves them out.`,
				at.path
			);
		}
		return { navigation: plan.navigation, label, collection: false, select, filter: null, orderby: [], children, path: at.path };
	}
	if (type === "matchfirstrowusingcrossapply") {
		warn(
			context,
			`${label} has link-type matchfirstrowusingcrossapply. The Web API $expand returns all matching Records, not only the first.`,
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
				`If a Query has a nested $expand, the Web API does not allow $orderby inside $expand. The URL leaves out the order elements of ${node.label}.`,
				node.path
			)
		);
	}
	if (all.length > MAX_EXPANDS) {
		warn(context, `The Query needs ${all.length} $expand options. The Web API allows no more than ${MAX_EXPANDS}.`, entityPath);
	}
	return nodes.map((node) => renderExpand(node, nested)).join(",");
};

const fetchAttributeWarnings = (context: Context, aggregate: boolean): void => {
	const root = context.document.root;
	const paging = root.attributes.find((attribute) => ["page", "count", "paging-cookie"].includes(attribute.name));
	if (paging) {
		warn(
			context,
			`${paging.name} controls Fetch XML paging. The Web API uses the Prefer: odata.maxpagesize header and @odata.nextLink for pages. The URL leaves out page, count and paging-cookie.`,
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
					warn(context, `In an aggregate Query, the Web API documentation shows no equivalent for ${name}. The URL leaves it out.`, [], name);
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
						"The Web API has no equivalent for distinct. The URL leaves it out. The Web API returns each Record of the Table one time, with linked Records under $expand.",
						[],
						name
					);
				}
				return;
			case "no-lock":
			case "latematerialize":
				if (isTrue(attribute.value)) {
					warn(context, `The Web API has no equivalent for ${name}. The URL leaves it out.`, [], name);
				}
				return;
			case "datasource":
				warn(context, `The Web API has no query option for datasource (${attribute.value}). The URL reads live Records.`, [], name);
				return;
			case "options":
				warn(context, `The Web API has no equivalent for options (${attribute.value}). The URL leaves it out.`, [], name);
				return;
			case "aggregatelimit":
				warn(
					context,
					"The Web API has no equivalent for aggregatelimit. The URL leaves it out. The Web API always applies the limit of 50,000 Records.",
					[],
					name
				);
				return;
			default:
				warn(context, `Attribute ${name} on fetch is not in the Fetch XML reference. The URL leaves it out.`, [], name);
		}
	});
};

const topOf = (context: Context): number | null => {
	const top = present(context.document.root, "top");
	if (top === undefined) {
		return null;
	}
	if (!/^\d+$/.test(top) || Number.parseInt(top, 10) < 1) {
		warn(context, `top "${top}" is not a positive whole number. The URL leaves it out.`, [], "top");
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
		.forEach((child) => warn(context, `Element ${child.element.name} inside entity is not in the Fetch XML reference. The URL leaves it out.`, child.path));
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

const NO_EQUIVALENT = "The Web API has no equivalent for this aggregate Query:";

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
				return fail(`the Web API cannot express rowaggregate on attribute ${name}.`, child.path, "rowaggregate");
			}
			if (isTrue(attributeValue(element, "groupby"))) {
				if (present(element, "dategrouping") !== undefined) {
					return fail(`the Web API aggregate documentation does not show dategrouping on attribute ${name}.`, child.path, "dategrouping");
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
					`aggregate countcolumn${isTrue(attributeValue(element, "distinct")) ? " with distinct" : ""} on attribute ${name} is not possible with $apply.`,
					child.path,
					"aggregate"
				);
			}
			return fail(`attribute ${name} has no aggregate and no groupby.`, child.path);
		}
		if (element.name === "filter") {
			const usesLinks = elementsBelow(child).some(
				(below) => below.element.name === "link-entity" || (below.element.name === "condition" && present(below.element, "entityname") !== undefined)
			);
			if (usesLinks) {
				return fail(
					"the filter uses a link-entity or entityname. The documentation shows filter() in $apply only on Columns of the Table.",
					child.path
				);
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
				"The Web API documentation shows no way to sort an aggregate Query. $orderby cannot use aggregate values. The URL leaves out this order.",
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
		return fail(`an aggregate Query cannot use element ${element.name}.`, child.path);
	}
	if (groups.length === 0 && aggregates.length === 0) {
		return fail("no attribute has aggregate or groupby.", entity.path);
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
		return failed(context, `The root element is ${root.name}, not fetch. The converter cannot make a Web API URL.`, []);
	}
	const entity = childrenNamed({ element: root, path: [] }, "entity")[0];
	if (!entity) {
		return failed(context, "fetch has no entity. The converter cannot make a Web API URL.", []);
	}
	const tableName = present(entity.element, "name");
	if (tableName === undefined) {
		return failed(context, "entity has no name. The converter cannot make a Web API URL.", entity.path, null, "name");
	}
	const lookup = context.metadata(tableName);
	if (lookup.state === "missing") {
		return failed(context, `Table ${tableName} is not in this Environment. The converter cannot make a Web API URL.`, entity.path, null, "name");
	}
	if (lookup.state === "pending") {
		return failed(
			context,
			`The metadata for Table ${tableName} is not loaded yet. The converter cannot make a Web API URL without the entity set name.`,
			entity.path,
			null,
			"name"
		);
	}
	if (lookup.table.entitySetName.trim() === "") {
		return failed(context, `Table ${tableName} has no entity set name. The Web API cannot query it.`, entity.path, null, "name");
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
			warnings: [...unique(context.warnings), { message: `The Web API conversion failed: ${message}`, path: [] }],
		};
	}
};
