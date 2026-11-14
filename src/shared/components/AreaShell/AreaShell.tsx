import { makeStyles } from "@fluentui/react-components";
import { type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useAreaShellSlot } from "./slot";

const useStyles = makeStyles({
	/** Only used when there is no shell to render into, so the row is never lost. */
	fallback: {
		display: "flex",
		alignItems: "center",
		flexWrap: "wrap",
		gap: "8px",
		padding: "8px 16px 0",
	},
	search: {
		display: "flex",
		alignItems: "center",
		gap: "8px",
		flex: "1 1 140px",
		minWidth: 0,
	},
	actions: {
		display: "flex",
		alignItems: "center",
		// It gives way before the search does, so a wide action never pushes the field to nothing.
		flexShrink: 1,
		minWidth: 0,
		gap: "4px",
	},
});

export interface AreaShellProps {
	/** A `SearchField` or a `TableFilter`. It fills the rest of the row. */
	search?: ReactNode;
	/** A `FilterPanel`, which carries the count of active filters. */
	filters?: ReactNode;
	/** Secondary actions, normally icon buttons. */
	actions?: ReactNode;
	/** At most one. */
	primaryAction?: ReactNode;
	children: ReactNode;
}

/**
 * The chrome every Area renders inside. It owns the toolbar row and gives an Area no other place to
 * put one, which is why the placement holds. An empty slot renders nothing and costs no height, so
 * the Areas with nothing to put in the row show no row.
 *
 * A tab bar is not a toolbar: an Area with tabs passes them in `children`, below the row.
 */
export const AreaShell = ({ search, filters, actions, primaryAction, children }: AreaShellProps) => {
	const styles = useStyles();
	const slot = useAreaShellSlot();
	const row =
		search === undefined && filters === undefined && actions === undefined && primaryAction === undefined ? null : (
			<>
				{search === undefined ? null : <div className={styles.search}>{search}</div>}
				{filters}
				{actions === undefined ? null : <div className={styles.actions}>{actions}</div>}
				{primaryAction}
			</>
		);
	return (
		<>
			{row === null ? null : slot ? createPortal(row, slot) : <div className={styles.fallback}>{row}</div>}
			{children}
		</>
	);
};
