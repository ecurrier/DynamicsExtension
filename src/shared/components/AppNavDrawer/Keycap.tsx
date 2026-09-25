import { makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import { type ComponentProps } from "react";

const useStyles = makeStyles({
	root: {
		display: "inline-block",
		padding: `0 ${tokens.spacingHorizontalXS}`,
		border: `1px solid ${tokens.colorNeutralStroke1}`,
		borderRadius: tokens.borderRadiusMedium,
		boxShadow: `inset 0 -1px 0 ${tokens.colorNeutralStroke1}`,
		backgroundColor: tokens.colorNeutralBackground2,
		fontFamily: tokens.fontFamilyBase,
		fontSize: tokens.fontSizeBase200,
		lineHeight: tokens.lineHeightBase200,
		color: tokens.colorNeutralForeground3,
		whiteSpace: "nowrap",
	},
});

export const Keycap = ({ className, ...props }: ComponentProps<"kbd">) => {
	const styles = useStyles();
	return <kbd {...props} className={mergeClasses(styles.root, className)} />;
};
