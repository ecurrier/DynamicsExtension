import { makeStyles, mergeClasses, Text, tokens, Tooltip } from "@fluentui/react-components";
import { ErrorCircle16Filled, Info16Filled, Warning16Filled } from "@fluentui/react-icons";

import { type Diagnostic, type DiagnosticSeverity } from "@/shared/lib/fetchxml";

import { beneathText, worseSeverity, worstSeverity } from "./lib";

const useStyles = makeStyles({
	icon: {
		flexShrink: 0,
		fontSize: "16px",
	},
	error: {
		color: tokens.colorStatusDangerForeground1,
	},
	warning: {
		color: tokens.colorStatusWarningForeground1,
	},
	info: {
		color: tokens.colorBrandForeground1,
	},
	trigger: {
		display: "inline-flex",
		alignItems: "center",
		flexShrink: 0,
		borderRadius: tokens.borderRadiusSmall,
	},
	list: {
		display: "flex",
		flexDirection: "column",
		rowGap: tokens.spacingVerticalXS,
		margin: 0,
		paddingLeft: 0,
		listStyleType: "none",
	},
	item: {
		display: "flex",
		alignItems: "flex-start",
		columnGap: tokens.spacingHorizontalXS,
	},
	muted: {
		color: tokens.colorNeutralForeground3,
	},
});

interface SeverityIconProps {
	severity: DiagnosticSeverity;
	className?: string;
}

export const SeverityIcon = ({ severity, className }: SeverityIconProps) => {
	const styles = useStyles();
	const props = { className: mergeClasses(styles.icon, styles[severity], className), "aria-hidden": true };
	switch (severity) {
		case "error":
			return <ErrorCircle16Filled {...props} />;
		case "warning":
			return <Warning16Filled {...props} />;
		case "info":
			return <Info16Filled {...props} />;
	}
};

interface ProblemListProps {
	diagnostics: readonly Diagnostic[];
	className?: string;
}

export const ProblemList = ({ diagnostics, className }: ProblemListProps) => {
	const styles = useStyles();
	return (
		<ul className={mergeClasses(styles.list, className)}>
			{diagnostics.map((diagnostic, index) => (
				<li key={index} className={styles.item}>
					<SeverityIcon severity={diagnostic.severity} />
					<Text size={200}>{diagnostic.message}</Text>
				</li>
			))}
		</ul>
	);
};

interface RowProblemIconProps {
	diagnostics: readonly Diagnostic[];
	beneath: DiagnosticSeverity | null;
}

export const RowProblemIcon = ({ diagnostics, beneath }: RowProblemIconProps) => {
	const styles = useStyles();
	const severity = worseSeverity(worstSeverity(diagnostics), beneath);
	if (severity === null) {
		return null;
	}
	return (
		<Tooltip
			relationship="label"
			withArrow
			content={
				<>
					{diagnostics.length > 0 ? <ProblemList diagnostics={diagnostics} /> : null}
					{beneath ? (
						<Text size={200} className={diagnostics.length > 0 ? styles.muted : undefined}>
							{beneathText(beneath)}
						</Text>
					) : null}
				</>
			}>
			<span className={styles.trigger} role="img">
				<SeverityIcon severity={severity} />
			</span>
		</Tooltip>
	);
};
