import {
	Badge,
	Button,
	Checkbox,
	makeStyles,
	Menu,
	MenuItem,
	MenuList,
	MenuPopover,
	MenuTrigger,
	mergeClasses,
	tokens,
	Tooltip,
	Tree,
	TreeItem,
	TreeItemLayout,
	treeItemLayoutClassNames,
} from "@fluentui/react-components";
import {
	Add16Regular,
	ArrowDown16Regular,
	ArrowSort20Regular,
	ArrowUp16Regular,
	BranchFork20Regular,
	Code20Regular,
	Comment20Regular,
	Database20Regular,
	Delete16Regular,
	Filter20Regular,
	PanelRight16Regular,
	Grid20Regular,
	Table20Regular,
	TableLink20Regular,
	TextColumnOne20Regular,
} from "@fluentui/react-icons";
import { type KeyboardEvent, type MouseEvent, type ReactElement, useState } from "react";

import { elementDefinition, type NodePath } from "@/shared/lib/fetchxml";

import { useQueryEditing } from "./editors";
import { problemBeneathRow, problemsOfRow, type RowKind, samePath, summaryText, type TreeRow } from "./lib";
import { RowProblemIcon } from "./ProblemIcon";
import { useQueryDiagnostics } from "./QueryDiagnostics";
import { RowContent } from "./RowContent";
import { useQueryBuilder } from "./store";

export const SWITCH_GUTTER_WIDTH = 32;

const GUTTER_ATTRIBUTE = "data-switch-gutter";

export const treeValue = (key: string): string => `row:${key}`;

export const KIND_ICONS: Record<RowKind, ReactElement> = {
	fetch: <Database20Regular />,
	entity: <Table20Regular />,
	attribute: <TextColumnOne20Regular />,
	"all-attributes": <Grid20Regular />,
	order: <ArrowSort20Regular />,
	filter: <Filter20Regular />,
	condition: <BranchFork20Regular />,
	"link-entity": <TableLink20Regular />,
	comment: <Comment20Regular />,
	unknown: <Code20Regular />,
};

const iconFor = (kind: string): ReactElement => KIND_ICONS[kind as RowKind] ?? KIND_ICONS.unknown;

const useStyles = makeStyles({
	layout: {
		position: "relative",
		minHeight: "32px",
		borderRadius: tokens.borderRadiusMedium,
	},
	branch: {
		paddingLeft: `calc(${SWITCH_GUTTER_WIDTH}px + (var(--fluent-TreeItem--level, 1) - 1) * ${tokens.spacingHorizontalXXL})`,
	},
	leaf: {
		paddingLeft: `calc(${SWITCH_GUTTER_WIDTH}px + var(--fluent-TreeItem--level, 1) * ${tokens.spacingHorizontalXXL})`,
	},
	selected: {
		backgroundColor: tokens.colorNeutralBackground1Selected,
		":hover": {
			backgroundColor: tokens.colorNeutralBackground1Selected,
		},
	},
	main: {
		display: "flex",
		alignItems: "center",
		columnGap: tokens.spacingHorizontalXS,
		whiteSpace: "nowrap",
		paddingRight: tokens.spacingHorizontalM,
	},
	gutter: {
		position: "absolute",
		left: 0,
		top: 0,
		bottom: 0,
		width: `${SWITCH_GUTTER_WIDTH}px`,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
		backgroundColor: tokens.colorNeutralBackground2,
	},
	selectedGutter: {
		boxShadow: `inset 3px 0 0 ${tokens.colorBrandStroke1}`,
	},
	checkbox: {
		"& .fui-Checkbox__indicator": {
			margin: 0,
		},
	},
	content: {
		display: "inline-flex",
		alignItems: "center",
		columnGap: tokens.spacingHorizontalXS,
	},
	dim: {
		opacity: 0.45,
	},
	actions: {
		alignItems: "center",
		columnGap: "2px",
	},
	struck: {
		textDecorationLine: "line-through",
	},
});

export interface TreeActions {
	add: (path: NodePath, kind: string) => void;
	remove: (path: NodePath) => void;
	move: (path: NodePath, direction: -1 | 1) => void;
	toggle: (path: NodePath, fromRow: boolean) => void;
}

interface ActionButtonProps {
	label: string;
	icon: ReactElement;
	disabled?: boolean;
	onClick: () => void;
}

const ActionButton = ({ label, icon, disabled = false, onClick }: ActionButtonProps) => (
	<Tooltip content={label} relationship="label">
		<Button size="small" appearance="subtle" icon={icon} disabled={disabled} onClick={onClick} />
	</Tooltip>
);

interface SwitchCellProps {
	row: TreeRow;
	label: string;
	selected: boolean;
	onToggle: () => void;
}

const SwitchCell = ({ row, label, selected, onToggle }: SwitchCellProps) => {
	const styles = useStyles();
	const reason = row.switch.disabledReason;
	const checkbox = (
		<Checkbox
			className={styles.checkbox}
			checked={row.switch.on}
			disabled={reason !== null}
			aria-label={row.switch.on ? `Switch off ${label}` : `Switch on ${label}`}
			onChange={onToggle}
		/>
	);
	return (
		<span {...{ [GUTTER_ATTRIBUTE]: "" }} className={mergeClasses(styles.gutter, selected && styles.selectedGutter)}>
			<Tooltip content={reason ?? (row.switch.on ? "Switch off (Ctrl+/)" : "Switch on (Ctrl+/)")} relationship="description" positioning="after">
				{reason === null ? checkbox : <span>{checkbox}</span>}
			</Tooltip>
		</span>
	);
};

const isFromGutter = (target: EventTarget): boolean => target instanceof Element && target.closest(`[${GUTTER_ATTRIBUTE}]`) !== null;

const ownsFocus = (target: EventTarget, item: HTMLElement): boolean =>
	target === item ||
	(target instanceof Element &&
		target.closest("[data-tree-key]") === item &&
		target.closest(`[${GUTTER_ATTRIBUTE}], .${treeItemLayoutClassNames.actions}`) === null);

interface QueryTreeRowProps {
	row: TreeRow;
	actions: TreeActions;
}

export const QueryTreeRow = ({ row, actions }: QueryTreeRowProps) => {
	const styles = useStyles();
	const selected = useQueryBuilder((state) => samePath(state.selectedPath, row.path));
	const select = useQueryBuilder((state) => state.select);
	const { openDetails } = useQueryEditing();
	const collapsed = useQueryBuilder((state) => state.collapsed.has(row.key));
	const { rows: problems } = useQueryDiagnostics();
	const [hovered, setHovered] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const label = summaryText(row.summary);
	const branch = row.children.length > 0;
	const canToggle = row.switch.disabledReason === null;

	const onClick = (event: MouseEvent<HTMLDivElement>) => {
		if (!isFromGutter(event.target)) {
			select(row.path);
		}
	};

	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.target !== event.currentTarget) {
			return;
		}
		if (event.key === "Delete" && !event.altKey && !event.ctrlKey && !event.metaKey) {
			event.preventDefault();
			if (!row.fixed) {
				actions.remove(row.path);
			}
			return;
		}
		if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
			event.preventDefault();
			const direction = event.key === "ArrowUp" ? -1 : 1;
			if (direction === -1 ? row.canMoveUp : row.canMoveDown) {
				actions.move(row.path, direction);
			}
			return;
		}
		if ((event.ctrlKey || event.metaKey) && event.key === "/") {
			event.preventDefault();
			if (canToggle) {
				actions.toggle(row.path, true);
			}
		}
	};

	const rowActions = (
		<>
			{row.addKinds.length > 0 ? (
				<Menu open={menuOpen} onOpenChange={(_, data) => setMenuOpen(data.open)}>
					<MenuTrigger disableButtonEnhancement>
						<Button size="small" appearance="subtle" icon={<Add16Regular />}>
							Add
						</Button>
					</MenuTrigger>
					<MenuPopover>
						<MenuList>
							{row.addKinds.map((kind) => {
								return (
									<MenuItem
										key={kind}
										icon={iconFor(kind)}
										subText={elementDefinition(kind)?.description}
										onClick={() => actions.add(row.path, kind)}>
										{kind}
									</MenuItem>
								);
							})}
						</MenuList>
					</MenuPopover>
				</Menu>
			) : null}
			<ActionButton
				label="Details"
				icon={<PanelRight16Regular />}
				onClick={() => {
					select(row.path);
					openDetails();
				}}
			/>
			{row.fixed ? null : (
				<>
					<ActionButton label="Move up (Alt+Up)" icon={<ArrowUp16Regular />} disabled={!row.canMoveUp} onClick={() => actions.move(row.path, -1)} />
					<ActionButton
						label="Move down (Alt+Down)"
						icon={<ArrowDown16Regular />}
						disabled={!row.canMoveDown}
						onClick={() => actions.move(row.path, 1)}
					/>
					<ActionButton label="Delete (Delete)" icon={<Delete16Regular />} onClick={() => actions.remove(row.path)} />
				</>
			)}
		</>
	);

	return (
		<TreeItem
			itemType={branch ? "branch" : "leaf"}
			value={treeValue(row.key)}
			aria-selected={selected}
			aria-label={row.switchedOff ? `${label}, switched off` : label}
			data-tree-key={row.key}
			onClick={onClick}
			onFocus={(event) => {
				if (ownsFocus(event.target, event.currentTarget)) {
					select(row.path);
				}
			}}
			onKeyDown={onKeyDown}>
			<TreeItemLayout
				className={mergeClasses(styles.layout, branch ? styles.branch : styles.leaf, selected && styles.selected)}
				iconBefore={{ children: iconFor(row.kind), title: row.tag ?? "comment", className: mergeClasses(row.inactive && styles.dim) }}
				main={{ className: styles.main }}
				actions={{
					visible: selected || hovered || menuOpen,
					onVisibilityChange: (_, data) => setHovered(data.visible),
					className: styles.actions,
					children: rowActions,
				}}>
				<SwitchCell row={row} label={label} selected={selected} onToggle={() => actions.toggle(row.path, false)} />
				<span className={mergeClasses(styles.content, row.inactive && styles.dim)}>
					{row.precedence === null ? null : (
						<Tooltip content={`Sorts ${row.precedence === 1 ? "first" : `after order ${row.precedence - 1}`}`} relationship="description">
							<Badge size="small" shape="circular" appearance="tint">
								{row.precedence}
							</Badge>
						</Tooltip>
					)}
					<RowContent row={row} />
					<RowProblemIcon
						diagnostics={problemsOfRow(problems, row.path)}
						beneath={branch && collapsed ? problemBeneathRow(problems, row.path) : null}
					/>
					{row.kind === "unknown" ? (
						<Badge size="small" appearance="outline" color="informative">
							edit in XML
						</Badge>
					) : null}
				</span>
				{row.switchedOff ? (
					<Badge size="small" appearance="outline" color="subtle" className={styles.struck}>
						off
					</Badge>
				) : null}
			</TreeItemLayout>
			{branch ? (
				<Tree>
					{row.children.map((child) => (
						<QueryTreeRow key={child.key} row={child} actions={actions} />
					))}
				</Tree>
			) : null}
		</TreeItem>
	);
};
