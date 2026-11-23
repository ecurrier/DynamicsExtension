import { makeStyles, mergeClasses, Text, tokens } from "@fluentui/react-components";
import { PanelRightContract20Regular } from "@fluentui/react-icons";

import { elementDefinition, isKnownElement, type NodePath, nodeAtPath } from "@/shared/lib/fetchxml";

import { attributeProblems, detailsEntries, problemsOfRow, rowSummary, summaryText } from "../lib";
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
});

const insideSwitchedOff = (path: NodePath, find: (path: NodePath) => boolean): boolean => path.some((_, length) => length > 0 && find(path.slice(0, length)));

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
	const { metadata } = useQueryEditing();
	const { diagnostics, rows } = useQueryDiagnostics();
	const node = query && selectedPath ? nodeAtPath(query, selectedPath) : undefined;
	const path = selectedPath ?? [];
	const summary = query && node ? summaryText(rowSummary(query, path, metadata, lead)) : "";
	const parentOff =
		query !== null &&
		insideSwitchedOff(path, (each) => {
			const ancestor = nodeAtPath(query, each);
			return ancestor?.kind === "element" && ancestor.switchedOff;
		});

	const body = () => {
		if (!query || !node) {
			return <Text className={styles.hint}>Select a row in the tree to see all of its attributes.</Text>;
		}
		if (node.kind !== "element") {
			return <Text className={styles.hint}>A comment, kept as written. Edit it in the Fetch XML.</Text>;
		}
		const entries = detailsEntries(node);
		const props = { document: query, path, element: node, edit };
		const listed = new Set(entries.map((entry) => entry.name));
		const rowLevel = problemsOfRow(rows, path).filter(
			(problem) => problem.attribute === undefined || !listed.has(problem.attribute) || problem.path.length !== path.length
		);
		return (
			<InPane>
				{node.switchedOff || parentOff ? (
					<Text size={200} className={styles.note}>
						{node.switchedOff
							? "Switched off: written into the Fetch XML as a comment."
							: "Inside a switched-off row: written into the Fetch XML as a comment."}
					</Text>
				) : null}
				{rowLevel.length > 0 ? <ProblemList diagnostics={rowLevel} className={styles.problems} /> : null}
				{isKnownElement(node.name) ? null : <Text className={styles.hint}>Not recognised by the Fetch XML reference; edit it in the Fetch XML.</Text>}
				{node.name === "link-entity" ? <RelationshipField {...props} /> : null}
				{entries.map((entry) =>
					entry.kind === "known" ? (
						<DetailsField
							key={entry.name}
							name={entry.name}
							hint={entry.definition.description}
							problems={attributeProblems(diagnostics, path, entry.name)}>
							<AttributeControl {...props} entry={entry} />
						</DetailsField>
					) : (
						<DetailsField key={entry.name} name={entry.name} hint="left as written" problems={attributeProblems(diagnostics, path, entry.name)}>
							<WrittenValue value={entry.value} />
						</DetailsField>
					)
				)}
				{entries.length === 0 && isKnownElement(node.name) ? (
					<Text className={styles.hint}>{elementDefinition(node.name)?.description} It has no attributes.</Text>
				) : null}
			</InPane>
		);
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
