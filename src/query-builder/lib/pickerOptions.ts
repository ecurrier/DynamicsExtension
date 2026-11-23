import { aliasesIn, type EnumerationValue, type FetchXmlDocument, linkEntityReferences } from "@/shared/lib/fetchxml";
import { type QueryColumn, type QueryTable, type QueryTableSummary } from "@/shared/types";

import { normalizeYesNo } from "./conditionEditing";
import { type PickerOption } from "./pickerSearch";
import { type NamesLead } from "./rowSummary";

export const NOT_SET_VALUE = "";

export const NOT_SET_OPTION: PickerOption = { value: NOT_SET_VALUE, text: "(not set)" };

const named = (logical: string, display: string, lead: NamesLead, extra: readonly string[] = []): Omit<PickerOption, "value"> => {
	const other = display.trim() === "" || display === logical ? undefined : display;
	if (other === undefined) {
		return { text: logical, keys: extra };
	}
	return lead === "display" ? { text: other, secondary: logical, keys: [logical, ...extra] } : { text: logical, secondary: other, keys: [other, ...extra] };
};

export const tableOptions = (tables: readonly Pick<QueryTableSummary, "logicalName" | "displayName">[], lead: NamesLead): PickerOption[] =>
	tables.map((table) => ({ value: table.logicalName, ...named(table.logicalName, table.displayName, lead) }));

export type ColumnPurpose = "read" | "filter";

export const pickableColumns = (table: QueryTable, purpose: ColumnPurpose): QueryColumn[] =>
	table.columns.filter((column) => column.attributeOf === null && (purpose === "filter" || column.isValidForRead));

export const columnOptions = (table: QueryTable, lead: NamesLead, purpose: ColumnPurpose = "filter"): PickerOption[] =>
	pickableColumns(table, purpose).map((column) => ({ value: column.logicalName, ...named(column.logicalName, column.displayName, lead) }));

export const choiceOptions = (column: QueryColumn | undefined): PickerOption[] =>
	(column?.options ?? []).map((option) => ({
		value: String(option.value),
		text: `${option.label} · ${option.value}`,
		keys: [option.label, String(option.value)],
	}));

export const yesNoOptions = (column: QueryColumn | undefined): PickerOption[] => {
	const labelled = choiceOptions(column).filter((option) => ["0", "1"].includes(option.value));
	return labelled.length === 2
		? labelled
		: [
				{ value: "0", text: "No · 0", keys: ["false"] },
				{ value: "1", text: "Yes · 1", keys: ["true"] },
			];
};

export const choiceValue = (value: string, kind: "choice" | "yesNo"): string => (kind === "yesNo" ? normalizeYesNo(value) : value.trim());

export const enumerationOptions = (values: readonly EnumerationValue[]): PickerOption[] =>
	values.map((each) => ({ value: each.value, text: each.value, secondary: each.description }));

export const attributeAliasOptions = (document: FetchXmlDocument): PickerOption[] =>
	aliasesIn(document)
		.filter((alias) => alias.definedBy === "attribute")
		.map((alias) => ({ value: alias.alias, text: alias.alias, secondary: alias.columnLogicalName ?? undefined }));

export const linkReferenceOptions = (document: FetchXmlDocument): PickerOption[] =>
	linkEntityReferences(document).map((link) => ({
		value: link.reference,
		text: link.reference,
		secondary: link.alias !== null && link.tableLogicalName !== null ? link.tableLogicalName : undefined,
	}));
