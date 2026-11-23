import { Caption1, makeStyles, Text, tokens } from "@fluentui/react-components";

import { useStart } from "./StartContext";

const useStyles = makeStyles({
	grid: {
		display: "grid",
		gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
		gap: tokens.spacingHorizontalM,
		margin: 0,
		padding: 0,
		listStyleType: "none",
	},
	card: {
		display: "flex",
		flexDirection: "column",
		alignItems: "flex-start",
		rowGap: tokens.spacingVerticalXS,
		boxSizing: "border-box",
		width: "100%",
		height: "100%",
		padding: tokens.spacingHorizontalL,
		border: `1px solid ${tokens.colorNeutralStroke2}`,
		borderRadius: tokens.borderRadiusLarge,
		backgroundColor: tokens.colorNeutralBackground1,
		color: tokens.colorNeutralForeground1,
		fontFamily: tokens.fontFamilyBase,
		textAlign: "left",
		cursor: "pointer",
		":hover": {
			backgroundColor: tokens.colorNeutralBackground1Hover,
			border: `1px solid ${tokens.colorBrandStroke2Hover}`,
		},
		":active": {
			backgroundColor: tokens.colorNeutralBackground1Pressed,
		},
		":focus-visible": {
			outline: `2px solid ${tokens.colorStrokeFocus2}`,
			outlineOffset: "1px",
		},
	},
	icon: {
		fontSize: "20px",
		color: tokens.colorBrandForeground1,
	},
	text: {
		color: tokens.colorNeutralForeground3,
	},
});

export const StartingPointCards = () => {
	const styles = useStyles();
	const { startingPoints, start } = useStart();
	return (
		<ul className={styles.grid} aria-label="Starting points">
			{startingPoints.map((point) => (
				<li key={point.kind}>
					<button type="button" className={styles.card} onClick={() => start(point.kind)}>
						<point.icon className={styles.icon} />
						<Text weight="semibold">{point.title}</Text>
						<Caption1 className={styles.text}>{point.text}</Caption1>
					</button>
				</li>
			))}
		</ul>
	);
};
