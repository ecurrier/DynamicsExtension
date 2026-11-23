import { makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import { Filter12Filled } from "@fluentui/react-icons";

import { type CompareGridColumn } from "../lib";

const useStyles = makeStyles({
	button: {
		display: "inline-flex",
		alignItems: "center",
		columnGap: tokens.spacingHorizontalXXS,
		maxWidth: "100%",
		padding: 0,
		border: "none",
		backgroundColor: "transparent",
		fontFamily: "inherit",
		fontSize: "inherit",
		fontWeight: "inherit",
		color: "inherit",
		cursor: "pointer",
		"&:hover": {
			color: tokens.colorBrandForeground1,
		},
		"&:focus-visible": {
			outlineWidth: "2px",
			outlineStyle: "solid",
			outlineColor: tokens.colorStrokeFocus2,
			borderRadius: tokens.borderRadiusSmall,
		},
	},
	active: {
		color: tokens.colorBrandForeground1,
	},
	text: {
		overflow: "hidden",
		whiteSpace: "nowrap",
		textOverflow: "ellipsis",
	},
	icon: {
		flexShrink: 0,
	},
});

interface CompareHeaderCellProps {
	column: CompareGridColumn;
	filterColumn: string | null;
	hint?: string;
	onFilterColumn?: (column: string) => void;
}

export const CompareHeaderCell = ({ column, filterColumn, hint, onFilterColumn }: CompareHeaderCellProps) => {
	const styles = useStyles();
	if (column.kind !== "difference" || !onFilterColumn) {
		return <span title={column.label}>{column.label}</span>;
	}
	const active = filterColumn === column.column;
	return (
		<button
			type="button"
			className={mergeClasses(styles.button, active && styles.active)}
			aria-pressed={active}
			title={[active ? "Show all pairs." : `Show only the pairs that differ in ${column.name}.`, hint].filter(Boolean).join(" ")}
			onClick={() => onFilterColumn(column.column)}>
			<span className={styles.text}>{column.label}</span>
			{active ? <Filter12Filled className={styles.icon} /> : null}
		</button>
	);
};
