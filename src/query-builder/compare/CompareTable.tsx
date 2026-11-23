import { makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import { Fragment, type KeyboardEvent, type ReactNode, useRef, useState } from "react";

import { type CompareCellContext, compareColumnLayout, type CompareGridColumn, type CompareGridRow, TOGGLE_WIDTH } from "../lib";
import { CompareGridCellView } from "./CompareGridCellView";
import { CompareHeaderCell } from "./CompareHeaderCell";
import { COPY_REVEAL } from "./GuidCell";
import { RowToggle } from "./RowToggle";

const useStyles = makeStyles({
	scroller: {
		flexGrow: 1,
		minHeight: 0,
		overflow: "auto",
		containerType: "inline-size",
		border: `1px solid ${tokens.colorNeutralStroke2}`,
		borderRadius: tokens.borderRadiusMedium,
		backgroundColor: tokens.colorNeutralBackground1,
	},
	table: {
		tableLayout: "fixed",
		borderCollapse: "separate",
		borderSpacing: 0,
		minWidth: "100%",
		fontSize: tokens.fontSizeBase200,
		lineHeight: tokens.lineHeightBase200,
	},
	head: {
		position: "sticky",
		top: 0,
		zIndex: 2,
		height: "24px",
		padding: `0 ${tokens.spacingHorizontalS}`,
		textAlign: "left",
		fontWeight: tokens.fontWeightSemibold,
		color: tokens.colorNeutralForeground2,
		backgroundColor: tokens.colorNeutralBackground1,
		borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
		whiteSpace: "nowrap",
		overflow: "hidden",
		textOverflow: "ellipsis",
	},
	pinnedHead: {
		zIndex: 3,
	},
	cell: {
		height: "24px",
		padding: `0 ${tokens.spacingHorizontalS}`,
		borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
		backgroundColor: tokens.colorNeutralBackground1,
		whiteSpace: "nowrap",
		overflow: "hidden",
		textOverflow: "ellipsis",
	},
	toggleCell: {
		padding: 0,
		textAlign: "center",
	},
	pinned: {
		position: "sticky",
		zIndex: 1,
	},
	lastPinned: {
		borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
	},
	row: {
		outlineStyle: "none",
		[`&:hover .${COPY_REVEAL}`]: {
			opacity: 1,
		},
		"&:hover > td": {
			backgroundColor: tokens.colorNeutralBackground1Hover,
		},
		"&:focus-visible > td": {
			backgroundColor: tokens.colorNeutralBackground1Selected,
		},
		"&:focus-visible > td:first-child": {
			boxShadow: `inset 2px 0 0 ${tokens.colorStrokeFocus2}`,
		},
	},
	detail: {
		padding: 0,
		borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
		backgroundColor: tokens.colorNeutralBackground2,
	},
	detailBody: {
		position: "sticky",
		left: 0,
		maxWidth: "100cqw",
		boxSizing: "border-box",
	},
});

interface CompareTableProps {
	label: string;
	columns: readonly CompareGridColumn[];
	rows: readonly CompareGridRow[];
	context: CompareCellContext;
	openRows?: ReadonlySet<string>;
	onToggleRow?: (id: string) => void;
	renderDetail?: (row: CompareGridRow) => ReactNode;
	filterColumn?: string | null;
	filterHint?: string;
	onFilterColumn?: (column: string) => void;
}

const ROW_SELECTOR = "tr[data-row]";

export const CompareTable = ({
	label,
	columns,
	rows,
	context,
	openRows,
	onToggleRow,
	renderDetail,
	filterColumn = null,
	filterHint,
	onFilterColumn,
}: CompareTableProps) => {
	const styles = useStyles();
	const body = useRef<HTMLTableSectionElement>(null);
	const [focused, setFocused] = useState(0);
	const expandable = onToggleRow !== undefined && renderDetail !== undefined;
	const leading = expandable ? TOGGLE_WIDTH : 0;
	const layout = compareColumnLayout(columns, leading);
	const lastPinned = layout.reduce((last, entry, index) => (entry.left !== null ? index : last), -1);
	const tabStop = Math.min(focused, Math.max(0, rows.length - 1));
	const totalWidth = leading + layout.reduce((sum, entry) => sum + entry.width, 0);

	const focusRow = (index: number) => {
		const elements = body.current?.querySelectorAll<HTMLTableRowElement>(ROW_SELECTOR);
		const target = elements?.[Math.min(Math.max(0, index), elements.length - 1)];
		target?.focus();
	};

	const onKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, index: number, row: CompareGridRow) => {
		if (event.target !== event.currentTarget) {
			return;
		}
		const moves: Readonly<Record<string, number>> = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: rows.length - 1 };
		const next = moves[event.key];
		if (next !== undefined) {
			event.preventDefault();
			focusRow(next);
			return;
		}
		if (event.key === "Enter" && expandable) {
			event.preventDefault();
			onToggleRow(row.id);
		}
	};

	const pinnedStyle = (left: number | null) => (left === null ? undefined : { left });

	return (
		<div className={styles.scroller}>
			<table className={styles.table} style={{ width: totalWidth }} aria-label={label}>
				<colgroup>
					{expandable ? <col style={{ width: TOGGLE_WIDTH }} /> : null}
					{layout.map((entry, index) => (
						<col key={columns[index]?.id} style={{ width: entry.width }} />
					))}
				</colgroup>
				<thead>
					<tr>
						{expandable ? (
							<th className={mergeClasses(styles.head, styles.pinned, styles.pinnedHead)} style={{ left: 0 }} aria-label="Details" />
						) : null}
						{columns.map((column, index) => {
							const entry = layout[index];
							const pinned = entry?.left !== null && entry?.left !== undefined;
							return (
								<th
									key={column.id}
									scope="col"
									className={mergeClasses(
										styles.head,
										pinned && styles.pinned,
										pinned && styles.pinnedHead,
										index === lastPinned && styles.lastPinned
									)}
									style={pinnedStyle(entry?.left ?? null)}>
									<CompareHeaderCell column={column} filterColumn={filterColumn} hint={filterHint} onFilterColumn={onFilterColumn} />
								</th>
							);
						})}
					</tr>
				</thead>
				<tbody ref={body}>
					{rows.map((row, index) => {
						const open = openRows?.has(row.id) ?? false;
						return (
							<Fragment key={row.id}>
								<tr
									data-row
									className={styles.row}
									tabIndex={index === tabStop ? 0 : -1}
									aria-expanded={expandable ? open : undefined}
									onFocus={(event) => (event.target === event.currentTarget ? setFocused(index) : undefined)}
									onKeyDown={(event) => onKeyDown(event, index, row)}>
									{expandable ? (
										<td className={mergeClasses(styles.cell, styles.toggleCell, styles.pinned)} style={{ left: 0 }}>
											<RowToggle open={open} onToggle={() => onToggleRow(row.id)} />
										</td>
									) : null}
									{columns.map((column, cellIndex) => {
										const entry = layout[cellIndex];
										const pinned = entry?.left !== null && entry?.left !== undefined;
										return (
											<td
												key={column.id}
												className={mergeClasses(styles.cell, pinned && styles.pinned, cellIndex === lastPinned && styles.lastPinned)}
												style={pinnedStyle(entry?.left ?? null)}>
												<CompareGridCellView row={row} column={column} context={context} />
											</td>
										);
									})}
								</tr>
								{expandable && open ? (
									<tr>
										<td className={styles.detail} colSpan={columns.length + 1}>
											<div className={styles.detailBody}>{renderDetail(row)}</div>
										</td>
									</tr>
								) : null}
							</Fragment>
						);
					})}
				</tbody>
			</table>
		</div>
	);
};
