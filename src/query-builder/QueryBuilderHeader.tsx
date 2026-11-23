import { Badge, Button, makeStyles, mergeClasses, Text, ToggleButton, tokens, Tooltip } from "@fluentui/react-components";
import { DatabaseSearch20Regular, History20Regular, Play20Regular, TextboxSettings20Regular } from "@fluentui/react-icons";

import { ConnectionPicker } from "@/shared/components";
import { type ConnectionTarget } from "@/shared/connections";
import { type Environment } from "@/shared/storage";

import { type AddedConnection, ConnectionChips } from "./ConnectionChips";
import { type AddableConnection, type NamesLead, problemCounts, problemCountText } from "./lib";
import { SaveButton, StoredQueryName } from "./library";
import { SeverityIcon } from "./ProblemIcon";
import { useQueryDiagnostics } from "./QueryDiagnostics";
import { NewQueryMenu } from "./start";
import { useQueryBuilder } from "./store";

const WIDE_LABELS = "@container (max-width: 1279px)";
const MEDIUM_LABELS = "@container (max-width: 1099px)";
const QUERY_LABELS = "@container (max-width: 879px)";

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
		[QUERY_LABELS]: {
			columnGap: tokens.spacingHorizontalS,
		},
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
		[MEDIUM_LABELS]: {
			display: "none",
		},
	},
	picker: {
		flexGrow: 1,
		flexShrink: 1,
		minWidth: "160px",
		maxWidth: "300px",
		"& .fui-Dropdown": {
			minWidth: 0,
			width: "100%",
		},
		[QUERY_LABELS]: {
			minWidth: "120px",
		},
	},
	group: {
		display: "flex",
		alignItems: "center",
		flexShrink: 1,
		minWidth: 0,
		columnGap: tokens.spacingHorizontalXS,
	},
	divider: {
		alignSelf: "center",
		flexShrink: 0,
		width: "1px",
		height: "20px",
		backgroundColor: tokens.colorNeutralStroke2,
	},
	spacer: {
		flexGrow: 1,
	},
	queryLabel: {
		[QUERY_LABELS]: {
			display: "none",
		},
	},
	mediumLabel: {
		[MEDIUM_LABELS]: {
			display: "none",
		},
	},
	wideLabel: {
		[WIDE_LABELS]: {
			display: "none",
		},
	},
	fixed: {
		flexShrink: 0,
	},
	queryButton: {
		flexShrink: 0,
		[QUERY_LABELS]: {
			minWidth: "auto",
		},
	},
	mediumButton: {
		flexShrink: 0,
		[MEDIUM_LABELS]: {
			minWidth: "auto",
		},
	},
	wideButton: {
		flexShrink: 0,
		[WIDE_LABELS]: {
			minWidth: "auto",
		},
	},
	problems: {
		flexShrink: 0,
		columnGap: "2px",
		fontVariantNumeric: "tabular-nums",
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
	addedConnections: readonly AddedConnection[];
	addableConnections: readonly AddableConnection[];
	onConnectionChange: (connection: ConnectionTarget) => void;
	onAddConnection: (connection: ConnectionTarget) => void;
	onRemoveConnection: (key: string) => void;
	onNamesLeadChange: (lead: NamesLead) => void;
	onRun: () => void;
	onOpenLibrary: () => void;
}

export const QueryBuilderHeader = ({
	hosted,
	connection,
	environments,
	connecting,
	canRun,
	running,
	namesLead,
	addedConnections,
	addableConnections,
	onConnectionChange,
	onAddConnection,
	onRemoveConnection,
	onNamesLeadChange,
	onRun,
	onOpenLibrary,
}: QueryBuilderHeaderProps) => {
	const styles = useStyles();
	const empty = useQueryBuilder((state) => state.text.trim() === "");
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
			<ConnectionChips
				added={addedConnections}
				addable={addableConnections}
				disabled={connecting || running}
				onAdd={onAddConnection}
				onRemove={onRemoveConnection}
			/>
			<div className={styles.divider} />
			<div className={styles.group} role="group" aria-label="Query">
				{empty ? null : <NewQueryMenu className={styles.queryButton} labelClassName={styles.queryLabel} />}
				<SaveButton className={styles.queryButton} labelClassName={styles.queryLabel} />
				<StoredQueryName />
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
					className={styles.wideButton}
					checked={namesLead === "display"}
					aria-label="Display names first"
					onClick={() => onNamesLeadChange(namesLead === "display" ? "logical" : "display")}>
					<span className={styles.wideLabel}>Display names first</span>
				</ToggleButton>
			</Tooltip>
			<Tooltip content="Show the History and My queries" relationship="description">
				<Button
					appearance="subtle"
					icon={<History20Regular />}
					className={styles.mediumButton}
					aria-label="History and My queries"
					onClick={onOpenLibrary}>
					<span className={styles.mediumLabel}>History</span>
				</Button>
			</Tooltip>
			<div className={mergeClasses(styles.group, styles.fixed)}>
				<RunProblems />
				<Tooltip content="Run the Query (Ctrl+Enter)" relationship="description">
					<Button appearance="primary" icon={<Play20Regular />} className={styles.fixed} disabled={!canRun} onClick={onRun}>
						Run
					</Button>
				</Tooltip>
			</div>
		</div>
	);
};
