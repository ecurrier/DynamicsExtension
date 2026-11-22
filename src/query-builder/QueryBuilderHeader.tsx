import { Button, makeStyles, mergeClasses, Text, tokens, Tooltip } from "@fluentui/react-components";
import { DatabaseSearch20Regular, Play20Regular } from "@fluentui/react-icons";

import { ConnectionPicker } from "@/shared/components";
import { type ConnectionTarget } from "@/shared/connections";
import { type Environment } from "@/shared/storage";

const useStyles = makeStyles({
	bar: {
		display: "flex",
		alignItems: "flex-end",
		flexShrink: 0,
		columnGap: tokens.spacingHorizontalL,
		minWidth: 0,
		padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL} ${tokens.spacingVerticalS} ${tokens.spacingHorizontalXL}`,
		backgroundColor: tokens.colorNeutralBackground1,
		borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
	},
	hostedBar: {
		paddingLeft: tokens.spacingHorizontalM,
		paddingRight: tokens.spacingHorizontalM,
	},
	brand: {
		display: "flex",
		alignItems: "center",
		alignSelf: "center",
		flexShrink: 0,
		columnGap: tokens.spacingHorizontalSNudge,
	},
	brandIcon: {
		fontSize: "20px",
		color: tokens.colorBrandForeground1,
	},
	brandText: {
		"@container (max-width: 640px)": {
			display: "none",
		},
	},
	picker: {
		flexGrow: 1,
		flexShrink: 1,
		minWidth: "160px",
		maxWidth: "320px",
	},
	spacer: {
		flexGrow: 1,
	},
	run: {
		flexShrink: 0,
	},
});

interface QueryBuilderHeaderProps {
	hosted: boolean;
	connection: ConnectionTarget;
	environments: Environment[];
	connecting: boolean;
	canRun: boolean;
	running: boolean;
	onConnectionChange: (connection: ConnectionTarget) => void;
	onRun: () => void;
}

export const QueryBuilderHeader = ({ hosted, connection, environments, connecting, canRun, running, onConnectionChange, onRun }: QueryBuilderHeaderProps) => {
	const styles = useStyles();
	return (
		<div className={mergeClasses(styles.bar, hosted && styles.hostedBar)}>
			<div className={styles.brand}>
				<DatabaseSearch20Regular className={styles.brandIcon} />
				<Text weight="semibold" size={400} className={styles.brandText}>
					Query Builder
				</Text>
			</div>
			<div className={styles.picker}>
				<ConnectionPicker value={connection} environments={environments} disabled={connecting || running} onChange={onConnectionChange} />
			</div>
			<div className={styles.spacer} />
			<Tooltip content="Run the Query (Ctrl+Enter)" relationship="description">
				<Button appearance="primary" icon={<Play20Regular />} className={styles.run} disabled={!canRun} onClick={onRun}>
					Run
				</Button>
			</Tooltip>
		</div>
	);
};
