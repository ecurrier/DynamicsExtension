import { Button, makeStyles, tokens, Tooltip } from "@fluentui/react-components";
import { Box20Regular, ChevronDown16Regular } from "@fluentui/react-icons";

import { type SchemaSolution } from "./useSchemaSolution";

const useStyles = makeStyles({
	button: {
		minWidth: 0,
		maxWidth: "100%",
		columnGap: tokens.spacingHorizontalS,
		fontWeight: tokens.fontWeightRegular,
	},
	caption: {
		color: tokens.colorNeutralForeground3,
		"@container (max-width: 900px)": {
			display: "none",
		},
	},
	name: {
		minWidth: 0,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		fontWeight: tokens.fontWeightSemibold,
	},
	prefix: {
		padding: `0 ${tokens.spacingHorizontalXS}`,
		border: `1px solid ${tokens.colorNeutralStroke2}`,
		borderRadius: tokens.borderRadiusMedium,
		backgroundColor: tokens.colorNeutralBackground3,
		fontFamily: tokens.fontFamilyMonospace,
		fontSize: tokens.fontSizeBase200,
		color: tokens.colorNeutralForeground2,
	},
	chevron: {
		flexShrink: 0,
		color: tokens.colorNeutralForeground2,
	},
});

interface SolutionButtonProps {
	solution: SchemaSolution;
	compact?: boolean;
}

export const SolutionButton = ({ solution, compact = false }: SolutionButtonProps) => {
	const styles = useStyles();
	return (
		<Tooltip content="Schema changes are made in this solution. Select it to choose another." relationship="description">
			<Button className={styles.button} icon={<Box20Regular />} onClick={solution.choose}>
				{compact ? null : <span className={styles.caption}>Solution</span>}
				<span className={styles.name}>{solution.current?.name ?? "Choose a solution"}</span>
				{solution.prefix ? <span className={styles.prefix}>{solution.prefix}_</span> : null}
				<ChevronDown16Regular className={styles.chevron} />
			</Button>
		</Tooltip>
	);
};
