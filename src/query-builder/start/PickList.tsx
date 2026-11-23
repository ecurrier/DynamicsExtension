import { makeStyles, tokens } from "@fluentui/react-components";
import { type ReactNode } from "react";

const useStyles = makeStyles({
	items: {
		display: "flex",
		flexDirection: "column",
		margin: 0,
		padding: 0,
		listStyleType: "none",
	},
	item: {
		display: "flex",
		flexDirection: "column",
		alignItems: "flex-start",
		rowGap: "2px",
		width: "100%",
		padding: `${tokens.spacingVerticalSNudge} ${tokens.spacingHorizontalS}`,
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
});

export const PickList = ({ children }: { children: ReactNode }) => <ul className={useStyles().items}>{children}</ul>;

interface PickItemProps {
	onPick: () => void;
	children: ReactNode;
}

export const PickItem = ({ onPick, children }: PickItemProps) => (
	<li>
		<button type="button" className={useStyles().item} onClick={onPick}>
			{children}
		</button>
	</li>
);
