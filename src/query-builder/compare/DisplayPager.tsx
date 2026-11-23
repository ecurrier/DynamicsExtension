import { Button, makeStyles, Text, tokens } from "@fluentui/react-components";
import { ChevronLeft20Regular, ChevronRight20Regular } from "@fluentui/react-icons";

import { type DisplayWindow, pagerLabel } from "../lib";
import { CAPTION_HIDDEN } from "./compareBreakpoints";

const useStyles = makeStyles({
	pager: {
		display: "inline-flex",
		alignItems: "center",
		flexShrink: 0,
		columnGap: tokens.spacingHorizontalXXS,
	},
	caption: {
		marginRight: tokens.spacingHorizontalXS,
		color: tokens.colorNeutralForeground3,
		fontVariantNumeric: "tabular-nums",
		whiteSpace: "nowrap",
		[CAPTION_HIDDEN]: {
			display: "none",
		},
	},
});

interface DisplayPagerProps {
	visible: DisplayWindow;
	caption: string;
	noun: string;
	onPageChange: (page: number) => void;
}

export const DisplayPager = ({ visible, caption, noun, onPageChange }: DisplayPagerProps) => {
	const styles = useStyles();
	return (
		<span className={styles.pager}>
			<Text size={200} className={styles.caption} aria-live="polite">
				{caption}
			</Text>
			<Button
				size="small"
				appearance="subtle"
				icon={<ChevronLeft20Regular />}
				disabled={visible.page === 0}
				onClick={() => onPageChange(visible.page - 1)}
				aria-label={pagerLabel("Previous", noun, caption)}
				title={caption}
			/>
			<Button
				size="small"
				appearance="subtle"
				icon={<ChevronRight20Regular />}
				disabled={visible.page >= visible.pageCount - 1}
				onClick={() => onPageChange(visible.page + 1)}
				aria-label={pagerLabel("Next", noun, caption)}
				title={caption}
			/>
		</span>
	);
};
