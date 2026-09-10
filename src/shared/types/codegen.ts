export type TemplateKind = "table" | "choice";

export type TemplateLanguage = "csharp" | "typescript" | "javascript";

export const TEMPLATE_KINDS: readonly TemplateKind[] = ["table", "choice"];

export const TEMPLATE_KIND_LABELS: Record<TemplateKind, string> = { table: "Table class", choice: "Choice" };

export const TEMPLATE_LANGUAGES: { value: TemplateLanguage; label: string }[] = [
	{ value: "csharp", label: "C#" },
	{ value: "typescript", label: "TypeScript" },
	{ value: "javascript", label: "JavaScript" },
];

export interface TemplateSetting {
	key: string;
	label: string;
	default: string;
}

export interface Template {
	id: string;
	name: string;
	kind: TemplateKind;
	language: TemplateLanguage;
	text: string;
	settings: TemplateSetting[];
	filenamePattern: string;
	builtIn: boolean;
	updatedAt: string;
}

export type Templates = Record<string, Template>;

export type TemplateDefaults = Partial<Record<TemplateKind, string>>;

export type ColumnRequiredLevel = "None" | "SystemRequired" | "ApplicationRequired" | "Recommended";

export type DateTimeBehavior = "UserLocal" | "DateOnly" | "TimeZoneIndependent";

export interface CodegenChoiceOption {
	value: number;
	label: string;
}

export interface CodegenOptionSet {
	name: string;
	displayName: string;
	isGlobal: boolean;
	options: CodegenChoiceOption[];
}

export interface CodegenLookupTarget {
	logicalName: string;
	navigationProperty: string;
	entitySetName: string | null;
}

export interface CodegenColumn {
	logicalName: string;
	schemaName: string;
	displayName: string;
	attributeType: string;
	typeName: string;
	attributeOf: string | null;
	isPrimaryId: boolean;
	isPrimaryName: boolean;
	isCustom: boolean;
	isLogical: boolean;
	isValidForCreate: boolean;
	isValidForUpdate: boolean;
	isValidForRead: boolean;
	requiredLevel: ColumnRequiredLevel;
	maxLength: number | null;
	precision: number | null;
	dateTimeBehavior: DateTimeBehavior | null;
	dateTimeFormat: "DateOnly" | "DateAndTime" | null;
	targets: CodegenLookupTarget[];
	optionSet: CodegenOptionSet | null;
}

export interface CodegenTable {
	logicalName: string;
	schemaName: string;
	displayName: string;
	displayCollectionName: string;
	entitySetName: string;
	primaryIdAttribute: string;
	primaryNameAttribute: string | null;
	isCustom: boolean;
	columns: CodegenColumn[];
}

export interface CodegenChoice {
	name: string;
	displayName: string;
	isGlobal: boolean;
	tableLogicalName: string | null;
	columnLogicalName: string | null;
	options: CodegenChoiceOption[];
}

export interface CodegenPreferences {
	settings: Record<string, Record<string, string>>;
	history: Record<string, string[]>;
}

export const EMPTY_CODEGEN_PREFERENCES: CodegenPreferences = { settings: {}, history: {} };
