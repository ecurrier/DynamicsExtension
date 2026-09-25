import { makeStyles, mergeClasses, Text, tokens } from "@fluentui/react-components";
import { Fragment, type ReactNode } from "react";

import { Keycap } from "./Keycap";
import { type HighlightSegment, type NavSearchResults as NavSearchResultSet } from "./navSearch";

const useStyles = makeStyles({
	count: {
		marginBlockStart: tokens.spacingVerticalXS,
		marginInlineStart: tokens.spacingHorizontalMNudge,
		fontSize: tokens.fontSizeBase200,
		lineHeight: tokens.lineHeightBase200,
		color: tokens.colorNeutralForeground3,
	},
	listbox: {
		display: "flex",
		flexDirection: "column",
		paddingBlockEnd: tokens.spacingVerticalS,
	},
	groupLabel: {
		marginBlockStart: tokens.spacingVerticalM,
		marginBlockEnd: tokens.spacingVerticalXS,
		marginInlineStart: tokens.spacingHorizontalMNudge,
		fontSize: tokens.fontSizeBase200,
		lineHeight: tokens.lineHeightBase200,
		fontWeight: tokens.fontWeightSemibold,
		color: tokens.colorNeutralForeground1,
	},
	option: {
		display: "flex",
		alignItems: "flex-start",
		columnGap: tokens.spacingHorizontalM,
		padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalS} ${tokens.spacingVerticalS} ${tokens.spacingHorizontalMNudge}`,
		borderRadius: tokens.borderRadiusMedium,
		color: tokens.colorNeutralForeground2,
		cursor: "pointer",
		":hover": {
			backgroundColor: tokens.colorNeutralBackground4Hover,
		},
	},
	active: {
		backgroundColor: tokens.colorNeutralBackground1,
		boxShadow: tokens.shadow2,
		":hover": {
			backgroundColor: tokens.colorNeutralBackground1,
		},
	},
	icon: {
		flexShrink: 0,
		marginBlockStart: "2px",
		fontSize: "20px",
	},
	text: {
		display: "flex",
		flexDirection: "column",
		rowGap: "2px",
		flexGrow: 1,
		minWidth: 0,
	},
	label: {
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		fontSize: tokens.fontSizeBase300,
		lineHeight: tokens.lineHeightBase300,
		color: tokens.colorNeutralForeground1,
	},
	description: {
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		fontSize: tokens.fontSizeBase200,
		lineHeight: tokens.lineHeightBase200,
		color: tokens.colorNeutralForeground3,
	},
	match: {
		backgroundColor: "transparent",
		color: tokens.colorNeutralForeground1,
		fontWeight: tokens.fontWeightSemibold,
	},
	keyword: {
		marginInlineEnd: tokens.spacingHorizontalSNudge,
		padding: `0 ${tokens.spacingHorizontalXS}`,
		border: `1px solid ${tokens.colorNeutralStroke2}`,
		borderRadius: tokens.borderRadiusMedium,
		backgroundColor: tokens.colorNeutralBackground1,
		color: tokens.colorNeutralForeground2,
	},
	enter: {
		alignSelf: "center",
		flexShrink: 0,
	},
	empty: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		rowGap: tokens.spacingVerticalXS,
		padding: `${tokens.spacingVerticalXXL} ${tokens.spacingHorizontalL}`,
		textAlign: "center",
	},
	muted: {
		color: tokens.colorNeutralForeground3,
	},
});

interface NavSearchResultsProps {
	listboxId: string;
	query: string;
	results: NavSearchResultSet;
	activeIndex: number;
	optionId: (index: number) => string;
	onSelect: (index: number) => void;
}

const highlight = (segments: HighlightSegment[], className: string): ReactNode =>
	segments.map((segment, index) =>
		segment.match ? (
			<mark key={index} className={className}>
				{segment.text}
			</mark>
		) : (
			<Fragment key={index}>{segment.text}</Fragment>
		)
	);

const countLabel = ({ hits, total }: NavSearchResultSet): string => {
	if (total > hits.length) {
		return `Top ${hits.length} of ${total} results`;
	}
	return total === 1 ? "1 result" : `${total} results`;
};

export const NavSearchResults = ({ listboxId, query, results, activeIndex, optionId, onSelect }: NavSearchResultsProps) => {
	const styles = useStyles();
	if (results.hits.length === 0) {
		return (
			<div role="status" className={styles.empty}>
				<Text weight="semibold">No tools match “{query.trim()}”</Text>
				<Text size={200} className={styles.muted}>
					Try what you want to do, like roles, audit, or fetch.
				</Text>
			</div>
		);
	}
	return (
		<>
			<div role="status" className={styles.count}>
				{countLabel(results)}
			</div>
			<div role="listbox" id={listboxId} aria-label="Tools" className={styles.listbox}>
				{results.groups.map((group) => {
					const Icon = group.icon;
					const labelId = `${listboxId}-${group.moduleId}`;
					return (
						<div key={group.moduleId} role="group" aria-labelledby={labelId}>
							<div id={labelId} role="presentation" className={styles.groupLabel}>
								{group.label}
							</div>
							{group.hits.map((hit) => {
								const active = hit.index === activeIndex;
								return (
									<div
										key={hit.key}
										id={optionId(hit.index)}
										role="option"
										aria-selected={active}
										className={mergeClasses(styles.option, active && styles.active)}
										onMouseDown={(event) => event.preventDefault()}
										onClick={() => onSelect(hit.index)}>
										<Icon className={styles.icon} />
										<span className={styles.text}>
											<span className={styles.label}>{highlight(hit.label, styles.match)}</span>
											<span className={styles.description}>
												{hit.keyword ? <span className={styles.keyword}>{hit.keyword}</span> : null}
												{hit.context ? `${hit.context} · ` : null}
												{highlight(hit.description, styles.match)}
											</span>
										</span>
										{active ? (
											<Keycap className={styles.enter} aria-hidden>
												Enter
											</Keycap>
										) : null}
									</div>
								);
							})}
						</div>
					);
				})}
			</div>
		</>
	);
};
