import {
	Button,
	Dropdown,
	makeStyles,
	Menu,
	MenuItemRadio,
	MenuList,
	type MenuProps,
	MenuPopover,
	MenuTrigger,
	Option,
	Text,
	tokens,
	Tooltip,
} from "@fluentui/react-components";
import { Filter16Filled, Filter16Regular } from "@fluentui/react-icons";

import { type CompareGridColumn } from "../lib";
import { FILTER_COLLAPSED } from "./compareBreakpoints";

const ALL = "";
const FILTER_NAME = "column";

const useStyles = makeStyles({
	wide: {
		display: "inline-flex",
		alignItems: "center",
		flexShrink: 0,
		columnGap: tokens.spacingHorizontalXS,
		[FILTER_COLLAPSED]: {
			display: "none",
		},
	},
	narrow: {
		display: "none",
		flexShrink: 0,
		[FILTER_COLLAPSED]: {
			display: "inline-flex",
		},
	},
	label: {
		color: tokens.colorNeutralForeground2,
	},
	dropdown: {
		minWidth: "130px",
		maxWidth: "200px",
	},
});

interface ColumnFilterProps {
	columns: readonly CompareGridColumn[];
	selected: string | null;
	onSelect: (column: string | null) => void;
}

const LABEL = "Show only the pairs that differ in this Column";

export const ColumnFilter = ({ columns, selected, onSelect }: ColumnFilterProps) => {
	const styles = useStyles();
	const choices = columns.flatMap((column) => (column.kind === "difference" ? [column] : []));
	const current = choices.find((column) => column.column === selected);
	const value = current ? current.column : ALL;
	const onMenuChange: MenuProps["onCheckedValueChange"] = (_, data) => onSelect(data.checkedItems[0] ? data.checkedItems[0] : null);
	return (
		<>
			<span className={styles.wide}>
				<Text size={200} className={styles.label}>
					Column
				</Text>
				<Dropdown
					size="small"
					appearance="underline"
					className={styles.dropdown}
					aria-label={LABEL}
					value={current ? current.name : "All"}
					selectedOptions={[value]}
					onOptionSelect={(_, data) => onSelect(data.optionValue ? data.optionValue : null)}>
					<Option value={ALL} text="All">
						All
					</Option>
					{choices.map((column) => (
						<Option key={column.column} value={column.column} text={column.name}>
							{column.label}
						</Option>
					))}
				</Dropdown>
			</span>
			<span className={styles.narrow}>
				<Menu checkedValues={{ [FILTER_NAME]: [value] }} onCheckedValueChange={onMenuChange}>
					<MenuTrigger disableButtonEnhancement>
						<Tooltip content={current ? `Column: ${current.name}` : LABEL} relationship="label">
							<Button size="small" appearance="subtle" icon={current ? <Filter16Filled /> : <Filter16Regular />} />
						</Tooltip>
					</MenuTrigger>
					<MenuPopover>
						<MenuList>
							<MenuItemRadio name={FILTER_NAME} value={ALL}>
								All
							</MenuItemRadio>
							{choices.map((column) => (
								<MenuItemRadio key={column.column} name={FILTER_NAME} value={column.column}>
									{column.label}
								</MenuItemRadio>
							))}
						</MenuList>
					</MenuPopover>
				</Menu>
			</span>
		</>
	);
};
