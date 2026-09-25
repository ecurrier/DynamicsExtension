import { makeStyles, tokens } from "@fluentui/react-components";

export const usePanelStyles = makeStyles({
	panel: {
		display: "flex",
		flexDirection: "column",
		minWidth: 0,
		minHeight: 0,
		overflow: "hidden",
		border: `1px solid ${tokens.colorNeutralStroke2}`,
		borderRadius: tokens.borderRadiusXLarge,
		backgroundColor: tokens.colorNeutralBackground1,
	},
	header: {
		display: "flex",
		flexDirection: "column",
		rowGap: tokens.spacingVerticalXS,
		padding: `${tokens.spacingVerticalXL} ${tokens.spacingHorizontalXXL} ${tokens.spacingVerticalL}`,
		borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
	},
	heading: {
		margin: 0,
	},
	body: {
		display: "flex",
		flexDirection: "column",
		rowGap: tokens.spacingVerticalM,
		flexGrow: 1,
		minHeight: 0,
		overflowY: "auto",
		padding: `${tokens.spacingVerticalXL} ${tokens.spacingHorizontalXXL}`,
	},
	code: {
		fontFamily: tokens.fontFamilyMonospace,
	},
	muted: {
		color: tokens.colorNeutralForeground3,
	},
	message: {
		display: "flex",
		flexDirection: "column",
		alignItems: "flex-start",
		rowGap: tokens.spacingVerticalS,
		maxWidth: "560px",
		padding: `${tokens.spacingVerticalXXXL} ${tokens.spacingHorizontalXXL}`,
	},
});
