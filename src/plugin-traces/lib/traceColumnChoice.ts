/** Every column the trace table can show, in the order it shows them. There is no reorder. */
export const TRACE_COLUMN_ORDER = [
	"createdOn",
	"typeName",
	"messageName",
	"primaryEntity",
	"mode",
	"depth",
	"duration",
	"exception",
	"correlation",
	"pluginStep",
] as const;

export type TraceColumnId = (typeof TRACE_COLUMN_ORDER)[number];

/**
 * Six by default. Mode, Depth, Correlation and Step come off, because the Summary tab already shows
 * all four for the selected row.
 */
export const DEFAULT_TRACE_COLUMNS: string[] = ["createdOn", "typeName", "messageName", "primaryEntity", "duration", "exception"];

const inTableOrder = (ids: string[]): string[] => TRACE_COLUMN_ORDER.filter((column) => ids.includes(column));

/** What to show, from what was remembered. */
export const shownTraceColumns = (remembered: string[] | undefined): string[] => {
	const known = inTableOrder(remembered ?? DEFAULT_TRACE_COLUMNS);
	return known.length === 0 ? DEFAULT_TRACE_COLUMNS : known;
};

/** Hides or shows one column, keeping the table's own order. The last column cannot be hidden. */
export const toggledTraceColumns = (shown: string[], column: string): string[] => {
	if (shown.includes(column)) {
		return shown.length === 1 ? shown : inTableOrder(shown.filter((id) => id !== column));
	}
	return inTableOrder([...shown, column]);
};
