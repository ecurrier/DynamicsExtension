import { Badge, Button, makeStyles, mergeClasses, Text, ToggleButton, tokens, Tooltip } from "@fluentui/react-components";
import { DatabaseSearch20Regular, Play20Regular, TextboxSettings20Regular } from "@fluentui/react-icons";

import { ConnectionPicker } from "@/shared/components";
import { type ConnectionTarget } from "@/shared/connections";
import { type Environment } from "@/shared/storage";

import { type NamesLead, problemCounts, problemCountText } from "./lib";
import { SeverityIcon } from "./ProblemIcon";
import { useQueryDiagnostics } from "./QueryDiagnostics";
import { useQueryBuilder } from "./store";

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
	runGroup: {
		display: "flex",
		alignItems: "center",
		flexShrink: 0,
		columnGap: tokens.spacingHorizontalS,
	},
	problems: {
		flexShrink: 0,
		columnGap: "2px",
		fontVariantNumeric: "tabular-nums",
	},
	names: {
		flexShrink: 0,
	},
	namesText: {
		"@container (max-width: 720px)": {
			display: "none",
		},
	},
});

const RunProblems = () => {
	const styles = useStyles();
	const { diagnostics } = useQueryDiagnostics();
	const broken = useQueryBuilder((state) => state.errors.length > 0);
	const counts = problemCounts(diagnostics);
	const text = problemCountText(counts);
	if (broken || text === null) {
		return null;
	}
	const severity = counts.errors > 0 ? "error" : "warning";
	return (
		<Tooltip content={`The Query has ${text}. Run still sends it. Dataverse makes the final check.`} relationship="label">
			<Badge
				role="status"
				tabIndex={0}
				size="medium"
				appearance="tint"
				color={severity === "error" ? "danger" : "warning"}
				icon={<SeverityIcon severity={severity} />}
				className={styles.problems}>
				{counts.errors + counts.warnings}
			</Badge>
		</Tooltip>
	);
};

interface QueryBuilderHeaderProps {
	hosted: boolean;
	connection: ConnectionTarget;
	environments: Environment[];
	connecting: boolean;
	canRun: boolean;
	running: boolean;
	namesLead: NamesLead;
	onConnectionChange: (connection: ConnectionTarget) => void;
	onNamesLeadChange: (lead: NamesLead) => void;
	onRun: () => void;
}

export const QueryBuilderHeader = ({
	hosted,
	connection,
	environments,
	connecting,
	canRun,
	running,
	namesLead,
	onConnectionChange,
	onNamesLeadChange,
	onRun,
}: QueryBuilderHeaderProps) => {
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
			<Tooltip
				content={
					namesLead === "display"
						? "The tree shows display names first. Select to show logical names first."
						: "The tree shows logical names first. Select to show display names first."
				}
				relationship="description">
				<ToggleButton
					appearance="subtle"
					icon={<TextboxSettings20Regular />}
					className={styles.names}
					checked={namesLead === "display"}
					aria-label="Display names first"
					onClick={() => onNamesLeadChange(namesLead === "display" ? "logical" : "display")}>
					<span className={styles.namesText}>Display names first</span>
				</ToggleButton>
			</Tooltip>
			<div className={styles.runGroup}>
				<RunProblems />
				<Tooltip content="Run the Query (Ctrl+Enter)" relationship="description">
					<Button appearance="primary" icon={<Play20Regular />} className={styles.run} disabled={!canRun} onClick={onRun}>
						Run
					</Button>
				</Tooltip>
			</div>
		</div>
	);
};
