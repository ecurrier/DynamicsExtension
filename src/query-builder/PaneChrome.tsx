import { Button, Caption1Strong, makeStyles, tokens, Tooltip } from "@fluentui/react-components";
import { type FluentIcon } from "@fluentui/react-icons";
import { type ReactNode } from "react";

const useStyles = makeStyles({
	header: {
		display: "flex",
		alignItems: "center",
		flexShrink: 0,
		columnGap: tokens.spacingHorizontalS,
		minWidth: 0,
		minHeight: "32px",
		padding: `0 ${tokens.spacingHorizontalXS} 0 ${tokens.spacingHorizontalM}`,
		borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
		backgroundColor: tokens.colorNeutralBackground1,
	},
	title: {
		flexShrink: 0,
	},
	middle: {
		display: "flex",
		alignItems: "center",
		flexGrow: 1,
		minWidth: 0,
		columnGap: tokens.spacingHorizontalS,
	},
	strip: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		flexShrink: 0,
		rowGap: tokens.spacingVerticalS,
		width: "32px",
		paddingTop: tokens.spacingVerticalXS,
		backgroundColor: tokens.colorNeutralBackground1,
		borderLeft: `1px solid ${tokens.colorNeutralStroke2}`,
		borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
	},
	stripLabel: {
		writingMode: "vertical-rl",
		color: tokens.colorNeutralForeground3,
		whiteSpace: "nowrap",
	},
});

interface PaneToggleProps {
	icon: FluentIcon;
	label: string;
	onClick: () => void;
}

const PaneToggle = ({ icon: Icon, label, onClick }: PaneToggleProps) => (
	<Tooltip content={label} relationship="label">
		<Button appearance="subtle" size="small" icon={<Icon />} onClick={onClick} />
	</Tooltip>
);

interface PaneHeaderProps {
	title: string;
	toggleIcon: FluentIcon;
	toggleLabel: string;
	onToggle: () => void;
	children?: ReactNode;
}

export const PaneHeader = ({ title, toggleIcon, toggleLabel, onToggle, children }: PaneHeaderProps) => {
	const styles = useStyles();
	return (
		<div className={styles.header}>
			<Caption1Strong className={styles.title}>{title}</Caption1Strong>
			<div className={styles.middle}>{children}</div>
			<PaneToggle icon={toggleIcon} label={toggleLabel} onClick={onToggle} />
		</div>
	);
};

interface CollapsedPaneProps {
	title: string;
	icon: FluentIcon;
	label: string;
	onRestore: () => void;
}

export const CollapsedPane = ({ title, icon, label, onRestore }: CollapsedPaneProps) => {
	const styles = useStyles();
	return (
		<div className={styles.strip}>
			<PaneToggle icon={icon} label={label} onClick={onRestore} />
			<Caption1Strong className={styles.stripLabel}>{title}</Caption1Strong>
		</div>
	);
};
