import {
	attributeDefinition,
	attributesOf,
	type ColumnType,
	columnOf,
	elementDefinition,
	OPERATORS,
	type OperatorDefinition,
	operatorsFor,
	type QueryMetadata,
} from "@/shared/lib/fetchxml";
import type { QueryColumn, QueryTableSummary } from "@/shared/types";

import {
	type AttributeNameContext,
	type AttributeValueContext,
	type ClosingTagContext,
	type CompletionContext,
	type CompletionScope,
	type ElementNameContext,
	type ValueTextContext,
} from "./completionContext";

export type CompletionKind = "element" | "attribute" | "value" | "table" | "column" | "operator" | "alias";

export type CompletionApply = { readonly insert: string; readonly cursorOffset: number };

export type CompletionItem = {
	readonly label: string;
	readonly value: string;
	readonly detail?: string;
	readonly description?: string;
	readonly kind: CompletionKind;
	readonly rank: number;
	readonly apply?: CompletionApply;
};

export type CompletionNames = "display" | "logical";

export type CompletionOptions = { readonly names: CompletionNames; readonly tables: readonly QueryTableSummary[] };

export type CompletionResult = {
	readonly from: number;
	readonly to: number;
	readonly typed: string;
	readonly items: readonly CompletionItem[];
	readonly pendingTables: readonly string[];
};

type Candidate = Omit<CompletionItem, "rank"> & { readonly common?: boolean; readonly matches?: readonly string[] };

type Collector = {
	readonly metadata: QueryMetadata;
	readonly pending: string[];
};

const CHOICE_TYPES: readonly ColumnType[] = ["choice", "multiChoice", "stateOrStatus", "yesNo"];

const YES_NO_FALLBACK = [
	{ value: 0, label: "No" },
	{ value: 1, label: "Yes" },
];

const EMPTY: CompletionResult = { from: 0, to: 0, typed: "", items: [], pendingTables: [] };

const rankOf = (typed: string, candidate: Candidate): number => {
	const needle = typed.trim().toLowerCase();
	const texts = [candidate.value, candidate.label, ...(candidate.matches ?? [])];
	const prefix = needle !== "" && texts.some((text) => text.toLowerCase().startsWith(needle));
	return (prefix ? 0 : 2) + (candidate.common ? 0 : 1);
};

const ranked = (typed: string, candidates: readonly Candidate[]): CompletionItem[] =>
	candidates
		.map((candidate, index) => {
			const { common: _common, matches: _matches, ...item } = candidate;
			return { item: { ...item, rank: rankOf(typed, candidate) }, index };
		})
		.sort((left, right) => left.item.rank - right.item.rank || left.index - right.index)
		.map(({ item }) => item);

const result = (context: { from: number; to: number; typed: string }, candidates: readonly Candidate[], pending: readonly string[] = []): CompletionResult => ({
	from: context.from,
	to: context.to,
	typed: context.typed,
	items: ranked(context.typed, candidates),
	pendingTables: [...new Set(pending)],
});

const byLabel = (left: Candidate, right: Candidate): number => left.label.localeCompare(right.label);

const lookupTable = (collector: Collector, tableLogicalName: string | null) => {
	if (tableLogicalName === null) {
		return undefined;
	}
	const lookup = collector.metadata(tableLogicalName);
	if (lookup.state === "pending") {
		collector.pending.push(tableLogicalName);
	}
	return lookup.state === "loaded" ? lookup.table : undefined;
};

const pickable = (column: QueryColumn): boolean => column.attributeOf === null && column.isValidForRead;

const named = (names: CompletionNames, logicalName: string, displayName: string): { label: string; detail: string | undefined } => {
	const display = displayName.trim() === "" ? undefined : displayName;
	return names === "display" && display ? { label: display, detail: logicalName } : { label: logicalName, detail: display };
};

const INSERTED_ATTRIBUTES: Readonly<Record<string, readonly string[]>> = { condition: ["attribute", "operator"] };

const insertedAttributes = (name: string): readonly string[] =>
	INSERTED_ATTRIBUTES[name] ??
	attributesOf(name)
		.filter((attribute) => attribute.required)
		.map((attribute) => attribute.name);

const elementInsert = (name: string): CompletionApply => {
	const definition = elementDefinition(name);
	const required = insertedAttributes(name);
	const selfClosing = name === "condition" || (definition !== undefined && definition.children.length === 0 && !definition.text);
	const attributes = required.map((attribute) => ` ${attribute}=""`).join("");
	const insert = `${name}${attributes}${selfClosing ? "/>" : `></${name}>`}`;
	const [first] = required;
	if (first) {
		return { insert, cursorOffset: name.length + ` ${first}="`.length };
	}
	return { insert, cursorOffset: selfClosing ? insert.length : name.length + 1 };
};

const elementCompletions = (context: ElementNameContext): CompletionResult => {
	const allowed =
		context.parent === null
			? context.siblings.length === 0
				? [{ name: "fetch" }]
				: []
			: (elementDefinition(context.parent)?.children ?? []).filter(
					(rule) => rule.max === undefined || context.siblings.filter((sibling) => sibling === rule.name).length < rule.max
				);
	const candidates = allowed.map(({ name }): Candidate => {
		const description = elementDefinition(name)?.description;
		return {
			label: name,
			value: name,
			kind: "element",
			common: true,
			...(description ? { description } : {}),
			...(context.bare ? { apply: elementInsert(name) } : {}),
		};
	});
	return result(context, candidates);
};

const closingCompletions = (context: ClosingTagContext): CompletionResult =>
	result(
		context,
		context.open.map((name, index): Candidate => ({
			label: name,
			value: name,
			kind: "element",
			common: index === 0,
			...(context.terminated ? {} : { apply: { insert: `${name}>`, cursorOffset: name.length + 1 } }),
		}))
	);

const attributeNameCompletions = (context: AttributeNameContext): CompletionResult => {
	const candidates = attributesOf(context.element)
		.filter((definition) => !context.present.includes(definition.name))
		.map((definition): Candidate => ({
			label: definition.name,
			value: definition.name,
			kind: "attribute",
			description: definition.description,
			common: definition.common || definition.required,
			...(definition.required ? { detail: "required" } : {}),
			...(context.hasValue ? {} : { apply: { insert: `${definition.name}=""`, cursorOffset: definition.name.length + 2 } }),
		}));
	return result(context, candidates);
};

const tableCandidates = (options: CompletionOptions): Candidate[] =>
	options.tables
		.map((table): Candidate => ({
			...named(options.names, table.logicalName, table.displayName),
			value: table.logicalName,
			kind: "table",
			matches: [table.displayName],
		}))
		.sort(byLabel);

const columnCandidates = (collector: Collector, options: CompletionOptions, tableLogicalName: string | null): Candidate[] =>
	(lookupTable(collector, tableLogicalName)?.columns ?? [])
		.filter(pickable)
		.map((column): Candidate => ({
			...named(options.names, column.logicalName, column.displayName),
			value: column.logicalName,
			kind: "column",
			description: column.attributeType,
			matches: [column.displayName],
		}))
		.sort(byLabel);

const valueOfCandidates = (collector: Collector, options: CompletionOptions, scope: CompletionScope): Candidate[] =>
	scope.valueOfTargets.flatMap((target) =>
		(lookupTable(collector, target.tableLogicalName)?.columns ?? [])
			.filter(pickable)
			.map((column): Candidate => {
				const reference = target.prefix === null ? column.logicalName : `${target.prefix}.${column.logicalName}`;
				const display = target.prefix === null ? column.displayName : `${target.prefix}.${column.displayName}`;
				return {
					...named(options.names, reference, display),
					value: reference,
					kind: "column",
					matches: [column.displayName],
					common: target.prefix === null,
				};
			})
			.sort(byLabel)
	);

const conditionColumn = (collector: Collector, scope: CompletionScope): QueryColumn | undefined => {
	if (!scope.column) {
		return undefined;
	}
	const table = lookupTable(collector, scope.column.tableLogicalName);
	return table ? columnOf(table, scope.column.columnLogicalName) : undefined;
};

const operatorCandidates = (collector: Collector, scope: CompletionScope): Candidate[] => {
	const column = conditionColumn(collector, scope);
	const operators: readonly OperatorDefinition[] = column?.columnType
		? operatorsFor(column.columnType).filter((operator) => !(operator.requiresTime && column.dateOnly))
		: OPERATORS.filter((operator) => !operator.deprecated);
	return operators.map((operator) => ({
		label: operator.name,
		value: operator.name,
		detail: operator.meaning,
		kind: "operator",
		common: true,
		matches: [operator.meaning],
	}));
};

const optionCandidates = (collector: Collector, scope: CompletionScope): Candidate[] => {
	const column = conditionColumn(collector, scope);
	if (!column?.columnType || !CHOICE_TYPES.includes(column.columnType)) {
		return [];
	}
	const options = column.options.length === 0 && column.columnType === "yesNo" ? YES_NO_FALLBACK : column.options;
	return options.map((option) => ({
		label: String(option.value),
		value: String(option.value),
		detail: option.label,
		kind: "value",
		common: true,
		matches: [option.label],
	}));
};

const linkCandidates = (scope: CompletionScope): Candidate[] =>
	scope.links.map((link) => ({
		label: link.reference,
		value: link.reference,
		kind: "alias",
		common: true,
		...(link.tableLogicalName && link.tableLogicalName !== link.reference ? { detail: link.tableLogicalName } : {}),
	}));

const attributeAliasCandidates = (scope: CompletionScope): Candidate[] =>
	scope.aliases
		.filter((alias) => alias.definedBy === "attribute")
		.map((alias) => ({
			label: alias.alias,
			value: alias.alias,
			kind: "alias",
			common: true,
			...(alias.columnLogicalName ? { detail: alias.columnLogicalName } : {}),
		}));

const attributeValueCandidates = (context: AttributeValueContext, collector: Collector, options: CompletionOptions): Candidate[] => {
	const { element, attribute, scope } = context;
	if (element === "condition" && attribute === "operator") {
		return operatorCandidates(collector, scope);
	}
	if (element === "condition" && attribute === "value") {
		return optionCandidates(collector, scope);
	}
	if (element === "condition" && attribute === "valueof") {
		return valueOfCandidates(collector, options, scope);
	}
	const definition = attributeDefinition(element, attribute);
	switch (definition?.value.kind) {
		case "enumeration":
			return definition.value.values.map((entry) => ({ label: entry.value, value: entry.value, detail: entry.description, kind: "value" }));
		case "boolean":
			return [
				{ label: "true", value: "true", kind: "value" },
				{ label: "false", value: "false", kind: "value" },
			];
		case "table":
			return tableCandidates(options);
		case "column":
			return columnCandidates(collector, options, scope.tableLogicalName);
		case "alias":
			return attribute === "alias" ? attributeAliasCandidates(scope) : linkCandidates(scope);
		default:
			return [];
	}
};

const multipleSegment = (context: AttributeValueContext): { from: number; to: number; typed: string } => {
	const start = context.typed.lastIndexOf(",") + 1;
	const cursor = context.typed.length;
	const next = context.value.indexOf(",", cursor);
	const end = next < 0 ? context.value.length : next;
	const leading = context.typed.slice(start).length - context.typed.slice(start).trimStart().length;
	return { from: context.from + start + leading, to: context.from + end, typed: context.typed.slice(start + leading) };
};

const quotedInsert = (candidate: Candidate): Candidate => ({
	...candidate,
	apply: { insert: `"${candidate.value}"`, cursorOffset: candidate.value.length + 2 },
});

const attributeValueCompletions = (context: AttributeValueContext, metadata: QueryMetadata, options: CompletionOptions): CompletionResult => {
	const collector: Collector = { metadata, pending: [] };
	const candidates = attributeValueCandidates(context, collector, options);
	const definition = attributeDefinition(context.element, context.attribute);
	const multiple = definition?.value.kind === "enumeration" && definition.value.multiple && context.quoted;
	const range = multiple ? multipleSegment(context) : context;
	return result(range, context.quoted ? candidates : candidates.map(quotedInsert), collector.pending);
};

const valueTextCompletions = (context: ValueTextContext, metadata: QueryMetadata): CompletionResult => {
	const collector: Collector = { metadata, pending: [] };
	return result(context, optionCandidates(collector, context.scope), collector.pending);
};

export const completionsFor = (context: CompletionContext, metadata: QueryMetadata, options: CompletionOptions): CompletionResult => {
	switch (context.kind) {
		case "element-name":
			return elementCompletions(context);
		case "closing-tag":
			return closingCompletions(context);
		case "attribute-name":
			return attributeNameCompletions(context);
		case "attribute-value":
			return attributeValueCompletions(context, metadata, options);
		case "value-text":
			return valueTextCompletions(context, metadata);
		case "none":
			return EMPTY;
	}
};
