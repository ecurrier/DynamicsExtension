import {
	Button,
	comboboxClassNames,
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
	type TreeProps,
} from "@fluentui/react-components";
import { Broom20Regular, CheckboxChecked20Regular, CheckboxUnchecked20Regular, Delete20Regular, PanelLeftContract20Regular } from "@fluentui/react-icons";
import { type KeyboardEvent, useEffect, useMemo, useRef } from "react";

import { countExcluded, type FetchXmlDocument, type NodePath, type QueryMetadata, tablesNamedIn, tidy } from "@/shared/lib/fetchxml";

import { BlankStart } from "./editors";
import { useQueryGateway, useQueryTables } from "./hooks";
import {
	addChild,
	ALREADY_TIDY,
	branchKeys,
	buildTreeRows,
	type ChangeResult,
	deleteExcludedRows,
	includeAllRows,
	moveRow,
	pathKey,
	removeRow,
	tidyQuery,
	toggleRow,
} from "./lib";
import { PaneHeader } from "./PaneChrome";
import { ParseErrorBanner } from "./ParseErrorBanner";
import { type TreeActions, QueryTreeRow, treeValue } from "./QueryTreeRow";
import { useQueryBuilder } from "./store";

const CONTROL_SELECTOR = `input, textarea, select, button, label, a, [role='button'], [role='combobox'], [role='listbox'], [role='option'], [role='switch'], [role='checkbox'], [role='menuitem'], [contenteditable='true'], .${comboboxClassNames.root}`;

const EDITABLE_SELECTOR = "input:not([type='checkbox']):not([type='radio']), textarea, select, [contenteditable='true'], [role='combobox'], [role='textbox']";

const useStyles = makeStyles({
	pane: {
		display: "flex",
		flexDirection: "column",
		flexGrow: 1,
		minHeight: 0,
		minWidth: 0,
	},
	body: {
		position: "relative",
		flexGrow: 1,
		minHeight: 0,
		overflow: "auto",
	},
	inner: {
		minWidth: "max-content",
		paddingTop: tokens.spacingVerticalXS,
		paddingBottom: tokens.spacingVerticalS,
		paddingRight: tokens.spacingHorizontalS,
	},
	stale: {
		opacity: 0.5,
		filter: "grayscale(1)",
	},
});

const isFromControl = (target: EventTarget, item: HTMLElement): boolean => {
	if (!(target instanceof Element)) {
		return false;
	}
	if (!item.contains(target)) {
		return true;
	}
	return target.closest(CONTROL_SELECTOR) !== null;
};

const isEditable = (target: EventTarget): boolean => target instanceof Element && target.closest(EDITABLE_SELECTOR) !== null;

const pathOfValue = (value: unknown): NodePath => {
	const key = String(value).replace(/^row:/, "");
	return key === "" ? [] : key.split(".").map(Number);
};

type RowFocus = "keep" | "follow" | "take";

interface QueryActions {
	tidy: () => void;
	includeAll: () => void;
	deleteExcluded: () => void;
}

const useTreeActions = (metadata: QueryMetadata, onEdited: (focus: RowFocus) => void): TreeActions & QueryActions => {
	const edit = useQueryBuilder((state) => state.edit);
	const perform = (build: (query: FetchXmlDocument) => ChangeResult, focus: RowFocus) => {
		if (edit(build).ok) {
			onEdited(focus);
		}
	};
	return {
		add: (path, kind) => perform((query) => addChild(query, path, kind, metadata), "take"),
		remove: (path) => perform((query) => removeRow(query, path), "follow"),
		move: (path, direction) => perform((query) => moveRow(query, path, direction), "follow"),
		toggle: (path, fromRow) => perform((query) => toggleRow(query, path), fromRow ? "follow" : "keep"),
		tidy: () => perform(tidyQuery, "keep"),
		includeAll: () => perform(includeAllRows, "keep"),
		deleteExcluded: () => perform(deleteExcludedRows, "keep"),
	};
};

interface QueryTreeProps {
	onCollapse: () => void;
}

export const QueryTree = ({ onCollapse }: QueryTreeProps) => {
	const styles = useStyles();
	const connection = useQueryBuilder((state) => state.connection);
	const query = useQueryBuilder((state) => state.query);
	const broken = useQueryBuilder((state) => state.errors.length > 0);
	const selectedPath = useQueryBuilder((state) => state.selectedPath);
	const collapsed = useQueryBuilder((state) => state.collapsed);
	const namesLead = useQueryBuilder((state) => state.namesLead);
	const setExpanded = useQueryBuilder((state) => state.setExpanded);
	const undo = useQueryBuilder((state) => state.undo);
	const redo = useQueryBuilder((state) => state.redo);
	const gateway = useQueryGateway(connection);
	const tableNames = useMemo(() => (query ? tablesNamedIn(query) : []), [query]);
	const { metadata } = useQueryTables(gateway, tableNames);
	const rows = useMemo(() => (query ? buildTreeRows(query, metadata, namesLead) : null), [query, metadata, namesLead]);
	const tidyNeeded = useMemo(() => query !== null && tidy(query) !== query, [query]);
	const excludedCount = useMemo(() => (query ? countExcluded(query) : 0), [query]);
	const containerRef = useRef<HTMLDivElement>(null);
	const focusPending = useRef(false);
	const focusInside = () => {
		const active = globalThis.document.activeElement;
		return containerRef.current !== null && active !== null && containerRef.current.contains(active);
	};
	const actions = useTreeActions(metadata, (focus) => {
		focusPending.current = focus === "take" || (focus === "follow" && focusInside());
	});

	useEffect(() => {
		if (!focusPending.current || selectedPath === null) {
			return;
		}
		focusPending.current = false;
		const target = containerRef.current?.querySelector<HTMLElement>(`[data-tree-key="${pathKey(selectedPath)}"]`);
		target?.focus();
	}, [selectedPath, query]);

	const openItems = useMemo(
		() =>
			rows
				? branchKeys(rows)
						.filter((key) => !collapsed.has(key))
						.map(treeValue)
				: [],
		[rows, collapsed]
	);

	const onOpenChange: TreeProps["onOpenChange"] = (event, data) => {
		if (data.type === "Click" && event.target !== data.target) {
			return;
		}
		setExpanded(pathOfValue(data.value), data.open);
	};

	const onNavigation: TreeProps["onNavigation"] = (event, data) => {
		if (data.type === "Click" && isFromControl(event.target, data.target)) {
			event.preventDefault();
		}
	};

	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (broken || isEditable(event.target) || !(event.ctrlKey || event.metaKey) || event.altKey) {
			return;
		}
		const key = event.key.toLowerCase();
		const travel = key === "z" && !event.shiftKey ? undo : key === "y" || (key === "z" && event.shiftKey) ? redo : null;
		if (travel) {
			event.preventDefault();
			focusPending.current = focusInside();
			travel();
		}
	};

	return (
		<div ref={containerRef} className={styles.pane} onKeyDown={onKeyDown}>
			<PaneHeader
				title="Tree"
				toggleIcon={PanelLeftContract20Regular}
				toggleLabel="Collapse the tree"
				onToggle={onCollapse}
				actions={
					<>
						{excludedCount > 0 ? (
							<Menu>
								<MenuTrigger disableButtonEnhancement>
									<Button size="small" appearance="subtle" icon={<CheckboxUnchecked20Regular />} disabledFocusable={broken}>
										{`${excludedCount} excluded`}
									</Button>
								</MenuTrigger>
								<MenuPopover>
									<MenuList>
										<MenuItem icon={<CheckboxChecked20Regular />} onClick={actions.includeAll}>
											Include all
										</MenuItem>
										<MenuItem icon={<Delete20Regular />} onClick={actions.deleteExcluded}>
											Delete excluded
										</MenuItem>
									</MenuList>
								</MenuPopover>
							</Menu>
						) : null}
						<Tooltip
							content={broken ? "Correct the Fetch XML first" : tidyNeeded ? "Puts the rows in the standard order" : ALREADY_TIDY}
							relationship="description">
							<Button size="small" appearance="subtle" icon={<Broom20Regular />} disabledFocusable={broken || !tidyNeeded} onClick={actions.tidy}>
								Tidy
							</Button>
						</Tooltip>
					</>
				}
			/>
			<ParseErrorBanner />
			<div className={styles.body}>
				{rows ? (
					<div className={mergeClasses(styles.inner, broken && styles.stale)} inert={broken} aria-disabled={broken || undefined}>
						<Tree aria-label="Query" size="medium" openItems={openItems} onOpenChange={onOpenChange} onNavigation={onNavigation}>
							<QueryTreeRow row={rows} actions={actions} />
						</Tree>
					</div>
				) : (
					<BlankStart />
				)}
			</div>
		</div>
	);
};
