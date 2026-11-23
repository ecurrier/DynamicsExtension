import { Dropdown, makeStyles, Option, Tooltip } from "@fluentui/react-components";

import { type ResultGridColumn } from "../lib";

const useStyles = makeStyles({
	dropdown: {
		minWidth: "150px",
		maxWidth: "260px",
	},
});

interface ColumnsDropdownProps {
	label: string;
	choices: readonly ResultGridColumn[];
	selected: readonly string[];
	summary: string;
	hint?: string;
	disabled?: boolean;
	onChange: (selected: string[]) => void;
}

export const ColumnsDropdown = ({ label, choices, selected, summary, hint, disabled, onChange }: ColumnsDropdownProps) => {
	const styles = useStyles();
	const dropdown = (
		<Dropdown
			multiselect
			size="small"
			className={styles.dropdown}
			aria-label={label}
			disabled={disabled}
			placeholder="Select Columns"
			value={summary}
			title={hint ? undefined : summary}
			selectedOptions={[...selected]}
			onOptionSelect={(_, data) => onChange(data.selectedOptions)}>
			{choices.map((column) => (
				<Option key={column.key} value={column.key} text={column.label}>
					{column.label}
				</Option>
			))}
		</Dropdown>
	);
	return hint ? (
		<Tooltip content={hint} relationship="description" positioning="above">
			{dropdown}
		</Tooltip>
	) : (
		dropdown
	);
};
