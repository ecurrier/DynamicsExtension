import { Link } from "@fluentui/react-components";

import { type CompareCellContext, compareGridCell, type CompareGridColumn, type CompareGridRow } from "../lib";
import { GuidCell } from "./GuidCell";

interface CompareGridCellViewProps {
	row: CompareGridRow;
	column: CompareGridColumn;
	context: CompareCellContext;
}

export const CompareGridCellView = ({ row, column, context }: CompareGridCellViewProps) => {
	const cell = compareGridCell(row, column, context);
	if (column.kind === "guid") {
		return <GuidCell value={cell.text} />;
	}
	if (cell.href && cell.text) {
		const title = column.kind === "open" ? `Open the Record in ${column.label}` : `Open ${cell.text} in a new tab`;
		return (
			<Link href={cell.href} target="_blank" rel="noreferrer" title={title}>
				{cell.text}
			</Link>
		);
	}
	return <span title={cell.text || undefined}>{cell.text}</span>;
};
