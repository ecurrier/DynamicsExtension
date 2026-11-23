import { useMemo } from "react";

import { type EnumerationValue } from "@/shared/lib/fetchxml";

import { type ColumnPurpose, columnOptions, enumerationOptions, NOT_SET_OPTION, NOT_SET_VALUE, type PickerOption, tableOptions, type TableScope } from "../lib";
import { useQueryBuilder } from "../store";
import { useQueryEditing } from "./EditingContext";
import { SearchPicker } from "./SearchPicker";

const withNotSet = (options: readonly PickerOption[], optional: boolean): readonly PickerOption[] => (optional ? [NOT_SET_OPTION, ...options] : options);

const pickValue = (onChange: (value: string | null) => void) => (value: string) => onChange(value === NOT_SET_VALUE ? null : value);

interface TablePickerProps {
	label: string;
	value: string | undefined;
	optional?: boolean;
	onChange: (value: string | null) => void;
}

export const TablePicker = ({ label, value, optional = false, onChange }: TablePickerProps) => {
	const { tables } = useQueryEditing();
	const lead = useQueryBuilder((state) => state.namesLead);
	const options = useMemo(() => withNotSet(tableOptions(tables ?? [], lead), optional), [tables, lead, optional]);
	return (
		<SearchPicker
			label={label}
			kind="table"
			value={value ?? null}
			text={value}
			options={options}
			placeholder="(choose a Table)"
			onPick={pickValue(onChange)}
		/>
	);
};

interface ColumnPickerProps {
	label: string;
	scope: TableScope;
	value: string | undefined;
	purpose?: ColumnPurpose;
	optional?: boolean;
	onChange: (value: string | null) => void;
}

export const ColumnPicker = ({ label, scope, value, purpose = "filter", optional = false, onChange }: ColumnPickerProps) => {
	const lead = useQueryBuilder((state) => state.namesLead);
	const table = scope.state === "loaded" ? scope.table : undefined;
	const options = useMemo(() => withNotSet(table ? columnOptions(table, lead, purpose) : [], optional), [table, lead, purpose, optional]);
	return (
		<SearchPicker
			label={label}
			kind="column"
			value={value ?? null}
			text={value}
			options={options}
			placeholder={scope.state === "none" ? "(no Table)" : "(choose a Column)"}
			onPick={pickValue(onChange)}
		/>
	);
};

interface EnumPickerProps {
	label: string;
	value: string | undefined;
	values: readonly EnumerationValue[];
	optional?: boolean;
	placeholder?: string;
	onChange: (value: string | null) => void;
}

export const EnumPicker = ({ label, value, values, optional = false, placeholder, onChange }: EnumPickerProps) => {
	const options = useMemo(() => withNotSet(enumerationOptions(values), optional), [values, optional]);
	return (
		<SearchPicker label={label} kind="enum" value={value ?? null} text={value} options={options} placeholder={placeholder} onPick={pickValue(onChange)} />
	);
};

interface OptionPickerProps {
	label: string;
	value: string | undefined;
	options: readonly PickerOption[];
	optional?: boolean;
	kind?: "enum" | "alias" | "value";
	placeholder?: string;
	onChange: (value: string | null) => void;
}

export const OptionPicker = ({ label, value, options, optional = false, kind = "enum", placeholder, onChange }: OptionPickerProps) => {
	const choices = useMemo(() => withNotSet(options, optional), [options, optional]);
	return (
		<SearchPicker label={label} kind={kind} value={value ?? null} text={value} options={choices} placeholder={placeholder} onPick={pickValue(onChange)} />
	);
};
