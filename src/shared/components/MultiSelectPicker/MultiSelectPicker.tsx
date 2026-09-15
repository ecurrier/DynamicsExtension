import { Combobox, Field, makeStyles, Option, Tag, TagGroup, Text, tokens } from "@fluentui/react-components";
import { useMemo, useState } from "react";

import { filterOptions, optionLabel, type PickerOption } from "./filterOptions";

const useStyles = makeStyles({
	root: { display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 },
	empty: { color: tokens.colorNeutralForeground3, padding: "4px 0" },
});

interface MultiSelectPickerProps {
	label: string;
	options: PickerOption[];
	selected: string[];
	onChange: (selected: string[]) => void;
	placeholder?: string;
	disabled?: boolean;
	hint?: string;
}

export const MultiSelectPicker = ({ label, options, selected, onChange, placeholder = "Search...", disabled = false, hint }: MultiSelectPickerProps) => {
	const styles = useStyles();
	const [query, setQuery] = useState("");
	const visible = useMemo(() => filterOptions(options, query), [options, query]);

	return (
		<Field label={label} hint={hint}>
			<div className={styles.root}>
				{selected.length > 0 ? (
					<TagGroup onDismiss={(_, data) => onChange(selected.filter((value) => value !== data.value))}>
						{selected.map((value) => (
							<Tag key={value} value={value} dismissible size="small">
								{optionLabel(options, value)}
							</Tag>
						))}
					</TagGroup>
				) : null}
				<Combobox
					multiselect
					disabled={disabled}
					placeholder={placeholder}
					value={query}
					selectedOptions={selected}
					onChange={(event) => setQuery(event.target.value)}
					onOptionSelect={(_, data) => onChange(data.selectedOptions)}>
					{visible.length === 0 ? (
						<Text size={200} className={styles.empty}>
							Nothing matches that.
						</Text>
					) : (
						visible.map((option) => (
							<Option key={option.value} value={option.value} text={option.label}>
								{option.label}
							</Option>
						))
					)}
				</Combobox>
			</div>
		</Field>
	);
};
