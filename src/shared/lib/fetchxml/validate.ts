import type { QueryColumn, QueryColumnType } from "@/shared/types";

import { aliasesIn, attributeValue, columnOf, columnTableAt, type QueryMetadata, resolveValueOf } from "./metadata";
import { operatorDefinition, type OperatorDefinition } from "./operators";
import { attributeDefinition, attributesOf, elementDefinition, isKnownElement, isValidChild } from "./schema";
import { type FetchXmlDocument, type NodePath, type SourceRange, type XmlElement } from "./types";

export type DiagnosticSeverity = "error" | "warning" | "info";

export type DiagnosticRule =
	| "root-element"
	| "invalid-child"
	| "child-limit"
	| "required-attribute"
	| "enumeration"
	| "number"
	| "number-range"
	| "unknown-element"
	| "unknown-attribute"
	| "missing-table"
	| "missing-column"
	| "deprecated-operator"
	| "operator-column-type"
	| "value-count"
	| "value-type"
	| "choice-option"
	| "duplicate-alias"
	| "invalid-alias"
	| "undefined-alias"
	| "aggregate-attribute"
	| "aggregate-all-attributes"
	| "aggregate-order"
	| "aggregate-not-set"
	| "top-with-paging";

export type Diagnostic = {
	readonly severity: DiagnosticSeverity;
	readonly rule: DiagnosticRule;
	readonly message: string;
	readonly path: NodePath;
	readonly attribute?: string;
	readonly range?: SourceRange;
};

type Context = {
	readonly document: FetchXmlDocument;
	readonly metadata: QueryMetadata;
	readonly aggregate: boolean;
	readonly duplicates: ReadonlySet<string>;
	readonly attributeAliases: ReadonlySet<string>;
};

type Located = { readonly element: XmlElement; readonly path: NodePath };

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const WHOLE = /^-?\d+$/;
const DECIMAL = /^-?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;
const GUID = /^\{?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\}?$/;
const DATE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const BOOLEAN_VALUES = ["true", "false", "1", "0"];

const COLUMN_TYPE_HOLDS: Readonly<Record<QueryColumnType, string>> = {
	text: "text",
	memo: "text",
	wholeNumber: "whole numbers",
	decimalOrMoney: "numbers",
	dateTime: "dates",
	choice: "option numbers",
	multiChoice: "option numbers",
	yesNo: "0 or 1",
	lookup: "GUIDs",
	owner: "GUIDs",
	uniqueIdentifier: "GUIDs",
	stateOrStatus: "option numbers",
};

const COLUMN_TYPE_LABEL: Readonly<Record<QueryColumnType, string>> = {
	text: "a text Column",
	memo: "a multiline text Column",
	wholeNumber: "a whole number Column",
	decimalOrMoney: "a decimal or currency Column",
	dateTime: "a date and time Column",
	choice: "a Choice Column",
	multiChoice: "a multi-select Choice Column",
	yesNo: "a yes/no Column",
	lookup: "a lookup Column",
	owner: "an owner Column",
	uniqueIdentifier: "a unique identifier Column",
	stateOrStatus: "a status Column",
};

const pathKey = (path: NodePath): string => path.join("/");

const isTrue = (value: string | undefined): boolean => value !== undefined && ["true", "1"].includes(value.trim().toLowerCase());

const present = (element: XmlElement, name: string): string | undefined => {
	const value = attributeValue(element, name);
	return value === undefined || value.trim() === "" ? undefined : value.trim();
};

const formatNumber = (value: number): string => value.toLocaleString("en-US");

const plural = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? "" : "s"}`;

const diagnostic = (severity: DiagnosticSeverity, rule: DiagnosticRule, message: string, at: Located, attribute?: string): Diagnostic => {
	const source = attribute === undefined ? undefined : at.element.attributes.find((candidate) => candidate.name === attribute);
	const range = source?.range ?? at.element.range;
	return {
		severity,
		rule,
		message,
		path: at.path,
		...(attribute === undefined ? {} : { attribute }),
		...(range === undefined ? {} : { range }),
	};
};

const error = (rule: DiagnosticRule, message: string, at: Located, attribute?: string): Diagnostic => diagnostic("error", rule, message, at, attribute);

const checkAttributeValues = (at: Located): Diagnostic[] =>
	at.element.attributes.flatMap((attribute): Diagnostic[] => {
		const definition = attributeDefinition(at.element.name, attribute.name);
		const element = at.element.name;
		if (!definition) {
			return [
				diagnostic(
					"info",
					"unknown-attribute",
					`Attribute ${attribute.name} is not in the Fetch XML reference for ${element}. It stays as written.`,
					at,
					attribute.name
				),
			];
		}
		const value = attribute.value.trim();
		const kind = definition.value;
		if (kind.kind === "enumeration") {
			const allowed = kind.values.map((candidate) => candidate.value.toLowerCase());
			const given = kind.multiple ? value.split(",").map((part) => part.trim()) : [value];
			const wrong = given.find((part) => !allowed.includes(part.toLowerCase()));
			if (wrong === undefined) {
				return [];
			}
			const message =
				element === "condition" && attribute.name === "operator"
					? `"${wrong}" is not a Fetch XML operator.`
					: `The value "${wrong}" is not valid for ${attribute.name} on ${element}. Use one of these values: ${kind.values.map((candidate) => candidate.value).join(", ")}.`;
			return [error("enumeration", message, at, attribute.name)];
		}
		if (kind.kind === "boolean") {
			return BOOLEAN_VALUES.includes(value.toLowerCase())
				? []
				: [
						error(
							"enumeration",
							`The value "${attribute.value}" is not valid for ${attribute.name} on ${element}. Use true or false.`,
							at,
							attribute.name
						),
					];
		}
		if (kind.kind === "number") {
			if (!WHOLE.test(value)) {
				return [
					error("number", `The value "${attribute.value}" is not valid for ${attribute.name} on ${element}. Use a whole number.`, at, attribute.name),
				];
			}
			const number = Number.parseInt(value, 10);
			if (kind.minimum !== undefined && number < kind.minimum) {
				return [
					error(
						"number-range",
						`The value of ${attribute.name} on ${element} is too small. Use ${formatNumber(kind.minimum)} or more.`,
						at,
						attribute.name
					),
				];
			}
			if (kind.maximum !== undefined && number > kind.maximum) {
				return [
					error(
						"number-range",
						`The value of ${attribute.name} on ${element} is too large. Use ${formatNumber(kind.maximum)} or less.`,
						at,
						attribute.name
					),
				];
			}
		}
		return [];
	});

const checkRequired = (at: Located): Diagnostic[] => {
	const required = attributesOf(at.element.name)
		.filter((definition) => definition.required && present(at.element, definition.name) === undefined)
		.map((definition) => error("required-attribute", `${at.element.name} has no ${definition.name} attribute. Add this attribute.`, at));
	const order =
		at.element.name === "order" && present(at.element, "attribute") === undefined && present(at.element, "alias") === undefined
			? [error("required-attribute", "order has no attribute and no alias. Add one of them.", at)]
			: [];
	return [...required, ...order];
};

type ColumnCheck = { readonly diagnostics: Diagnostic[]; readonly column?: QueryColumn };

const checkColumn = (context: Context, at: Located, attribute: string): ColumnCheck => {
	const name = present(at.element, attribute);
	if (name === undefined) {
		return { diagnostics: [] };
	}
	const owner = columnTableAt(context.document, at.path, attribute);
	if (owner.kind !== "table") {
		return { diagnostics: [] };
	}
	const lookup = context.metadata(owner.tableLogicalName);
	if (lookup.state !== "loaded") {
		return { diagnostics: [] };
	}
	const column = columnOf(lookup.table, name);
	return column
		? { diagnostics: [], column }
		: { diagnostics: [error("missing-column", `Column ${name} is not in Table ${owner.tableLogicalName}.`, at, attribute)] };
};

const checkEntityName = (context: Context, at: Located, attribute: string): Diagnostic[] => {
	const owner = columnTableAt(context.document, at.path, attribute);
	return owner.kind === "unknown-entityname"
		? [
				error(
					"undefined-alias",
					`entityname ${owner.entityName} does not refer to a link-entity. Use the alias or name of a link-entity.`,
					at,
					"entityname"
				),
			]
		: [];
};

const checkTable = (context: Context, at: Located): Diagnostic[] => {
	const name = present(at.element, "name");
	if (name === undefined || context.metadata(name).state !== "missing") {
		return [];
	}
	return [error("missing-table", `Table ${name} is not in this Connection.`, at, "name")];
};

const checkAliasDefinition = (context: Context, at: Located): Diagnostic[] => {
	const alias = present(at.element, "alias");
	if (alias === undefined) {
		return [];
	}
	const invalid = IDENTIFIER.test(alias)
		? []
		: [
				error(
					"invalid-alias",
					`Alias ${alias} is not valid. Start it with a letter or an underscore. Use only letters, digits and underscores.`,
					at,
					"alias"
				),
			];
	const duplicate = context.duplicates.has(pathKey(at.path))
		? [error("duplicate-alias", `Another ${at.element.name} has the alias ${alias}. Use a different alias.`, at, "alias")]
		: [];
	return [...invalid, ...duplicate];
};

const checkFetch = (at: Located): Diagnostic[] => {
	if (present(at.element, "top") === undefined) {
		return [];
	}
	const paging = ["page", "count"].filter((name) => present(at.element, name) !== undefined);
	return paging.length === 0 ? [] : [error("top-with-paging", `top does not work with ${paging.join(" or ")}. Remove one of them.`, at, "top")];
};

const checkAttribute = (context: Context, at: Located): Diagnostic[] => {
	const name = present(at.element, "name") ?? "";
	const aggregateValue = present(at.element, "aggregate");
	const groupBy = isTrue(attributeValue(at.element, "groupby"));
	const aggregate: Diagnostic[] = [];
	if (context.aggregate) {
		if (aggregateValue === undefined && !groupBy) {
			aggregate.push(error("aggregate-attribute", `In an aggregate Query, attribute ${name} must have aggregate or groupby.`, at));
		}
		if (present(at.element, "alias") === undefined) {
			aggregate.push(error("aggregate-attribute", `In an aggregate Query, attribute ${name} must have an alias.`, at, "alias"));
		}
	} else {
		if (aggregateValue !== undefined) {
			aggregate.push(error("aggregate-not-set", `fetch does not have aggregate="true". Set it to use aggregate on attribute ${name}.`, at, "aggregate"));
		}
		if (groupBy) {
			aggregate.push(error("aggregate-not-set", `fetch does not have aggregate="true". Set it to use groupby on attribute ${name}.`, at, "groupby"));
		}
	}
	return [...checkColumn(context, at, "name").diagnostics, ...checkAliasDefinition(context, at), ...aggregate];
};

const checkOrder = (context: Context, at: Located): Diagnostic[] => {
	const alias = present(at.element, "alias");
	const undefinedAlias =
		alias !== undefined && !context.attributeAliases.has(alias) ? [error("undefined-alias", `No attribute has the alias ${alias}.`, at, "alias")] : [];
	const aggregate =
		context.aggregate && alias === undefined && present(at.element, "attribute") !== undefined
			? [error("aggregate-order", "In an aggregate Query, order cannot use attribute. Use alias.", at, "attribute")]
			: [];
	return [...checkEntityName(context, at, "attribute"), ...checkColumn(context, at, "attribute").diagnostics, ...undefinedAlias, ...aggregate];
};

const checkLinkEntity = (context: Context, at: Located): Diagnostic[] => [
	...checkTable(context, at),
	...checkColumn(context, at, "from").diagnostics,
	...checkColumn(context, at, "to").diagnostics,
	...checkAliasDefinition(context, at),
];

const checkValueOf = (context: Context, at: Located): Diagnostic[] => {
	const reference = present(at.element, "valueof");
	if (reference === undefined) {
		return [];
	}
	const resolved = resolveValueOf(context.document, at.path, reference);
	if (resolved.kind === "unknown-alias") {
		return [error("undefined-alias", `valueof ${reference} refers to ${resolved.alias}. No link-entity has this alias or name.`, at, "valueof")];
	}
	if (resolved.kind !== "column") {
		return [];
	}
	const lookup = context.metadata(resolved.tableLogicalName);
	if (lookup.state !== "loaded" || columnOf(lookup.table, resolved.columnLogicalName)) {
		return [];
	}
	return [error("missing-column", `Column ${resolved.columnLogicalName} is not in Table ${resolved.tableLogicalName}.`, at, "valueof")];
};

type ConditionValue = { readonly text: string; readonly at: Located; readonly attribute?: string };

const conditionValues = (at: Located): ConditionValue[] => {
	const own = attributeValue(at.element, "value");
	const fromAttribute: ConditionValue[] = own === undefined ? [] : [{ text: own.trim(), at, attribute: "value" }];
	const fromChildren = at.element.children.flatMap((child, index): ConditionValue[] =>
		child.kind === "element" && !child.excluded && child.name === "value"
			? [
					{
						text: child.children
							.map((node) => (node.kind === "text" ? node.value : ""))
							.join("")
							.trim(),
						at: { element: child, path: [...at.path, index] },
					},
				]
			: []
	);
	return [...fromAttribute, ...fromChildren];
};

const countProblem = (operator: OperatorDefinition, count: number): string | undefined => {
	const has = `The condition has ${count}`;
	if (operator.values === "none" && count !== 0) {
		return `Operator ${operator.name} takes no value. ${has}.`;
	}
	if (operator.values === "one" && count !== 1) {
		return `Operator ${operator.name} takes one value. ${has}.`;
	}
	if (operator.values === "two" && count !== 2) {
		return `Operator ${operator.name} takes two values. ${has}.`;
	}
	if (operator.values === "list" && count === 0) {
		return `Operator ${operator.name} takes one or more values. The condition has none.`;
	}
	return undefined;
};

const takesDate = (operator: OperatorDefinition): boolean => operator.valueKind === "column" && operator.columnTypes.includes("dateTime");

const fitsType = (type: QueryColumnType, text: string, operator: OperatorDefinition): boolean => {
	switch (type) {
		case "wholeNumber":
		case "choice":
		case "multiChoice":
		case "stateOrStatus":
			return WHOLE.test(text);
		case "decimalOrMoney":
			return DECIMAL.test(text);
		case "lookup":
		case "owner":
		case "uniqueIdentifier":
			return GUID.test(text);
		case "yesNo":
			return BOOLEAN_VALUES.includes(text.toLowerCase());
		case "dateTime":
			return !takesDate(operator) || (DATE.test(text) && !Number.isNaN(Date.parse(text.replace(" ", "T"))));
		default:
			return true;
	}
};

const checkValue = (operator: OperatorDefinition, column: QueryColumn | undefined, value: ConditionValue): Diagnostic[] => {
	if (operator.valueKind === "integer") {
		return WHOLE.test(value.text)
			? []
			: [error("value-type", `"${value.text}" is not a whole number. Operator ${operator.name} takes a whole number.`, value.at, value.attribute)];
	}
	const type = column?.columnType;
	if (!column || !type) {
		return [];
	}
	if (!fitsType(type, value.text, operator)) {
		return [
			error(
				"value-type",
				`"${value.text}" is not a valid value. Column ${column.logicalName} holds ${COLUMN_TYPE_HOLDS[type]}.`,
				value.at,
				value.attribute
			),
		];
	}
	const isChoice = type === "choice" || type === "multiChoice" || type === "stateOrStatus";
	if (isChoice && column.options.length > 0 && !column.options.some((option) => option.value === Number.parseInt(value.text, 10))) {
		return [diagnostic("warning", "choice-option", `Column ${column.logicalName} has no option ${value.text}.`, value.at, value.attribute)];
	}
	return [];
};

const checkOperator = (at: Located, operator: OperatorDefinition, column: QueryColumn | undefined): Diagnostic[] => {
	const valueOf = present(at.element, "valueof") !== undefined;
	const values = conditionValues(at);
	const count = valueOf
		? values.length > 0
			? [error("value-count", `A condition with valueof takes no value. This condition has ${plural(values.length, "value")}.`, at, "valueof")]
			: []
		: (() => {
				const problem = countProblem(operator, values.length);
				return problem === undefined ? [] : [error("value-count", problem, at, "operator")];
			})();
	if (operator.deprecated) {
		return [diagnostic("warning", "deprecated-operator", `Operator ${operator.name} is an old spelling of ne. Use ne.`, at, "operator"), ...count];
	}
	const type = column?.columnType;
	if (column && type) {
		if (!operator.columnTypes.includes(type)) {
			return [
				error(
					"operator-column-type",
					`Operator ${operator.name} does not apply to Column ${column.logicalName}. Use an operator for ${COLUMN_TYPE_LABEL[type]}.`,
					at,
					"operator"
				),
				...count,
			];
		}
		if (operator.requiresTime && column.dateOnly) {
			return [
				error("operator-column-type", `Operator ${operator.name} needs a time. Column ${column.logicalName} holds only a date.`, at, "operator"),
				...count,
			];
		}
	}
	const valueTypes = valueOf ? [] : values.flatMap((value) => checkValue(operator, column, value));
	return [...count, ...valueTypes];
};

const checkCondition = (context: Context, at: Located): Diagnostic[] => {
	const entityName = checkEntityName(context, at, "attribute");
	const column = checkColumn(context, at, "attribute");
	const valueOf = checkValueOf(context, at);
	const operatorName = present(at.element, "operator");
	const operator = operatorName === undefined ? undefined : operatorDefinition(operatorName.toLowerCase());
	const operatorChecks = operator ? checkOperator(at, operator, column.column) : [];
	return [...entityName, ...column.diagnostics, ...valueOf, ...operatorChecks];
};

const checkSpecific = (context: Context, at: Located): Diagnostic[] => {
	switch (at.element.name) {
		case "fetch":
			return checkFetch(at);
		case "entity":
			return checkTable(context, at);
		case "link-entity":
			return checkLinkEntity(context, at);
		case "attribute":
			return checkAttribute(context, at);
		case "all-attributes":
			return context.aggregate ? [error("aggregate-all-attributes", "An aggregate Query cannot use all-attributes.", at)] : [];
		case "order":
			return checkOrder(context, at);
		case "condition":
			return checkCondition(context, at);
		default:
			return [];
	}
};

const visit = (context: Context, at: Located, into: Diagnostic[]): void => {
	into.push(...checkAttributeValues(at), ...checkRequired(at), ...checkSpecific(context, at));
	const limits = new Map((elementDefinition(at.element.name)?.children ?? []).map((rule) => [rule.name, rule.max]));
	const counts = new Map<string, number>();
	at.element.children.forEach((child, index) => {
		if (child.kind !== "element" || child.excluded) {
			return;
		}
		const childAt: Located = { element: child, path: [...at.path, index] };
		if (!isKnownElement(child.name)) {
			into.push(diagnostic("info", "unknown-element", `Element ${child.name} is not in the Fetch XML reference. It stays as written.`, childAt));
			return;
		}
		if (!isValidChild(at.element.name, child.name)) {
			into.push(error("invalid-child", `${child.name} is not valid inside ${at.element.name}.`, childAt));
		}
		const count = (counts.get(child.name) ?? 0) + 1;
		counts.set(child.name, count);
		const max = limits.get(child.name);
		if (max !== undefined && count === max + 1) {
			into.push(
				error("child-limit", `${at.element.name} can hold at most ${formatNumber(max)} ${child.name} ${max === 1 ? "element" : "elements"}.`, childAt)
			);
		}
		visit(context, childAt, into);
	});
};

const contextFor = (document: FetchXmlDocument, metadata: QueryMetadata): Context => {
	const aliases = aliasesIn(document);
	const seen = new Set<string>();
	const duplicates = new Set<string>();
	for (const definition of aliases) {
		const id = `${definition.definedBy}:${definition.alias}`;
		if (seen.has(id)) {
			duplicates.add(pathKey(definition.path));
		}
		seen.add(id);
	}
	return {
		document,
		metadata,
		aggregate: document.root.name === "fetch" && isTrue(attributeValue(document.root, "aggregate")),
		duplicates,
		attributeAliases: new Set(aliases.filter((definition) => definition.definedBy === "attribute").map((definition) => definition.alias)),
	};
};

export const validate = (document: FetchXmlDocument, metadata: QueryMetadata): readonly Diagnostic[] => {
	const root: Located = { element: document.root, path: [] };
	if (document.root.name !== "fetch") {
		return [error("root-element", `The root element is ${document.root.name}. It must be fetch.`, root)];
	}
	const into: Diagnostic[] = [];
	visit(contextFor(document, metadata), root, into);
	return into;
};
