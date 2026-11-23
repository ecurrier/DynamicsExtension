import { Button, makeStyles, mergeClasses, Text, tokens } from "@fluentui/react-components";
import { ChevronDown16Regular, ChevronRight16Regular } from "@fluentui/react-icons";
import { useState } from "react";

import { cellValueText, columnCountText, type DifferingPair, displayWindow, rangeCaption, recordLink, type ResultGridColumn } from "../lib";
import { DisplayPager } from "./DisplayPager";
import { PairDetails } from "./PairDetails";

const useStyles = makeStyles({
	root: {
		display: "flex",
		flexDirection: "column",
		flexGrow: 1,
		minHeight: 0,
		rowGap: tokens.spacingVerticalXS,
	},
	scroller: {
		flexGrow: 1,
		minHeight: 0,
		overflow: "auto",
		border: `1px solid ${tokens.colorNeutralStroke2}`,
		borderRadius: tokens.borderRadiusMedium,
		backgroundColor: tokens.colorNeutralBackground1,
	},
	list: {
		margin: 0,
		padding: 0,
		listStyleType: "none",
	},
	row: {
		display: "grid",
		alignItems: "center",
		columnGap: tokens.spacingHorizontalM,
		minHeight: "28px",
		paddingRight: tokens.spacingHorizontalM,
		borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
	},
	withLabel: {
		gridTemplateColumns: "minmax(200px, 1.4fr) minmax(120px, 1fr) 90px minmax(140px, 2fr)",
	},
	withoutLabel: {
		gridTemplateColumns: "minmax(200px, 1.4fr) 90px minmax(140px, 2fr)",
	},
	header: {
		position: "sticky",
		top: 0,
		zIndex: 1,
		backgroundColor: tokens.colorNeutralBackground1,
		color: tokens.colorNeutralForeground3,
		fontWeight: tokens.fontWeightSemibold,
		paddingLeft: "32px",
	},
	toggle: {
		justifyContent: "flex-start",
		minWidth: 0,
		maxWidth: "100%",
		fontWeight: tokens.fontWeightRegular,
	},
	cell: {
		minWidth: 0,
		overflow: "hidden",
		whiteSpace: "nowrap",
		textOverflow: "ellipsis",
	},
	count: {
		fontVariantNumeric: "tabular-nums",
	},
	muted: {
		color: tokens.colorNeutralForeground3,
	},
});

interface PairSide {
	name: string;
	appUrl: string | null;
}

interface PairListProps {
	pairs: readonly DifferingPair[];
	keyLabel: string;
	keyText: (pair: DifferingPair) => string;
	labelColumn: ResultGridColumn | null;
	primaryKeyColumn: ResultGridColumn | null;
	first: PairSide;
	second: PairSide;
}

export const PairList = ({ pairs, keyLabel, keyText, labelColumn, primaryKeyColumn, first, second }: PairListProps) => {
	const styles = useStyles();
	const [page, setPage] = useState(0);
	const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set(pairs.length === 1 ? [0] : []));
	const visible = displayWindow(pairs.length, page);
	const layout = labelColumn ? styles.withLabel : styles.withoutLabel;
	const toggle = (index: number) =>
		setOpen((current) => {
			const next = new Set(current);
			if (!next.delete(index)) {
				next.add(index);
			}
			return next;
		});
	const linkOf = (pair: DifferingPair, side: "first" | "second", appUrl: string | null) =>
		primaryKeyColumn ? recordLink(pair[side], primaryKeyColumn, appUrl) : null;

	return (
		<div className={styles.root}>
			<div className={styles.scroller}>
				<div className={mergeClasses(styles.row, layout, styles.header)} aria-hidden>
					<Text size={200} className={styles.cell}>
						{keyLabel}
					</Text>
					{labelColumn ? (
						<Text size={200} className={styles.cell}>
							{labelColumn.label}
						</Text>
					) : null}
					<Text size={200}>Differ</Text>
					<Text size={200}>Columns</Text>
				</div>
				<ul className={styles.list} aria-label="Pairs with different values">
					{pairs.slice(visible.start, visible.end).map((pair, offset) => {
						const index = visible.start + offset;
						const expanded = open.has(index);
						const key = keyText(pair);
						const columns = pair.differences.map((difference) => difference.label).join(", ");
						return (
							<li key={index}>
								<div className={mergeClasses(styles.row, layout)}>
									<Button
										size="small"
										appearance="transparent"
										className={styles.toggle}
										icon={expanded ? <ChevronDown16Regular /> : <ChevronRight16Regular />}
										aria-expanded={expanded}
										title={key}
										onClick={() => toggle(index)}>
										<span className={styles.cell}>{key}</span>
									</Button>
									{labelColumn ? (
										<Text size={200} className={styles.cell} title={cellValueText(pair.first, labelColumn.key, "friendly")}>
											{cellValueText(pair.first, labelColumn.key, "friendly")}
										</Text>
									) : null}
									<Text size={200} className={styles.count}>
										{columnCountText(pair.differences.length)}
									</Text>
									<Text size={200} className={mergeClasses(styles.cell, styles.muted)} title={columns}>
										{columns}
									</Text>
								</div>
								{expanded ? (
									<PairDetails
										pair={pair}
										first={{ name: first.name, href: linkOf(pair, "first", first.appUrl) }}
										second={{ name: second.name, href: linkOf(pair, "second", second.appUrl) }}
									/>
								) : null}
							</li>
						);
					})}
				</ul>
			</div>
			<DisplayPager visible={visible} caption={rangeCaption(visible, pairs.length, "Pairs")} noun="pairs" onPageChange={setPage} />
		</div>
	);
};
