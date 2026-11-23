import { Dropdown, makeStyles, Option } from "@fluentui/react-components";

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
	disabled?: boolean;
	onChange: (selected: string[]) => void;
}

export const ColumnsDropdown = ({ label, choices, selected, summary, disabled, onChange }: ColumnsDropdownProps) => {
	const styles = useStyles();
	return (
		<Dropdown
			multiselect
			size="small"
			className={styles.dropdown}
			aria-label={label}
			disabled={disabled}
			placeholder="Select Columns"
			value={summary}
			title={summary}
			selectedOptions={[...selected]}
			onOptionSelect={(_, data) => onChange(data.selectedOptions)}>
			{choices.map((column) => (
				<Option key={column.key} value={column.key} text={column.label}>
					{column.label}
				</Option>
			))}
		</Dropdown>
	);
};
