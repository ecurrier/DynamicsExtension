import { makeStyles, mergeClasses, tokens, Tooltip } from "@fluentui/react-components";

import { CopyButton } from "@/shared/components";

import { truncateMiddle } from "../lib";

export const COPY_REVEAL = "compare-copy";

const useStyles = makeStyles({
	root: {
		display: "flex",
		alignItems: "center",
		columnGap: tokens.spacingHorizontalXXS,
		minWidth: 0,
	},
	text: {
		minWidth: 0,
		overflow: "hidden",
		whiteSpace: "nowrap",
		textOverflow: "ellipsis",
		fontFamily: tokens.fontFamilyMonospace,
		fontSize: tokens.fontSizeBase200,
		color: tokens.colorNeutralForeground2,
	},
	copy: {
		flexShrink: 0,
		opacity: 0,
		"&:focus-within": {
			opacity: 1,
		},
		"& button": {
			minWidth: "20px",
			width: "20px",
			height: "20px",
			padding: 0,
		},
	},
});

export const GuidCell = ({ value }: { value: string }) => {
	const styles = useStyles();
	if (!value) {
		return null;
	}
	return (
		<span className={styles.root}>
			<Tooltip content={value} relationship="description">
				<span className={styles.text}>{truncateMiddle(value)}</span>
			</Tooltip>
			<span className={mergeClasses(styles.copy, COPY_REVEAL)}>
				<CopyButton text={value} label="Copy the GUID" successMessage="Copied the GUID." appearance="transparent" size="small" iconOnly />
			</span>
		</span>
	);
};
