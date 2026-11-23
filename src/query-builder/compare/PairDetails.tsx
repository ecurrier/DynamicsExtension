import { Link, makeStyles, Text, tokens } from "@fluentui/react-components";
import { Fragment } from "react";

import { type CellValue, cellText, type DifferingPair, EMPTY_VALUE, showsRaw } from "../lib";

const useStyles = makeStyles({
	table: {
		display: "grid",
		gridTemplateColumns: "minmax(120px, max-content) minmax(0, 360px) minmax(0, 360px)",
		columnGap: tokens.spacingHorizontalL,
		rowGap: tokens.spacingVerticalXXS,
		padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM} ${tokens.spacingVerticalS} 32px`,
		backgroundColor: tokens.colorNeutralBackground2,
		borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
	},
	head: {
		color: tokens.colorNeutralForeground3,
		fontWeight: tokens.fontWeightSemibold,
		overflow: "hidden",
		whiteSpace: "nowrap",
		textOverflow: "ellipsis",
	},
	column: {
		color: tokens.colorNeutralForeground2,
		overflowWrap: "anywhere",
	},
	value: {
		display: "flex",
		flexDirection: "column",
		minWidth: 0,
		overflowWrap: "anywhere",
	},
	empty: {
		color: tokens.colorNeutralForeground4,
		fontStyle: "italic",
	},
	raw: {
		color: tokens.colorNeutralForeground3,
		fontFamily: tokens.fontFamilyMonospace,
		fontSize: tokens.fontSizeBase100,
	},
});

const ValueCell = ({ value }: { value: CellValue }) => {
	const styles = useStyles();
	return (
		<span className={styles.value}>
			{value.friendly ? (
				<Text size={200}>{value.friendly}</Text>
			) : (
				<Text size={200} className={styles.empty}>
					{EMPTY_VALUE}
				</Text>
			)}
			{showsRaw(value) ? <span className={styles.raw}>{cellText(value.raw)}</span> : null}
		</span>
	);
};

interface SideHeading {
	name: string;
	href: string | null;
}

const Heading = ({ side }: { side: SideHeading }) => {
	const styles = useStyles();
	return (
		<Text size={200} className={styles.head} title={side.name}>
			{side.href ? (
				<Link href={side.href} target="_blank" rel="noreferrer" title={`Open the Record in ${side.name}`}>
					{side.name}
				</Link>
			) : (
				side.name
			)}
		</Text>
	);
};

interface PairDetailsProps {
	pair: DifferingPair;
	first: SideHeading;
	second: SideHeading;
}

export const PairDetails = ({ pair, first, second }: PairDetailsProps) => {
	const styles = useStyles();
	return (
		<div className={styles.table}>
			<Text size={200} className={styles.head}>
				Column
			</Text>
			<Heading side={first} />
			<Heading side={second} />
			{pair.differences.map((difference) => (
				<Fragment key={difference.column}>
					<Text size={200} className={styles.column}>
						{difference.label}
					</Text>
					<ValueCell value={difference.first} />
					<ValueCell value={difference.second} />
				</Fragment>
			))}
		</div>
	);
};
