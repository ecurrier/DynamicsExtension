import { Button, makeStyles, Text, tokens } from "@fluentui/react-components";
import { ChevronLeft20Regular, ChevronRight20Regular } from "@fluentui/react-icons";

import { type DisplayWindow } from "../lib";

const useStyles = makeStyles({
	pager: {
		display: "flex",
		alignItems: "center",
		justifyContent: "flex-end",
		flexShrink: 0,
		columnGap: tokens.spacingHorizontalXS,
	},
	caption: {
		color: tokens.colorNeutralForeground3,
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
		<div className={styles.pager}>
			<Text size={200} className={styles.caption}>
				{caption}
			</Text>
			<Button
				size="small"
				appearance="subtle"
				icon={<ChevronLeft20Regular />}
				disabled={visible.page === 0}
				onClick={() => onPageChange(visible.page - 1)}
				aria-label={`Previous ${noun}`}
			/>
			<Button
				size="small"
				appearance="subtle"
				icon={<ChevronRight20Regular />}
				disabled={visible.page >= visible.pageCount - 1}
				onClick={() => onPageChange(visible.page + 1)}
				aria-label={`Next ${noun}`}
			/>
		</div>
	);
};
