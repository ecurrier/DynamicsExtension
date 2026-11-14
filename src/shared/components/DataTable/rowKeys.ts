export type RowKeyAction = "open" | "none";

/**
 * What a key press on a table row should do. Fluent's own row handler answers Space only when
 * `selectableRows` is on, and then it toggles selection rather than calling the consumer, so a row
 * with an `onRowClick` was mouse-only.
 */
export const rowKeyAction = (key: string, selectable: boolean): RowKeyAction => {
	if (key === "Enter") {
		return "open";
	}
	return key === " " && !selectable ? "open" : "none";
};
