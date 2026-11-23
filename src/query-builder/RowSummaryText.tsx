import { makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import { Fragment } from "react";

import { type RowSummary, type SummaryTone } from "./lib";

const useStyles = makeStyles({
	root: {
		display: "inline-flex",
		alignItems: "baseline",
		columnGap: tokens.spacingHorizontalXS,
		whiteSpace: "nowrap",
	},
	separator: {
		color: tokens.colorNeutralForeground4,
	},
	name: {
		fontWeight: tokens.fontWeightSemibold,
	},
	alt: {
		color: tokens.colorNeutralForeground3,
		fontSize: tokens.fontSizeBase200,
	},
	word: {
		fontFamily: tokens.fontFamilyMonospace,
		fontSize: tokens.fontSizeBase200,
		color: tokens.colorNeutralForeground2,
	},
	value: {
		fontFamily: tokens.fontFamilyMonospace,
		fontSize: tokens.fontSizeBase200,
	},
	comment: {
		fontStyle: "italic",
		color: tokens.colorNeutralForeground3,
	},
});

interface RowSummaryTextProps {
	summary: RowSummary;
	comment?: boolean;
}

export const RowSummaryText = ({ summary, comment = false }: RowSummaryTextProps) => {
	const styles = useStyles();
	const toneClass: Record<SummaryTone, string> = { name: styles.name, alt: styles.alt, word: styles.word, value: styles.value };
	return (
		<span className={styles.root}>
			{summary.map((group, groupIndex) => (
				<Fragment key={groupIndex}>
					{groupIndex > 0 ? <span className={styles.separator}>·</span> : null}
					{group.map((part, partIndex) => (
						<span key={partIndex} className={mergeClasses(toneClass[part.tone], comment && styles.comment)}>
							{part.text}
						</span>
					))}
				</Fragment>
			))}
		</span>
	);
};
