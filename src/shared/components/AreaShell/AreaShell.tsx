import { makeStyles, tokens } from "@fluentui/react-components";
import { type ReactNode } from "react";

const useStyles = makeStyles({
	row: {
		display: "flex",
		alignItems: "center",
		flexWrap: "wrap",
		gap: "8px",
		rowGap: "8px",
		flexShrink: 0,
		padding: "12px 16px 0",
		backgroundColor: tokens.colorNeutralBackground2,
	},
	search: {
		display: "flex",
		alignItems: "center",
		gap: "8px",
		flex: "1 1 220px",
		minWidth: 0,
	},
	actions: {
		display: "flex",
		alignItems: "center",
		flexShrink: 0,
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
 * The chrome every Area renders inside. It owns the toolbar row, at the top of the Area's own page
 * rather than in the app header: a form control belongs on the page it works on, and the header has
 * too little room to hold one without squeezing its labels. An Area has no other place to put a
 * toolbar, which is why the placement holds.
 *
 * An empty row renders nothing and costs no height, so the Areas with nothing to put in it show no
 * row. A tab bar is not a toolbar: an Area with tabs passes them in `children`, below the row.
 */
export const AreaShell = ({ search, filters, actions, primaryAction, children }: AreaShellProps) => {
	const styles = useStyles();
	if (search === undefined && filters === undefined && actions === undefined && primaryAction === undefined) {
		return <>{children}</>;
	}
	return (
		<>
			<div className={styles.row}>
				{search === undefined ? null : <div className={styles.search}>{search}</div>}
				{filters}
				{actions === undefined ? null : <div className={styles.actions}>{actions}</div>}
				{primaryAction}
			</div>
			{children}
		</>
	);
};
