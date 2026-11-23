import { Button, Link, makeStyles, Text, tokens } from "@fluentui/react-components";
import { ChevronLeft20Regular, ChevronRight20Regular } from "@fluentui/react-icons";
import { type UIEvent, useLayoutEffect, useMemo, useRef } from "react";

import { DataTable, type DataTableColumn } from "@/shared/components";
import { type QueryRow } from "@/shared/types";

import { cellValueText, displayCaption, type DisplayWindow, recordLink, type ResultGridColumn, type ValueMode } from "./lib";

const useStyles = makeStyles({
	root: {
		display: "flex",
		flexDirection: "column",
		flexGrow: 1,
		minHeight: 0,
		rowGap: tokens.spacingVerticalXS,
	},
	pager: {
		display: "flex",
		alignItems: "center",
		justifyContent: "flex-end",
		flexShrink: 0,
		columnGap: tokens.spacingHorizontalXS,
	},
	caption: {
		color: tokens.colorNeutralForeground3,
	},
});

const COLUMN_WIDTHS: Partial<Record<ResultGridColumn["type"], number>> = { uniqueidentifier: 290, lookup: 220 };

interface IndexedRow {
	index: number;
	row: QueryRow;
}

interface ResultCellProps {
	row: QueryRow;
	column: ResultGridColumn;
	mode: ValueMode;
	appUrl: string | null;
}

const ResultCell = ({ row, column, mode, appUrl }: ResultCellProps) => {
	const text = cellValueText(row, column.key, mode);
	const href = recordLink(row, column, appUrl);
	if (href && text) {
		return (
			<Link href={href} target="_blank" rel="noreferrer" title={`Open ${text} in a new tab`}>
				{text}
			</Link>
		);
	}
	return <span title={text}>{text}</span>;
};

interface ResultsGridProps {
	rows: readonly QueryRow[];
	columns: readonly ResultGridColumn[];
	mode: ValueMode;
	appUrl: string | null;
	visible: DisplayWindow;
	maximised: boolean;
	onPageChange: (page: number) => void;
}

interface ScrollPosition {
	element: HTMLElement | null;
	top: number;
	left: number;
}

const useScrollKeptAcross = (maximised: boolean) => {
	const last = useRef<ScrollPosition>({ element: null, top: 0, left: 0 });
	const beforeMaximise = useRef<ScrollPosition | null>(null);
	const previous = useRef(maximised);
	useLayoutEffect(() => {
		if (previous.current === maximised) {
			return;
		}
		previous.current = maximised;
		if (maximised) {
			beforeMaximise.current = { ...last.current };
			return;
		}
		const saved = beforeMaximise.current;
		if (saved?.element?.isConnected) {
			saved.element.scrollTop = saved.top;
			saved.element.scrollLeft = saved.left;
		}
	}, [maximised]);
	return (event: UIEvent<HTMLDivElement>) => {
		if (event.target instanceof HTMLElement) {
			last.current = { element: event.target, top: event.target.scrollTop, left: event.target.scrollLeft };
		}
	};
};

export const ResultsGrid = ({ rows, columns, mode, appUrl, visible, maximised, onPageChange }: ResultsGridProps) => {
	const styles = useStyles();
	const onScrollCapture = useScrollKeptAcross(maximised);
	const items = useMemo<IndexedRow[]>(
		() => rows.slice(visible.start, visible.end).map((row, offset) => ({ index: visible.start + offset, row })),
		[rows, visible.start, visible.end]
	);
	const gridColumns = useMemo<DataTableColumn<IndexedRow>[]>(
		() =>
			columns.map((column) => ({
				id: column.key,
				label: column.label,
				width: COLUMN_WIDTHS[column.type],
				render: (item) => <ResultCell row={item.row} column={column} mode={mode} appUrl={appUrl} />,
			})),
		[appUrl, columns, mode]
	);

	return (
		<div className={styles.root} onScrollCapture={onScrollCapture}>
			<DataTable
				key={visible.start}
				items={items}
				columns={gridColumns}
				getRowId={(item) => item.index}
				sortable={false}
				fill
				autoFitColumns={false}
				emptyMessage="The Query returned no Records"
			/>
			{rows.length > 0 ? (
				<div className={styles.pager}>
					<Text size={200} className={styles.caption}>
						{displayCaption(visible, rows.length)}
					</Text>
					<Button
						size="small"
						appearance="subtle"
						icon={<ChevronLeft20Regular />}
						disabled={visible.page === 0}
						onClick={() => onPageChange(visible.page - 1)}
						aria-label="Previous Records"
					/>
					<Button
						size="small"
						appearance="subtle"
						icon={<ChevronRight20Regular />}
						disabled={visible.page >= visible.pageCount - 1}
						onClick={() => onPageChange(visible.page + 1)}
						aria-label="Next Records"
					/>
				</div>
			) : null}
		</div>
	);
};
