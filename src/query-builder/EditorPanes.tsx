import { makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import { PanelLeftExpand20Regular, PanelRightExpand20Regular } from "@fluentui/react-icons";
import { useCallback, useRef } from "react";

import { DetailsPane, QueryEditingProvider } from "./editors";
import { type QueryGateway } from "./hooks";
import { CollapsedPane, STRIP_WIDTH } from "./PaneChrome";
import { QueryTree } from "./QueryTree";
import { Splitter, SPLITTER_THICKNESS } from "./Splitter";
import { useQueryBuilder } from "./store";
import { XmlPane } from "./XmlPane";

export const EDITORS_MIN_HEIGHT = 160;
export const TREE_MIN_WIDTH = 360;
export const DETAILS_MIN_WIDTH = 240;
export const XML_MIN_WIDTH = 280;
export const DEFAULT_TREE_SHARE = "40%";
export const THREE_PANES_MIN_WIDTH = TREE_MIN_WIDTH + DETAILS_MIN_WIDTH + XML_MIN_WIDTH + SPLITTER_THICKNESS * 2;

const NARROW = `@container (max-width: ${THREE_PANES_MIN_WIDTH - 1}px)`;

const TREE_PANE_ID = "query-builder-tree";
const DETAILS_PANE_ID = "query-builder-details";
const XML_PANE_ID = "query-builder-xml";

const useStyles = makeStyles({
	editors: {
		containerType: "inline-size",
		display: "flex",
		flexGrow: 1,
		flexBasis: 0,
		minWidth: 0,
		minHeight: `${EDITORS_MIN_HEIGHT}px`,
	},
	pane: {
		display: "flex",
		flexDirection: "column",
		minWidth: 0,
		minHeight: 0,
		overflow: "hidden",
		backgroundColor: tokens.colorNeutralBackground1,
	},
	tree: {
		flexGrow: 0,
		flexShrink: 1,
		minWidth: `${TREE_MIN_WIDTH}px`,
	},
	grow: {
		flexGrow: 1,
	},
	details: {
		flexGrow: 0,
		flexShrink: 1,
		minWidth: `${DETAILS_MIN_WIDTH}px`,
	},
	xml: {
		flexGrow: 1,
		flexShrink: 1,
		flexBasis: 0,
		minWidth: `${XML_MIN_WIDTH}px`,
	},
	hideWhenNarrow: {
		[NARROW]: {
			display: "none",
		},
	},
	growWhenNarrow: {
		[NARROW]: {
			flexGrow: 1,
		},
	},
	showWhenNarrow: {
		display: "none",
		[NARROW]: {
			display: "flex",
		},
	},
	hidden: {
		display: "none",
	},
});

const widthOf = (id: string): number => globalThis.document.getElementById(id)?.getBoundingClientRect().width ?? 0;

interface EditorPanesProps {
	gateway: QueryGateway;
	hidden: boolean;
}

export const EditorPanes = ({ gateway, hidden }: EditorPanesProps) => {
	const styles = useStyles();
	const layout = useQueryBuilder((state) => state.layout);
	const resizePane = useQueryBuilder((state) => state.resizePane);
	const togglePane = useQueryBuilder((state) => state.togglePane);
	const showDetails = useQueryBuilder((state) => state.showDetails);
	const releaseDetails = useQueryBuilder((state) => state.releaseDetails);
	const containerRef = useRef<HTMLDivElement>(null);
	const { collapsed, detailsForced } = layout;
	const showTree = !collapsed.tree;
	const showDetailsPane = !collapsed.details;
	const showXml = !collapsed.xml;
	const crowded = showTree && showDetailsPane && showXml;
	const detailsYields = crowded && !detailsForced;
	const xmlYields = crowded && detailsForced;

	const openDetails = useCallback(() => {
		const width = containerRef.current?.getBoundingClientRect().width ?? Infinity;
		showDetails(width < THREE_PANES_MIN_WIDTH);
	}, [showDetails]);

	const othersBesideTree = () => {
		const details = widthOf(DETAILS_PANE_ID);
		return (details > 0 ? details + SPLITTER_THICKNESS : 0) + (widthOf(XML_PANE_ID) > 0 ? XML_MIN_WIDTH : STRIP_WIDTH);
	};
	const othersBesideDetails = () => {
		const tree = widthOf(TREE_PANE_ID);
		return (tree > 0 ? tree + SPLITTER_THICKNESS : STRIP_WIDTH) + XML_MIN_WIDTH;
	};

	return (
		<QueryEditingProvider gateway={gateway} openDetails={openDetails}>
			<div ref={containerRef} className={mergeClasses(styles.editors, hidden && styles.hidden)}>
				{showTree ? (
					<section
						id={TREE_PANE_ID}
						aria-label="Tree"
						className={mergeClasses(styles.pane, styles.tree, !showXml && styles.grow, xmlYields && styles.growWhenNarrow)}
						style={{ flexBasis: layout.treeWidth === null ? DEFAULT_TREE_SHARE : `${layout.treeWidth}px` }}>
						<QueryTree onCollapse={() => togglePane("tree")} />
					</section>
				) : (
					<CollapsedPane title="Tree" icon={PanelLeftExpand20Regular} label="Restore the tree" onRestore={() => togglePane("tree")} />
				)}
				{showTree && (showDetailsPane || showXml) ? (
					<Splitter
						orientation="vertical"
						size={layout.treeWidth}
						min={TREE_MIN_WIDTH}
						otherMin={othersBesideTree}
						label="Resize the tree"
						controls={TREE_PANE_ID}
						onResize={(size) => resizePane("tree", size)}
						onToggle={() => togglePane("tree")}
					/>
				) : null}
				{showDetailsPane ? (
					<section
						id={DETAILS_PANE_ID}
						aria-label="Details"
						className={mergeClasses(styles.pane, styles.details, !showXml && !showTree && styles.grow, detailsYields && styles.hideWhenNarrow)}
						style={{ flexBasis: `${layout.detailsWidth}px` }}>
						<DetailsPane onCollapse={() => togglePane("details")} />
					</section>
				) : null}
				{showDetailsPane ? null : <CollapsedPane title="details" icon={PanelLeftExpand20Regular} label="Show the details" onRestore={openDetails} />}
				{detailsYields ? (
					<CollapsedPane
						title="details"
						icon={PanelLeftExpand20Regular}
						label="Show the details"
						className={styles.showWhenNarrow}
						onRestore={openDetails}
					/>
				) : null}
				{showDetailsPane && showXml ? (
					<Splitter
						orientation="vertical"
						size={layout.detailsWidth}
						min={DETAILS_MIN_WIDTH}
						otherMin={othersBesideDetails}
						label="Resize the details"
						className={crowded ? styles.hideWhenNarrow : undefined}
						controls={DETAILS_PANE_ID}
						onResize={(size) => resizePane("details", size)}
						onToggle={() => togglePane("details")}
					/>
				) : null}
				{showXml ? (
					<section id={XML_PANE_ID} aria-label="Fetch XML" className={mergeClasses(styles.pane, styles.xml, xmlYields && styles.hideWhenNarrow)}>
						<XmlPane onCollapse={() => togglePane("xml")} />
					</section>
				) : (
					<CollapsedPane title="Fetch XML" icon={PanelRightExpand20Regular} label="Restore the Fetch XML" onRestore={() => togglePane("xml")} />
				)}
				{xmlYields ? (
					<CollapsedPane
						title="Fetch XML"
						icon={PanelRightExpand20Regular}
						label="Restore the Fetch XML"
						className={styles.showWhenNarrow}
						onRestore={releaseDetails}
					/>
				) : null}
			</div>
		</QueryEditingProvider>
	);
};
