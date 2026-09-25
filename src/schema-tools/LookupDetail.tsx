import { Button, Label, makeStyles, mergeClasses, Text, tokens, Tooltip, useId } from "@fluentui/react-components";
import { Add20Regular, Delete20Regular, Table20Regular } from "@fluentui/react-icons";
import { useCallback, useState } from "react";

import { CopyButton, TableFilter, useTableFilter } from "@/shared/components";
import { relationshipSchemaName } from "@/shared/lib";
import { type EntitySummary, type PolymorphicLookup, type PolymorphicTarget } from "@/shared/types";

import { usePanelStyles } from "./panelStyles";
import { TableCombobox } from "./TableCombobox";

const TARGET_FILTER_THRESHOLD = 6;

const useStyles = makeStyles({
	meta: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		columnGap: tokens.spacingHorizontalSNudge,
		color: tokens.colorNeutralForeground3,
	},
	sectionHeader: {
		display: "flex",
		flexShrink: 0,
		flexWrap: "wrap",
		alignItems: "flex-end",
		justifyContent: "space-between",
		columnGap: tokens.spacingHorizontalL,
		rowGap: tokens.spacingVerticalS,
	},
	sectionText: {
		display: "flex",
		flexDirection: "column",
		rowGap: "2px",
		minWidth: 0,
	},
	filter: {
		flexShrink: 0,
		maxWidth: "360px",
	},
	targets: {
		flexShrink: 0,
		margin: 0,
		padding: 0,
		listStyleType: "none",
		border: `1px solid ${tokens.colorNeutralStroke2}`,
		borderRadius: tokens.borderRadiusLarge,
		overflow: "hidden",
	},
	target: {
		display: "grid",
		gridTemplateColumns: "20px minmax(140px, 240px) minmax(0, 1fr) auto",
		alignItems: "center",
		columnGap: tokens.spacingHorizontalM,
		minHeight: "52px",
		padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS} ${tokens.spacingVerticalXS} ${tokens.spacingHorizontalL}`,
		borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
		":last-child": {
			borderBottom: "none",
		},
	},
	noMatch: {
		padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
		color: tokens.colorNeutralForeground3,
	},
	targetIcon: {
		fontSize: "20px",
		color: tokens.colorNeutralForeground3,
	},
	targetName: {
		display: "flex",
		flexDirection: "column",
		minWidth: 0,
	},
	truncate: {
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
	small: {
		fontSize: tokens.fontSizeBase200,
		color: tokens.colorNeutralForeground3,
	},
	relationship: {
		fontFamily: tokens.fontFamilyMonospace,
		fontSize: tokens.fontSizeBase200,
		color: tokens.colorNeutralForeground2,
	},
	add: {
		display: "flex",
		flexDirection: "column",
		rowGap: tokens.spacingVerticalS,
		padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
		backgroundColor: tokens.colorNeutralBackground2,
	},
	addControls: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		columnGap: tokens.spacingHorizontalM,
		rowGap: tokens.spacingVerticalS,
	},
	addPicker: {
		width: "260px",
		maxWidth: "100%",
	},
	spacer: {
		flexGrow: 1,
	},
});

interface LookupDetailProps {
	lookup: PolymorphicLookup;
	tableLabel: string;
	tables: EntitySummary[];
	solutionName: string;
	adding: boolean;
	removing: boolean;
	onAddTarget: (targetTable: string) => Promise<boolean>;
	onRemoveTarget: (target: PolymorphicTarget) => void;
}

export const LookupDetail = ({ lookup, tableLabel, tables, solutionName, adding, removing, onAddTarget, onRemoveTarget }: LookupDetailProps) => {
	const styles = useStyles();
	const panel = usePanelStyles();
	const addId = useId("add-target");
	const [addOpen, setAddOpen] = useState(false);
	const [choice, setChoice] = useState("");
	const used = new Set(lookup.targets.map((target) => target.tableLogicalName));
	const addable = tables.filter((table) => !used.has(table.logicalName));
	const nameOf = useCallback((logicalName: string) => tables.find((table) => table.logicalName === logicalName)?.displayName || logicalName, [tables]);
	const targetFields = useCallback(
		(target: PolymorphicTarget) => [nameOf(target.tableLogicalName), target.tableLogicalName, target.relationshipSchemaName],
		[nameOf]
	);
	const filter = useTableFilter(lookup.targets, targetFields);
	const filtering = lookup.targets.length > TARGET_FILTER_THRESHOLD;
	const visibleTargets = filtering ? filter.filtered : lookup.targets;
	const lastTarget = lookup.targets.length <= 1;

	const closeAdd = () => {
		setAddOpen(false);
		setChoice("");
	};

	const confirmAdd = async () => {
		if (choice && (await onAddTarget(choice))) {
			closeAdd();
		}
	};

	return (
		<section aria-label={lookup.label ?? lookup.columnLogicalName} className={panel.panel}>
			<div className={panel.header}>
				<Text as="h2" size={500} weight="semibold" className={panel.heading}>
					{lookup.label ?? lookup.columnLogicalName}
				</Text>
				<div className={styles.meta}>
					<Text size={200} className={panel.code}>
						{lookup.columnLogicalName}
					</Text>
					<CopyButton text={lookup.columnLogicalName} label="Copy logical name" appearance="subtle" size="small" iconOnly />
					<Text size={200} aria-hidden>
						·
					</Text>
					<Text size={200}>Lookup on {tableLabel}</Text>
				</div>
			</div>
			<div className={panel.body}>
				<div className={styles.sectionHeader}>
					<div className={styles.sectionText}>
						<Text as="h3" weight="semibold" className={panel.heading}>
							Target tables
						</Text>
						<Text size={200} className={panel.muted}>
							A value in this column can point at a row in any of these tables. Each target is its own relationship.
						</Text>
					</div>
					<Button icon={<Add20Regular />} disabled={addOpen || addable.length === 0} onClick={() => setAddOpen(true)}>
						Add target
					</Button>
				</div>
				{filtering ? (
					<div className={styles.filter}>
						<TableFilter
							query={filter.query}
							onChange={filter.setQuery}
							shown={filter.shown}
							total={filter.total}
							placeholder="Filter target tables"
						/>
					</div>
				) : null}
				<ul className={styles.targets}>
					{visibleTargets.length === 0 ? <li className={styles.noMatch}>No target tables match that filter.</li> : null}
					{visibleTargets.map((target) => {
						const name = nameOf(target.tableLogicalName);
						return (
							<li key={target.relationshipId} className={styles.target}>
								<Table20Regular className={styles.targetIcon} />
								<span className={styles.targetName}>
									<Text className={styles.truncate}>{name}</Text>
									{name === target.tableLogicalName ? null : (
										<span className={mergeClasses(styles.small, panel.code, styles.truncate)}>{target.tableLogicalName}</span>
									)}
								</span>
								<span className={mergeClasses(styles.relationship, styles.truncate)} title={target.relationshipSchemaName}>
									{target.relationshipSchemaName}
								</span>
								<Tooltip content={lastTarget ? "A polymorphic lookup must keep at least one target" : `Remove ${name}`} relationship="label">
									<Button
										appearance="subtle"
										icon={<Delete20Regular />}
										disabled={removing}
										disabledFocusable={lastTarget}
										onClick={() => onRemoveTarget(target)}
									/>
								</Tooltip>
							</li>
						);
					})}
					{addOpen ? (
						<li className={styles.add}>
							<div className={styles.addControls}>
								<Label htmlFor={addId} weight="semibold">
									Add a target
								</Label>
								<TableCombobox
									id={addId}
									className={styles.addPicker}
									tables={addable}
									value={choice}
									onChange={setChoice}
									placeholder="Choose a table"
								/>
								<div className={styles.spacer} />
								<Button appearance="subtle" disabled={adding} onClick={closeAdd}>
									Cancel
								</Button>
								<Button appearance="primary" disabled={!choice || adding} onClick={() => void confirmAdd()}>
									{adding ? "Adding..." : "Add target"}
								</Button>
							</div>
							<Text size={200} className={panel.muted}>
								{choice ? (
									<>
										Creates the relationship{" "}
										<span className={panel.code}>{relationshipSchemaName(choice, lookup.tableLogicalName, lookup.columnLogicalName)}</span>{" "}
										in {solutionName}. Existing values are unchanged.
									</>
								) : (
									"Adding a target creates another relationship behind the same column."
								)}
							</Text>
						</li>
					) : null}
				</ul>
			</div>
		</section>
	);
};
