import { Button, Caption1Strong, makeStyles, mergeClasses, tokens, Tooltip } from "@fluentui/react-components";
import { type FluentIcon } from "@fluentui/react-icons";
import { type ReactNode } from "react";

export const STRIP_WIDTH = 32;

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
		width: `${STRIP_WIDTH}px`,
		margin: 0,
		paddingTop: tokens.spacingVerticalS,
		paddingBottom: tokens.spacingVerticalS,
		paddingLeft: 0,
		paddingRight: 0,
		cursor: "pointer",
		color: tokens.colorNeutralForeground2,
		backgroundColor: tokens.colorNeutralBackground1,
		borderTopStyle: "none",
		borderBottomStyle: "none",
		borderLeft: `1px solid ${tokens.colorNeutralStroke2}`,
		borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
		":hover": {
			backgroundColor: tokens.colorNeutralBackground1Hover,
			color: tokens.colorNeutralForeground2BrandHover,
		},
		":active": {
			backgroundColor: tokens.colorNeutralBackground1Pressed,
		},
		":focus-visible": {
			outline: `2px solid ${tokens.colorStrokeFocus2}`,
			outlineOffset: "-2px",
		},
	},
	stripLabel: {
		writingMode: "vertical-rl",
		color: "inherit",
		whiteSpace: "nowrap",
	},
});

interface PaneButtonProps {
	icon: FluentIcon;
	label: string;
	onClick: () => void;
}

export const PaneButton = ({ icon: Icon, label, onClick }: PaneButtonProps) => (
	<Tooltip content={label} relationship="label">
		<Button appearance="subtle" size="small" icon={<Icon />} onClick={onClick} />
	</Tooltip>
);

interface PaneHeaderProps {
	title?: string;
	toggleIcon: FluentIcon;
	toggleLabel: string;
	onToggle?: () => void;
	actions?: ReactNode;
	children?: ReactNode;
}

export const PaneHeader = ({ title, toggleIcon, toggleLabel, onToggle, actions, children }: PaneHeaderProps) => {
	const styles = useStyles();
	return (
		<div className={styles.header}>
			{title ? <Caption1Strong className={styles.title}>{title}</Caption1Strong> : null}
			<div className={styles.middle}>{children}</div>
			{actions}
			{onToggle ? <PaneButton icon={toggleIcon} label={toggleLabel} onClick={onToggle} /> : null}
		</div>
	);
};

interface CollapsedPaneProps {
	title: string;
	icon: FluentIcon;
	label: string;
	className?: string;
	onRestore: () => void;
}

export const CollapsedPane = ({ title, icon: Icon, label, className, onRestore }: CollapsedPaneProps) => {
	const styles = useStyles();
	return (
		<Tooltip content={label} relationship="label" positioning="after">
			<button type="button" className={mergeClasses(styles.strip, className)} onClick={onRestore}>
				<Icon />
				<Caption1Strong className={styles.stripLabel}>{title}</Caption1Strong>
			</button>
		</Tooltip>
	);
};
