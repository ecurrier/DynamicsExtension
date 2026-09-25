import {
	Badge,
	makeStyles,
	mergeClasses,
	Table,
	TableBody,
	TableCell,
	TableHeader,
	TableHeaderCell,
	TableRow,
	TableSelectionCell,
	Text,
	tokens,
	Tooltip,
} from "@fluentui/react-components";
import { LockClosed12Regular, LockClosed16Regular, Warning12Regular, Warning16Regular } from "@fluentui/react-icons";
import { type Dispatch, type SetStateAction, useMemo } from "react";

import { majorityType, typeCounts, typeMismatches } from "@/modules/schema/lib";
import { MANAGED_COLORS, TableFilter, useTableFilter, ValueChip } from "@/shared/components";
import { type AttributeMatch } from "@/shared/types";

const FILTER_THRESHOLD = 10;
const LOCKED_TOOLTIP = "Locked by its managed solution, so it can't be customised.";

const useStyles = makeStyles({
	card: {
		display: "flex",
		flexDirection: "column",
		flexGrow: 1,
		minHeight: 0,
		overflow: "hidden",
		border: `1px solid ${tokens.colorNeutralStroke2}`,
		borderRadius: tokens.borderRadiusXLarge,
		backgroundColor: tokens.colorNeutralBackground1,
		"@container (max-width: 880px)": {
			flexGrow: 0,
		},
	},
	header: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		columnGap: tokens.spacingHorizontalM,
		rowGap: tokens.spacingVerticalS,
		padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
		borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
	},
	title: {
		margin: 0,
	},
	code: {
		fontFamily: tokens.fontFamilyMonospace,
		fontWeight: tokens.fontWeightRegular,
	},
	badges: {
		display: "flex",
		flexWrap: "wrap",
		columnGap: tokens.spacingHorizontalSNudge,
		rowGap: tokens.spacingVerticalXS,
	},
	filter: {
		marginLeft: "auto",
		width: "240px",
	},
	scroller: {
		flexGrow: 1,
		minHeight: 0,
		overflow: "auto",
		"@container (max-width: 880px)": {
			overflow: "visible",
		},
	},
	table: {
		tableLayout: "fixed",
		width: "100%",
	},
	head: {
		position: "sticky",
		top: 0,
		zIndex: 1,
		backgroundColor: tokens.colorNeutralBackground1,
	},
	tableColumn: {
		width: "28%",
	},
	typeColumn: {
		width: "13%",
	},
	labelColumn: {
		width: "20%",
	},
	requirementColumn: {
		width: "15%",
	},
	solutionColumn: {
		width: "18%",
	},
	row: {
		cursor: "pointer",
	},
	lockedRow: {
		color: tokens.colorNeutralForeground3,
	},
	nameCell: {
		display: "flex",
		alignItems: "baseline",
		columnGap: tokens.spacingHorizontalSNudge,
		minWidth: 0,
		overflow: "hidden",
		whiteSpace: "nowrap",
	},
	truncate: {
		display: "block",
		minWidth: 0,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
	logicalName: {
		fontFamily: tokens.fontFamilyMonospace,
		fontSize: tokens.fontSizeBase200,
		color: tokens.colorNeutralForeground3,
	},
	mismatch: {
		display: "inline-flex",
		alignItems: "center",
		columnGap: tokens.spacingHorizontalXS,
		color: tokens.colorStatusWarningForeground1,
	},
	locked: {
		display: "inline-flex",
		maxWidth: "100%",
		overflow: "hidden",
		alignItems: "center",
		columnGap: tokens.spacingHorizontalXS,
		fontSize: tokens.fontSizeBase200,
		color: tokens.colorNeutralForeground3,
		whiteSpace: "nowrap",
	},
	footer: {
		display: "flex",
		flexWrap: "wrap",
		columnGap: tokens.spacingHorizontalS,
		padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
		borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
		color: tokens.colorNeutralForeground3,
	},
	count: {
		color: tokens.colorNeutralForeground1,
	},
	empty: {
		display: "flex",
		flexDirection: "column",
		rowGap: tokens.spacingVerticalXS,
		padding: `${tokens.spacingVerticalXXL} ${tokens.spacingHorizontalL}`,
	},
	muted: {
		color: tokens.colorNeutralForeground3,
	},
});

const matchFields = (match: AttributeMatch) => [match.tableDisplayName, match.tableLogicalName, match.attributeType, match.label];

const listNames = (names: string[]): string => (names.length > 2 ? `${names.length} tables` : names.join(" and "));

interface ColumnMatchesCardProps {
	logicalName: string;
	matches: AttributeMatch[];
	customOnly: boolean;
	selectedIds: string[];
	onSelectionChange: Dispatch<SetStateAction<string[]>>;
}

export const ColumnMatchesCard = ({ logicalName, matches, customOnly, selectedIds, onSelectionChange }: ColumnMatchesCardProps) => {
	const styles = useStyles();
	const filter = useTableFilter(matches, matchFields);
	const filtering = matches.length > FILTER_THRESHOLD;
	const visible = filtering ? filter.filtered : matches;
	const majority = useMemo(() => majorityType(matches), [matches]);
	const mismatched = useMemo(() => typeMismatches(matches), [matches]);
	const types = useMemo(() => typeCounts(matches), [matches]);
	const lockedNames = matches.filter((match) => !match.isCustomizable).map((match) => match.tableDisplayName);
	const selectedSet = new Set(selectedIds);
	const visibleSelectable = visible.filter((match) => match.isCustomizable);
	const allSelected = visibleSelectable.length > 0 && visibleSelectable.every((match) => selectedSet.has(match.tableLogicalName));
	const someSelected = visibleSelectable.some((match) => selectedSet.has(match.tableLogicalName));

	const toggle = (match: AttributeMatch) => {
		if (!match.isCustomizable) {
			return;
		}
		const id = match.tableLogicalName;
		onSelectionChange((current) => (current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]));
	};

	const toggleAll = () => {
		const ids = visibleSelectable.map((match) => match.tableLogicalName);
		onSelectionChange((current) => (allSelected ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])]));
	};

	const tableCount = matches.length === 1 ? "1 table has" : `${matches.length} tables have`;

	return (
		<section aria-label="Tables that have this column" className={styles.card}>
			<div className={styles.header}>
				<Text as="h2" size={400} weight="semibold" className={styles.title}>
					{tableCount} <span className={styles.code}>{logicalName}</span>
				</Text>
				<div className={styles.badges}>
					{types.map((type) =>
						type.majority ? (
							<Badge key={type.type} appearance="tint" color="informative">
								{type.count} {type.type}
							</Badge>
						) : (
							<Tooltip
								key={type.type}
								content={`${type.type}, while most are ${majority}. Selected together, only the settings they share can change.`}
								relationship="description">
								<Badge appearance="tint" color="severe" icon={<Warning12Regular />}>
									{type.count} {type.type}
								</Badge>
							</Tooltip>
						)
					)}
					{lockedNames.length > 0 ? (
						<Badge appearance="tint" color="subtle" icon={<LockClosed12Regular />}>
							{lockedNames.length} locked
						</Badge>
					) : null}
				</div>
				{filtering ? (
					<div className={styles.filter}>
						<TableFilter query={filter.query} onChange={filter.setQuery} shown={filter.shown} total={filter.total} placeholder="Filter tables" />
					</div>
				) : null}
			</div>
			{matches.length === 0 ? (
				<div className={styles.empty}>
					<Text weight="semibold">
						No table has a column called <span className={styles.code}>{logicalName}</span>
					</Text>
					<Text size={200} className={styles.muted}>
						Logical names are lowercase and include the publisher prefix, like new_region.
						{customOnly ? " Clear Custom tables only to include system tables." : ""}
					</Text>
				</div>
			) : (
				<>
					<div className={styles.scroller}>
						<Table size="small" className={styles.table} aria-label={`Tables that have ${logicalName}`}>
							<TableHeader className={styles.head}>
								<TableRow>
									<TableSelectionCell
										checked={allSelected ? true : someSelected ? "mixed" : false}
										onClick={toggleAll}
										checkboxIndicator={{ "aria-label": "Select every table that can be changed", disabled: visibleSelectable.length === 0 }}
									/>
									<TableHeaderCell className={styles.tableColumn}>Table</TableHeaderCell>
									<TableHeaderCell className={styles.typeColumn}>Type</TableHeaderCell>
									<TableHeaderCell className={styles.labelColumn}>Label</TableHeaderCell>
									<TableHeaderCell className={styles.requirementColumn}>Requirement</TableHeaderCell>
									<TableHeaderCell className={styles.solutionColumn}>Solution</TableHeaderCell>
								</TableRow>
							</TableHeader>
							<TableBody>
								{visible.map((match) => {
									const locked = !match.isCustomizable;
									const selected = selectedSet.has(match.tableLogicalName);
									return (
										<TableRow
											key={match.tableLogicalName}
											appearance={selected ? "brand" : "none"}
											className={locked ? styles.lockedRow : styles.row}
											onClick={() => toggle(match)}>
											<TableSelectionCell
												checked={selected}
												checkboxIndicator={{
													"aria-label": locked
														? `${match.tableDisplayName} is locked by its managed solution`
														: `Select ${match.tableDisplayName}`,
													disabled: locked,
												}}
											/>
											<TableCell>
												<span className={styles.nameCell}>
													<span className={styles.truncate}>{match.tableDisplayName}</span>
													<span className={mergeClasses(styles.logicalName, styles.truncate)}>{match.tableLogicalName}</span>
												</span>
											</TableCell>
											<TableCell>
												{mismatched.has(match.tableLogicalName) ? (
													<Tooltip
														content={`${match.attributeType}, while most are ${majority}. Selected together, only the settings they share can change.`}
														relationship="description">
														<span className={styles.mismatch}>
															<Warning16Regular />
															{match.attributeType}
														</span>
													</Tooltip>
												) : (
													match.attributeType
												)}
											</TableCell>
											<TableCell>
												<span className={styles.truncate} title={match.label}>
													{match.label}
												</span>
											</TableCell>
											<TableCell>
												<span className={styles.truncate} title={match.requiredLevel}>
													{match.requiredLevel}
												</span>
											</TableCell>
											<TableCell>
												{locked ? (
													<Tooltip content={LOCKED_TOOLTIP} relationship="description">
														<span className={styles.locked}>
															<LockClosed16Regular />
															Managed, locked
														</span>
													</Tooltip>
												) : (
													<ValueChip value={match.isManaged ? "Managed" : "Unmanaged"} palette={MANAGED_COLORS} />
												)}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>
					<div className={styles.footer}>
						<Text size={200} weight="semibold" className={styles.count}>
							{selectedIds.length} of {matches.length} selected
						</Text>
						{lockedNames.length > 0 ? (
							<Text size={200}>
								· {listNames(lockedNames)} {lockedNames.length === 1 ? "is" : "are"} locked by{" "}
								{lockedNames.length === 1 ? "its managed solution" : "their managed solutions"}.
							</Text>
						) : null}
					</div>
				</>
			)}
		</section>
	);
};
