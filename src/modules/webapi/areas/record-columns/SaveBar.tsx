import { Button, Link, makeStyles, mergeClasses, Spinner, Text, tokens, Tooltip } from "@fluentui/react-components";
import { ArrowUndo16Regular, ChevronDown16Regular, ChevronUp16Regular, ErrorCircle16Regular, Warning16Regular } from "@fluentui/react-icons";

const useStyles = makeStyles({
	root: {
		display: "flex",
		flexDirection: "column",
		flexShrink: 0,
		borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
		backgroundColor: tokens.colorNeutralBackground2,
		borderRadius: tokens.borderRadiusMedium,
	},
	bar: {
		display: "flex",
		alignItems: "center",
		flexWrap: "wrap",
		gap: "8px",
		padding: "8px 12px",
	},
	summary: {
		display: "flex",
		alignItems: "center",
		gap: "8px",
		flex: 1,
		minWidth: 0,
		flexWrap: "wrap",
	},
	problem: {
		display: "inline-flex",
		alignItems: "center",
		gap: "4px",
	},
	error: {
		color: tokens.colorPaletteRedForeground1,
	},
	warning: {
		color: tokens.colorPaletteDarkOrangeForeground1,
	},
	message: {
		padding: "0 12px 8px",
		color: tokens.colorPaletteRedForeground1,
		whiteSpace: "pre-wrap",
		overflowWrap: "anywhere",
	},
	review: {
		display: "flex",
		flexDirection: "column",
		maxHeight: "180px",
		overflowY: "auto",
		borderTop: `1px solid ${tokens.colorNeutralStroke3}`,
		padding: "4px 12px",
	},
	entry: {
		display: "grid",
		gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr) auto",
		alignItems: "center",
		columnGap: "8px",
		padding: "2px 0",
	},
	entryName: {
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		textAlign: "start",
	},
	change: {
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		color: tokens.colorNeutralForeground2,
	},
	old: {
		textDecorationLine: "line-through",
		color: tokens.colorNeutralForeground3,
	},
	empty: {
		fontStyle: "italic",
	},
});

export interface ReviewEntry {
	logicalName: string;
	displayName: string;
	oldValue: string | null;
	newValue: string | null;
	invalid: boolean;
}

interface SaveBarProps {
	entries: ReviewEntry[];
	invalidCount: number;
	requiredCount: number;
	reviewOpen: boolean;
	saving: boolean;
	error: string | null;
	onToggleReview: () => void;
	onJump: (logicalName: string) => void;
	onJumpToInvalid: () => void;
	onUndo: (logicalName: string) => void;
	onDiscard: () => void;
	onSave: () => void;
}

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? "" : "s"}`;

export const SaveBar = ({
	entries,
	invalidCount,
	requiredCount,
	reviewOpen,
	saving,
	error,
	onToggleReview,
	onJump,
	onJumpToInvalid,
	onUndo,
	onDiscard,
	onSave,
}: SaveBarProps) => {
	const styles = useStyles();
	const show = (value: string | null, className?: string) => (
		<span className={mergeClasses(className, value === null && styles.empty)}>{value ?? "empty"}</span>
	);

	return (
		<div className={styles.root} role="region" aria-label="Unsaved changes">
			{reviewOpen ? (
				<div className={styles.review}>
					{entries.map((entry) => (
						<div key={entry.logicalName} className={styles.entry}>
							<Link as="button" className={styles.entryName} title={entry.logicalName} onClick={() => onJump(entry.logicalName)}>
								{entry.displayName}
							</Link>
							<Text size={200} className={styles.change} title={`${entry.oldValue ?? "empty"} → ${entry.newValue ?? "empty"}`}>
								{show(entry.oldValue, styles.old)} → {show(entry.newValue, entry.invalid ? styles.error : undefined)}
							</Text>
							<Tooltip content="Undo change" relationship="label">
								<Button appearance="subtle" size="small" icon={<ArrowUndo16Regular />} onClick={() => onUndo(entry.logicalName)} />
							</Tooltip>
						</div>
					))}
				</div>
			) : null}
			<div className={styles.bar}>
				<div className={styles.summary}>
					<Text weight="semibold">{plural(entries.length, "change")}</Text>
					{invalidCount > 0 ? (
						<Link as="button" className={mergeClasses(styles.problem, styles.error)} onClick={onJumpToInvalid}>
							<ErrorCircle16Regular />
							{invalidCount === 1 ? "1 Draft is invalid" : `${invalidCount} Drafts are invalid`}
						</Link>
					) : null}
					{requiredCount > 0 ? (
						<Text size={200} className={mergeClasses(styles.problem, styles.warning)}>
							<Warning16Regular />
							{requiredCount === 1 ? "1 required column cleared" : `${requiredCount} required columns cleared`}
						</Text>
					) : null}
				</div>
				<Button appearance="subtle" size="small" icon={reviewOpen ? <ChevronDown16Regular /> : <ChevronUp16Regular />} onClick={onToggleReview}>
					Review
				</Button>
				<Button appearance="subtle" size="small" disabled={saving} onClick={onDiscard}>
					Discard all
				</Button>
				<Button
					appearance="primary"
					size="small"
					disabled={saving || invalidCount > 0}
					icon={saving ? <Spinner size="extra-tiny" /> : undefined}
					onClick={onSave}>
					{saving ? "Saving..." : "Save"}
				</Button>
			</div>
			{error ? (
				<Text size={200} className={styles.message} role="alert">
					{error}
				</Text>
			) : null}
		</div>
	);
};
