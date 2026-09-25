import { Badge, Button, Label, makeStyles, mergeClasses, MessageBar, MessageBarBody, Spinner, Text, tokens, useId } from "@fluentui/react-components";
import { Add20Regular } from "@fluentui/react-icons";

import { describeError } from "@/shared/lib";
import { type EntitySummary, type PolymorphicLookup } from "@/shared/types";

import { usePanelStyles } from "./panelStyles";
import { TableCombobox } from "./TableCombobox";

const useStyles = makeStyles({
	picker: {
		display: "flex",
		flexDirection: "column",
		rowGap: tokens.spacingVerticalXS,
		padding: tokens.spacingHorizontalL,
		borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
	},
	listHeader: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL} ${tokens.spacingVerticalXS}`,
	},
	list: {
		display: "flex",
		flexDirection: "column",
		rowGap: "2px",
		margin: 0,
		padding: `0 ${tokens.spacingHorizontalS}`,
		listStyleType: "none",
		overflowY: "auto",
	},
	item: {
		width: "100%",
		minHeight: "52px",
		justifyContent: "flex-start",
		columnGap: tokens.spacingHorizontalM,
		padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalMNudge}`,
		borderRadius: tokens.borderRadiusLarge,
		fontWeight: tokens.fontWeightRegular,
		textAlign: "left",
	},
	selected: {
		backgroundColor: tokens.colorBrandBackground2,
		":hover": {
			backgroundColor: tokens.colorBrandBackground2Hover,
		},
	},
	draft: {
		display: "flex",
		alignItems: "center",
		columnGap: tokens.spacingHorizontalM,
		padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalMNudge}`,
		borderRadius: tokens.borderRadiusLarge,
		backgroundColor: tokens.colorBrandBackground2,
	},
	itemText: {
		display: "flex",
		flexDirection: "column",
		flexGrow: 1,
		minWidth: 0,
	},
	truncate: {
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
	itemName: {
		fontFamily: tokens.fontFamilyMonospace,
		fontSize: tokens.fontSizeBase200,
		color: tokens.colorNeutralForeground3,
	},
	itemCount: {
		flexShrink: 0,
		fontSize: tokens.fontSizeBase200,
		color: tokens.colorNeutralForeground3,
	},
	none: {
		padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalL}`,
	},
	spacer: {
		flexGrow: 1,
	},
	footer: {
		padding: tokens.spacingHorizontalL,
		borderTop: `1px solid ${tokens.colorNeutralStroke3}`,
	},
	newButton: {
		width: "100%",
	},
	error: {
		margin: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
	},
});

interface LookupListProps {
	className?: string;
	tables: EntitySummary[];
	tablesLoading: boolean;
	table: string;
	onTableChange: (logicalName: string) => void;
	lookups: PolymorphicLookup[];
	loading: boolean;
	error: Error | null;
	selectedId: string | null;
	creating: boolean;
	onSelect: (columnLogicalName: string) => void;
	onNew: () => void;
}

export const LookupList = ({
	className,
	tables,
	tablesLoading,
	table,
	onTableChange,
	lookups,
	loading,
	error,
	selectedId,
	creating,
	onSelect,
	onNew,
}: LookupListProps) => {
	const styles = useStyles();
	const panel = usePanelStyles();
	const pickerId = useId("polymorphic-table");

	return (
		<aside aria-label="Polymorphic lookups on the chosen table" className={mergeClasses(panel.panel, className)}>
			<div className={styles.picker}>
				<Label htmlFor={pickerId}>Table</Label>
				<TableCombobox
					id={pickerId}
					tables={tables}
					value={table}
					onChange={onTableChange}
					disabled={tablesLoading}
					placeholder={tablesLoading ? "Loading tables..." : "Choose a table"}
				/>
			</div>
			{table === "" ? null : (
				<>
					<div className={styles.listHeader}>
						<Text size={200} weight="semibold">
							Polymorphic lookups
						</Text>
						{loading ? (
							<Spinner size="extra-tiny" aria-label="Loading lookups" />
						) : (
							<Text size={200} className={panel.muted}>
								{lookups.length}
							</Text>
						)}
					</div>
					<ul className={styles.list}>
						{creating ? (
							<li className={styles.draft} aria-current="true">
								<span className={styles.itemText}>
									<Text weight="semibold">New lookup</Text>
									<Text size={200} className={panel.muted}>
										Not created yet
									</Text>
								</span>
								<Badge appearance="outline" color="brand">
									Draft
								</Badge>
							</li>
						) : null}
						{lookups.map((lookup) => {
							const current = !creating && lookup.columnLogicalName === selectedId;
							return (
								<li key={lookup.columnLogicalName}>
									<Button
										appearance="subtle"
										className={mergeClasses(styles.item, current && styles.selected)}
										aria-current={current ? "true" : undefined}
										onClick={() => onSelect(lookup.columnLogicalName)}>
										<span className={styles.itemText}>
											<Text weight={current ? "semibold" : "regular"} className={styles.truncate}>
												{lookup.label ?? lookup.columnLogicalName}
											</Text>
											{lookup.label ? (
												<span className={mergeClasses(styles.itemName, styles.truncate)}>{lookup.columnLogicalName}</span>
											) : null}
										</span>
										<span className={styles.itemCount}>{lookup.targets.length} targets</span>
									</Button>
								</li>
							);
						})}
					</ul>
					{!loading && !error && lookups.length === 0 && !creating ? (
						<Text size={200} className={mergeClasses(styles.none, panel.muted)}>
							None on this table yet.
						</Text>
					) : null}
					{error ? (
						<MessageBar intent="error" className={styles.error}>
							<MessageBarBody>{describeError(error)}</MessageBarBody>
						</MessageBar>
					) : null}
				</>
			)}
			<div className={styles.spacer} />
			<div className={styles.footer}>
				<Button className={styles.newButton} icon={<Add20Regular />} disabled={table === "" || creating} onClick={onNew}>
					New polymorphic lookup
				</Button>
			</div>
		</aside>
	);
};
