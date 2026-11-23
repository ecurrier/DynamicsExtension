import { Badge, makeStyles, Spinner, tokens } from "@fluentui/react-components";
import { ErrorCircle16Filled } from "@fluentui/react-icons";

import { type ConnectionRunEntry, isRunBusy, runCountText } from "./lib";

const useStyles = makeStyles({
	label: {
		display: "inline-flex",
		alignItems: "center",
		columnGap: tokens.spacingHorizontalXS,
		minWidth: 0,
	},
	name: {
		maxWidth: "200px",
		overflow: "hidden",
		whiteSpace: "nowrap",
		textOverflow: "ellipsis",
	},
	count: {
		fontVariantNumeric: "tabular-nums",
	},
	error: {
		color: tokens.colorPaletteRedForeground1,
	},
});

export const ResultsTabLabel = ({ entry }: { entry: ConnectionRunEntry }) => {
	const styles = useStyles();
	const { run, name } = entry;
	const count = runCountText(run);
	return (
		<span className={styles.label}>
			<span className={styles.name} title={name}>
				{name}
			</span>
			{run.status === "failed" ? <ErrorCircle16Filled className={styles.error} aria-label="The Query Run failed" /> : null}
			{isRunBusy(run) ? <Spinner size="extra-tiny" aria-label="Loading" /> : null}
			{count !== null ? (
				<Badge size="small" appearance="tint" color="informative" className={styles.count}>
					{count}
				</Badge>
			) : null}
		</span>
	);
};
