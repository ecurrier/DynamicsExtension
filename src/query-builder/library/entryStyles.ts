import { makeStyles, tokens } from "@fluentui/react-components";

export const useEntryStyles = makeStyles({
	list: {
		display: "flex",
		flexDirection: "column",
		margin: 0,
		padding: 0,
		listStyleType: "none",
	},
	entry: {
		display: "flex",
		flexDirection: "column",
		padding: `${tokens.spacingVerticalXXS} 0`,
		borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
	},
	row: {
		display: "flex",
		alignItems: "center",
		columnGap: tokens.spacingHorizontalXS,
		minWidth: 0,
	},
	open: {
		display: "flex",
		flexDirection: "column",
		alignItems: "flex-start",
		flexGrow: 1,
		minWidth: 0,
		padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
		border: "none",
		borderRadius: tokens.borderRadiusMedium,
		backgroundColor: "transparent",
		color: tokens.colorNeutralForeground1,
		fontFamily: tokens.fontFamilyBase,
		fontSize: tokens.fontSizeBase300,
		lineHeight: tokens.lineHeightBase300,
		textAlign: "left",
		cursor: "pointer",
		":hover": {
			backgroundColor: tokens.colorNeutralBackground1Hover,
		},
		":active": {
			backgroundColor: tokens.colorNeutralBackground1Pressed,
		},
		":focus-visible": {
			outline: `2px solid ${tokens.colorStrokeFocus2}`,
			outlineOffset: "-2px",
		},
	},
	title: {
		maxWidth: "100%",
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		fontWeight: tokens.fontWeightSemibold,
	},
	mono: {
		fontFamily: tokens.fontFamilyMonospace,
	},
	meta: {
		maxWidth: "100%",
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		color: tokens.colorNeutralForeground3,
	},
	empty: {
		padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalS}`,
		color: tokens.colorNeutralForeground3,
	},
});
