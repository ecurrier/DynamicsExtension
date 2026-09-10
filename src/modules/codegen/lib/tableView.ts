import { type CodegenColumn, type CodegenTable, type TemplateLanguage } from "@/shared/types";

import { choiceIdentifier, optionSetDisplayName } from "./choiceView";
import { camelCase, identifierFor } from "./identifiers";
import { type ColumnKind, columnKind, csharpType, typeFor, typescriptType } from "./typeMap";

export const SYSTEM_COLUMNS: readonly string[] = [
	"importsequencenumber",
	"overriddencreatedon",
	"timezoneruleversionnumber",
	"utcconversiontimezonecode",
	"versionnumber",
];

export interface TableViewOptions {
	language: TemplateLanguage;
	includeSystemColumns: boolean;
	settings: Record<string, string>;
}

export interface TargetView {
	logicalName: string;
	navigationProperty: string;
	entitySetName: string | null;
	identifier: string;
}

export interface ColumnView {
	logicalName: string;
	schemaName: string;
	displayName: string;
	identifier: string;
	identifierCamel: string;
	kind: ColumnKind;
	type: string;
	csType: string;
	tsType: string;
	attributeType: string;
	isPrimaryId: boolean;
	isPrimaryName: boolean;
	isRequired: boolean;
	isCustom: boolean;
	isLookup: boolean;
	isChoice: boolean;
	isMultiChoice: boolean;
	isDateOnly: boolean;
	isValidForCreate: boolean;
	isValidForUpdate: boolean;
	maxLength: number | null;
	precision: number | null;
	targets: TargetView[];
	choiceName: string | null;
	choiceIdentifier: string | null;
	isFirst: boolean;
	isLast: boolean;
}

export interface TableInfoView {
	logicalName: string;
	schemaName: string;
	displayName: string;
	displayCollectionName: string;
	entitySetName: string;
	primaryIdAttribute: string;
	primaryNameAttribute: string | null;
	identifier: string;
	identifierCamel: string;
	isCustom: boolean;
}

export interface TableView {
	table: TableInfoView;
	columns: ColumnView[];
	settings: Record<string, string>;
}

export const isSystemColumn = (column: CodegenColumn): boolean =>
	column.attributeOf !== null ||
	SYSTEM_COLUMNS.includes(column.logicalName) ||
	column.logicalName.endsWith("yominame") ||
	!column.isValidForRead ||
	columnKind(column) === "other";

const rank = (column: CodegenColumn): number => (column.isPrimaryId ? 0 : column.isPrimaryName ? 1 : 2);

export const orderColumns = (columns: CodegenColumn[]): CodegenColumn[] =>
	[...columns].sort((left, right) => rank(left) - rank(right) || left.logicalName.localeCompare(right.logicalName));

const toColumnView = (column: CodegenColumn, options: TableViewOptions, prefix: string, index: number, count: number): ColumnView => {
	const kind = columnKind(column);
	const identifier = identifierFor(column.schemaName, prefix);
	const choiceDisplayName = optionSetDisplayName(column);
	return {
		logicalName: column.logicalName,
		schemaName: column.schemaName,
		displayName: column.displayName,
		identifier,
		identifierCamel: camelCase(identifier),
		kind,
		type: typeFor(kind, options.language),
		csType: csharpType(kind),
		tsType: typescriptType(kind),
		attributeType: column.attributeType,
		isPrimaryId: column.isPrimaryId,
		isPrimaryName: column.isPrimaryName,
		isRequired: column.requiredLevel === "SystemRequired" || column.requiredLevel === "ApplicationRequired",
		isCustom: column.isCustom,
		isLookup: kind === "lookup",
		isChoice: kind === "choice",
		isMultiChoice: kind === "multiChoice",
		isDateOnly: kind === "dateOnly",
		isValidForCreate: column.isValidForCreate,
		isValidForUpdate: column.isValidForUpdate,
		maxLength: column.maxLength,
		precision: column.precision,
		targets: column.targets.map((target) => ({
			logicalName: target.logicalName,
			navigationProperty: target.navigationProperty,
			entitySetName: target.entitySetName,
			identifier: identifierFor(target.logicalName, prefix),
		})),
		choiceName: column.optionSet?.name ?? null,
		choiceIdentifier: choiceDisplayName === null ? null : choiceIdentifier(choiceDisplayName),
		isFirst: index === 0,
		isLast: index === count - 1,
	};
};

export const buildTableView = (table: CodegenTable, options: TableViewOptions): TableView => {
	const prefix = options.settings.prefix ?? "";
	const columns = orderColumns(options.includeSystemColumns ? table.columns : table.columns.filter((column) => !isSystemColumn(column)));
	const identifier = identifierFor(table.schemaName, prefix);
	return {
		table: {
			logicalName: table.logicalName,
			schemaName: table.schemaName,
			displayName: table.displayName,
			displayCollectionName: table.displayCollectionName,
			entitySetName: table.entitySetName,
			primaryIdAttribute: table.primaryIdAttribute,
			primaryNameAttribute: table.primaryNameAttribute,
			identifier,
			identifierCamel: camelCase(identifier),
			isCustom: table.isCustom,
		},
		columns: columns.map((column, index) => toColumnView(column, options, prefix, index, columns.length)),
		settings: options.settings,
	};
};
