import { Button, makeStyles, mergeClasses, Text, tokens } from "@fluentui/react-components";
import { ChevronDown16Regular, ChevronRight16Regular, PanelRightContract20Regular } from "@fluentui/react-icons";
import { type ReactNode, useState } from "react";

import { type Diagnostic, elementDefinition, isKnownElement, type NodePath, nodeAtPath, type XmlElement } from "@/shared/lib/fetchxml";

import {
	type CollapsibleGroup,
	type DetailsGroupView,
	detailsGroups,
	entryProblems,
	groupHeading,
	groupHasProblem,
	groupIsOpen,
	pathKey,
	type PlacedEntry,
	problemsOfRow,
	rowSummary,
	summaryText,
} from "../lib";
import { PaneButton } from "../PaneChrome";
import { ProblemList } from "../ProblemIcon";
import { useQueryDiagnostics } from "../QueryDiagnostics";
import { useQueryBuilder } from "../store";
import { AttributeControl, DetailsField, RelationshipField, WrittenValue } from "./AttributeField";
import { InPane, useQueryEditing } from "./EditingContext";

const useStyles = makeStyles({
	pane: {
		display: "flex",
		flexDirection: "column",
		flexGrow: 1,
		minHeight: 0,
		minWidth: 0,
		backgroundColor: tokens.colorNeutralBackground2,
	},
	header: {
		display: "flex",
		alignItems: "flex-start",
		flexShrink: 0,
		columnGap: tokens.spacingHorizontalS,
		minHeight: "32px",
		padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalXS} ${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`,
		borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
		backgroundColor: tokens.colorNeutralBackground1,
	},
	title: {
		display: "flex",
		flexDirection: "column",
		flexGrow: 1,
		minWidth: 0,
		paddingTop: "4px",
	},
	element: {
		fontFamily: tokens.fontFamilyMonospace,
		fontWeight: tokens.fontWeightSemibold,
	},
	summary: {
		color: tokens.colorNeutralForeground3,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
	body: {
		display: "flex",
		flexDirection: "column",
		flexGrow: 1,
		minHeight: 0,
		overflowY: "auto",
		rowGap: tokens.spacingVerticalM,
		padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalM}`,
	},
	stale: {
		opacity: 0.5,
		filter: "grayscale(1)",
	},
	hint: {
		color: tokens.colorNeutralForeground3,
	},
	problems: {
		padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
		borderRadius: tokens.borderRadiusMedium,
		backgroundColor: tokens.colorNeutralBackground1,
		border: `1px solid ${tokens.colorNeutralStroke2}`,
	},
	note: {
		padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
		borderRadius: tokens.borderRadiusMedium,
		backgroundColor: tokens.colorNeutralBackground3,
		color: tokens.colorNeutralForeground2,
	},
	group: {
		display: "flex",
		flexDirection: "column",
		flexShrink: 0,
		rowGap: tokens.spacingVerticalM,
		paddingTop: tokens.spacingVerticalS,
		borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
	},
	groupToggle: {
		justifyContent: "flex-start",
		alignSelf: "stretch",
		minWidth: 0,
		paddingLeft: 0,
		fontWeight: tokens.fontWeightSemibold,
	},
});

const insideExcluded = (path: NodePath, find: (path: NodePath) => boolean): boolean => path.some((_, length) => length > 0 && find(path.slice(0, length)));

interface ClosedGroups {
	readonly rowKey: string;
	readonly groups: readonly CollapsibleGroup[];
}

interface GroupSectionProps {
	view: DetailsGroupView & { group: CollapsibleGroup };
	open: boolean;
	onToggle: () => void;
	children: ReactNode;
}

const GroupSection = ({ view, open, onToggle, children }: GroupSectionProps) => {
	const styles = useStyles();
	return (
		<section className={styles.group}>
			<Button
				appearance="transparent"
				size="small"
				className={styles.groupToggle}
				icon={open ? <ChevronDown16Regular /> : <ChevronRight16Regular />}
				aria-expanded={open}
				onClick={onToggle}>
				{groupHeading(view.group, view.setCount)}
			</Button>
			{open ? children : null}
		</section>
	);
};

interface EntryFieldProps {
	placed: PlacedEntry;
	problems: readonly Diagnostic[];
	editor: Omit<Parameters<typeof AttributeControl>[0], "entry">;
}

const EntryField = ({ placed, problems, editor }: EntryFieldProps) => {
	const { entry } = placed;
	if (entry.kind === "unknown") {
		return (
			<DetailsField name={entry.name} hint="Not in the Fetch XML reference. It stays as written." problems={problems}>
				<WrittenValue value={entry.value} />
			</DetailsField>
		);
	}
	return (
		<DetailsField name={entry.name} hint={entry.definition.description} optional={placed.optional} problems={problems}>
			<AttributeControl {...editor} entry={entry} />
		</DetailsField>
	);
};

const isCollapsible = (view: DetailsGroupView): view is DetailsGroupView & { group: CollapsibleGroup } => view.group !== "main";

interface DetailsPaneProps {
	onCollapse: () => void;
}

export const DetailsPane = ({ onCollapse }: DetailsPaneProps) => {
	const styles = useStyles();
	const query = useQueryBuilder((state) => state.query);
	const broken = useQueryBuilder((state) => state.errors.length > 0);
	const selectedPath = useQueryBuilder((state) => state.selectedPath);
	const lead = useQueryBuilder((state) => state.namesLead);
	const edit = useQueryBuilder((state) => state.edit);
	const preferred = useQueryBuilder((state) => state.layout.detailsGroups);
	const setGroupOpen = useQueryBuilder((state) => state.setDetailsGroupOpen);
	const { metadata } = useQueryEditing();
	const { diagnostics, rows } = useQueryDiagnostics();
	const [closed, setClosed] = useState<ClosedGroups>({ rowKey: "", groups: [] });
	const node = query && selectedPath ? nodeAtPath(query, selectedPath) : undefined;
	const path = selectedPath ?? [];
	const rowKey = selectedPath === null ? "" : pathKey(selectedPath);
	const closedHere = closed.rowKey === rowKey ? closed.groups : [];
	const summary = query && node ? summaryText(rowSummary(query, path, metadata, lead)) : "";
	const parentExcluded =
		query !== null &&
		insideExcluded(path, (each) => {
			const ancestor = nodeAtPath(query, each);
			return ancestor?.kind === "element" && ancestor.excluded;
		});

	const toggleGroup = (group: CollapsibleGroup, open: boolean) => {
		setGroupOpen(group, !open);
		setClosed({ rowKey, groups: open ? [...closedHere, group] : closedHere.filter((each) => each !== group) });
	};

	const elementBody = (element: XmlElement) => {
		if (!query) {
			return null;
		}
		const views = detailsGroups(query, path, element, metadata);
		const editor = { document: query, path, element, edit };
		const listed = new Set(views.flatMap((view) => view.entries.flatMap((placed) => placed.covers)));
		const rowLevel = problemsOfRow(rows, path).filter(
			(problem) => problem.attribute === undefined || !listed.has(problem.attribute) || problem.path.length !== path.length
		);
		const fields = (view: DetailsGroupView) =>
			view.entries.map((placed) => (
				<EntryField key={placed.entry.name} placed={placed} problems={entryProblems(diagnostics, path, placed)} editor={editor} />
			));
		const main = views.find((view) => view.group === "main");
		const hasAttributes = views.some((view) => view.entries.length > 0);
		return (
			<InPane>
				{element.excluded || parentExcluded ? (
					<Text size={200} className={styles.note}>
						{element.excluded
							? "Excluded. The Fetch XML holds this row as a comment."
							: "Inside an Excluded row. The Fetch XML holds this row as a comment."}
					</Text>
				) : null}
				{rowLevel.length > 0 ? <ProblemList diagnostics={rowLevel} className={styles.problems} /> : null}
				{isKnownElement(element.name) ? null : (
					<Text className={styles.hint}>This element is not in the Fetch XML reference. Edit it in the Fetch XML.</Text>
				)}
				{element.name === "link-entity" ? <RelationshipField {...editor} /> : null}
				{main ? fields(main) : null}
				{views.filter(isCollapsible).map((view) => {
					const open = groupIsOpen(preferred[view.group], groupHasProblem(diagnostics, path, view), closedHere.includes(view.group));
					return (
						<GroupSection key={view.group} view={view} open={open} onToggle={() => toggleGroup(view.group, open)}>
							{fields(view)}
						</GroupSection>
					);
				})}
				{!hasAttributes && isKnownElement(element.name) ? (
					<Text className={styles.hint}>{elementDefinition(element.name)?.description} It has no attributes.</Text>
				) : null}
			</InPane>
		);
	};

	const body = () => {
		if (!query || !node) {
			return <Text className={styles.hint}>Select a row to see its attributes.</Text>;
		}
		if (node.kind !== "element") {
			return <Text className={styles.hint}>This row is a comment. Edit it in the Fetch XML.</Text>;
		}
		return elementBody(node);
	};

	return (
		<div className={styles.pane}>
			<div className={styles.header}>
				<div className={styles.title}>
					<Text className={styles.element}>{node?.kind === "element" ? `<${node.name}>` : node ? "<!-- -->" : "details"}</Text>
					{summary !== "" ? (
						<Text size={200} className={styles.summary} title={summary}>
							{summary}
						</Text>
					) : null}
				</div>
				<PaneButton icon={PanelRightContract20Regular} label="Collapse the details" onClick={onCollapse} />
			</div>
			<div className={mergeClasses(styles.body, broken && styles.stale)} inert={broken} aria-disabled={broken || undefined}>
				{body()}
			</div>
		</div>
	);
};
