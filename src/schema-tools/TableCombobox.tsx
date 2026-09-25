import { Combobox, Option } from "@fluentui/react-components";
import { useMemo, useState } from "react";

import { type EntitySummary } from "@/shared/types";

const MAX_OPTIONS = 60;

interface TableComboboxProps {
	id: string;
	tables: EntitySummary[];
	value: string;
	onChange: (logicalName: string) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
}

const tableName = (table: EntitySummary): string => table.displayName || table.logicalName;

export const TableCombobox = ({ id, tables, value, onChange, placeholder, disabled = false, className }: TableComboboxProps) => {
	const [query, setQuery] = useState<string | null>(null);
	const term = (query ?? "").trim().toLowerCase();
	const options = useMemo(
		() =>
			(term ? tables.filter((table) => table.logicalName.includes(term) || table.displayName.toLowerCase().includes(term)) : tables).slice(
				0,
				MAX_OPTIONS
			),
		[tables, term]
	);
	const selected = tables.find((table) => table.logicalName === value);

	return (
		<Combobox
			id={id}
			className={className}
			disabled={disabled}
			placeholder={placeholder}
			value={query ?? (selected ? tableName(selected) : "")}
			selectedOptions={value ? [value] : []}
			onChange={(event) => setQuery(event.target.value)}
			onOpenChange={(_, data) => {
				if (!data.open) {
					setQuery(null);
				}
			}}
			onOptionSelect={(_, data) => {
				if (data.optionValue) {
					onChange(data.optionValue);
				}
				setQuery(null);
			}}>
			{options.length === 0 ? (
				<Option value="" text="" disabled>
					No tables match
				</Option>
			) : (
				options.map((table) => (
					<Option key={table.logicalName} value={table.logicalName} text={tableName(table)}>
						{`${tableName(table)} (${table.logicalName})`}
					</Option>
				))
			)}
		</Combobox>
	);
};
