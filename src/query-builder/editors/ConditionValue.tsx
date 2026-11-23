import { Button, makeStyles, Tooltip, tokens } from "@fluentui/react-components";
import { ArrowSwap16Regular } from "@fluentui/react-icons";
import { useMemo } from "react";

import { RecordLookup } from "@/shared/components";
import { type FetchXmlDocument, type NodePath, type XmlElement } from "@/shared/lib/fetchxml";
import { type LookupSelection, type LookupTarget, type QueryColumn } from "@/shared/types";

import {
	type ChangeResult,
	choiceOptions,
	choiceValue,
	conditionLookup,
	conditionValues,
	defaultValueOf,
	isDateInputValue,
	parseListValues,
	presentValue,
	setConditionLookup,
	setConditionValueOf,
	setConditionValues,
	type TableScope,
	type ValueEditor,
	valueEditorFor,
	valueOfOptions,
	yesNoOptions,
} from "../lib";
import { useQueryBuilder } from "../store";
import { MultiPicker, Word } from "./Controls";
import { DraftInput } from "./DraftInput";
import { useInPane, useQueryEditing } from "./EditingContext";
import { OptionPicker } from "./Pickers";
import { SearchPicker } from "./SearchPicker";

const useStyles = makeStyles({
	group: {
		display: "inline-flex",
		alignItems: "center",
		columnGap: tokens.spacingHorizontalXS,
		flexShrink: 0,
	},
	paneGroup: {
		display: "flex",
		flexDirection: "column",
		rowGap: tokens.spacingVerticalXS,
		width: "100%",
	},
	lookup: {
		flexShrink: 0,
	},
	full: {
		width: "100%",
	},
});

interface ConditionValueProps {
	document: FetchXmlDocument;
	path: NodePath;
	element: XmlElement;
	scope: TableScope;
	column: QueryColumn | undefined;
	edit: (build: (query: FetchXmlDocument) => ChangeResult) => void;
}

const lookupTargets = (column: QueryColumn | undefined, scope: TableScope): LookupTarget[] => {
	if (column && column.targets.length > 0) {
		return column.targets.map((target) => ({ logicalName: target.logicalName, navigationProperty: target.navigationProperty }));
	}
	return scope.state === "loaded" ? [{ logicalName: scope.table.logicalName, navigationProperty: "" }] : [];
};

interface SingleValueProps {
	label: string;
	editor: ValueEditor;
	column: QueryColumn | undefined;
	value: string;
	onCommit: (value: string) => void;
}

const SingleValue = ({ label, editor, column, value, onCommit }: SingleValueProps) => {
	const options = useMemo(
		() => (editor.kind === "choice" ? choiceOptions(column) : editor.kind === "yesNo" ? yesNoOptions(column) : []),
		[editor.kind, column]
	);
	switch (editor.kind) {
		case "choice":
		case "yesNo":
			return (
				<SearchPicker
					label={label}
					kind="value"
					value={value === "" ? null : choiceValue(value, editor.kind)}
					text={value}
					options={options}
					onPick={onCommit}
				/>
			);
		case "date":
			return isDateInputValue(value) ? (
				<DraftInput label={label} kind="date" type="date" value={value.trim()} onCommit={onCommit} />
			) : (
				<DraftInput label={label} kind="value" value={value} placeholder="yyyy-mm-dd" onCommit={onCommit} />
			);
		case "number":
			return <DraftInput label={label} kind="number" type="number" value={value} placeholder="0" onCommit={onCommit} />;
		case "integer":
			return <DraftInput label={label} kind="number" type="number" value={value} placeholder="N" onCommit={onCommit} />;
		default:
			return <DraftInput label={label} kind="value" value={value} placeholder="value" onCommit={onCommit} />;
	}
};

export const ConditionValue = ({ document, path, element, scope, column, edit }: ConditionValueProps) => {
	const styles = useStyles();
	const inPane = useInPane();
	const { metadata, lookup } = useQueryEditing();
	const lead = useQueryBuilder((state) => state.namesLead);
	const operator = presentValue(element, "operator");
	const editor = valueEditorFor(column, operator);
	const values = conditionValues(element);
	const valueOf = presentValue(element, "valueof");
	const valueOfChoices = useMemo(
		() => (valueOf === undefined ? [] : valueOfOptions(document, path, metadata, lead)),
		[valueOf, document, path, metadata, lead]
	);
	const group = inPane ? styles.paneGroup : styles.group;

	if (editor.count === "none") {
		return null;
	}

	const write = (next: readonly string[]) => edit((query) => setConditionValues(query, path, next, editor));

	const valueOfSwitch =
		editor.count === "one" ? (
			<Tooltip content={valueOf === undefined ? "Compare with another Column (valueof)" : "Compare with a fixed value"} relationship="label">
				<Button
					size="small"
					appearance={valueOf === undefined ? "subtle" : "primary"}
					aria-pressed={valueOf !== undefined}
					icon={<ArrowSwap16Regular />}
					onClick={() =>
						edit((query) => setConditionValueOf(query, path, valueOf === undefined ? defaultValueOf(query, path, metadata, column) : null))
					}
				/>
			</Tooltip>
		) : null;

	if (valueOf !== undefined) {
		return (
			<span className={group}>
				<Word>valueof</Word>
				<OptionPicker
					label="valueof"
					kind="value"
					value={valueOf}
					options={valueOfChoices}
					onChange={(reference) => edit((query) => setConditionValueOf(query, path, reference ?? ""))}
				/>
				{valueOfSwitch}
			</span>
		);
	}

	if (editor.kind === "lookup") {
		const targets = lookupTargets(column, scope);
		const current = conditionLookup(element, targets[0]?.logicalName ?? "");
		const selection: LookupSelection | null = current
			? { id: current.id, name: current.name, entityLogicalName: current.table, entitySetName: "", navigationProperty: "" }
			: null;
		return (
			<span className={group}>
				<span className={inPane ? styles.full : styles.lookup} style={inPane ? undefined : { width: "240px" }}>
					<RecordLookup
						size={inPane ? "medium" : "small"}
						aria-label="value"
						targets={targets}
						value={selection}
						placeholder="Search Records..."
						search={lookup.search}
						getEntityInfo={lookup.getEntityInfo}
						onChange={(next) =>
							edit((query) => setConditionLookup(query, path, next ? { id: next.id, name: next.name, table: next.entityLogicalName } : null))
						}
					/>
				</span>
				{valueOfSwitch}
			</span>
		);
	}

	if (editor.count === "list") {
		if (editor.kind === "choice") {
			return <MultiPicker label="value" values={values} options={choiceOptions(column)} onChange={write} />;
		}
		return (
			<DraftInput
				label="value"
				kind="value"
				multiline={inPane}
				value={values.join(inPane ? "\n" : ", ")}
				placeholder={inPane ? "One value per line" : "a, b, c"}
				onCommit={(text) => write(parseListValues(text))}
			/>
		);
	}

	if (editor.count === "two") {
		const [first = "", second = ""] = values;
		return (
			<span className={group}>
				<SingleValue label="first value" editor={editor} column={column} value={first} onCommit={(next) => write([next, second])} />
				<Word>and</Word>
				<SingleValue label="second value" editor={editor} column={column} value={second} onCommit={(next) => write([first, next])} />
			</span>
		);
	}

	return (
		<span className={group}>
			<SingleValue label="value" editor={editor} column={column} value={values[0] ?? ""} onCommit={(next) => write([next])} />
			{valueOfSwitch}
		</span>
	);
};
