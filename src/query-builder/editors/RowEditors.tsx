import { type ReactNode, useMemo } from "react";

import { attributeDefinition, attributeValue, type EnumerationValue, type FetchXmlDocument, type NodePath, type XmlElement } from "@/shared/lib/fetchxml";

import {
	aggregateChoiceOf,
	attributeAliasOptions,
	changeConditionColumn,
	changeConditionOperator,
	type ChangeResult,
	CUSTOM_JOIN,
	GROUP_BY,
	isAggregateQuery,
	isTrueValue,
	linkRelationships,
	matchingRelationship,
	operatorOptions,
	pickRelationship,
	presentValue,
	relationshipOptions,
	scopeColumn,
	setAggregateChoice,
	setAttributes,
	tableScope,
} from "../lib";
import { useQueryBuilder } from "../store";
import { ConditionValue } from "./ConditionValue";
import { DirectionToggle, Flag, Segmented, Word } from "./Controls";
import { DraftInput } from "./DraftInput";
import { useQueryEditing } from "./EditingContext";
import { ColumnPicker, EnumPicker, OptionPicker, TablePicker } from "./Pickers";
import { SearchPicker } from "./SearchPicker";
import { useTableChange } from "./useTableChange";

export type QueryEdit = (build: (query: FetchXmlDocument) => ChangeResult) => unknown;

export interface ElementEditorProps {
	document: FetchXmlDocument;
	path: NodePath;
	element: XmlElement;
	edit: QueryEdit;
}

const enumValues = (element: string, attribute: string): readonly EnumerationValue[] => {
	const kind = attributeDefinition(element, attribute)?.value;
	return kind?.kind === "enumeration" ? kind.values : [];
};

export const AGGREGATE_VALUES: readonly EnumerationValue[] = [
	{ value: GROUP_BY, description: "Groups the results by this column." },
	...enumValues("attribute", "aggregate"),
];

export const FILTER_TYPES = [
	{ value: "and", text: "AND" },
	{ value: "or", text: "OR" },
];

const filterType = (element: XmlElement): string => ((attributeValue(element, "type") ?? "and").trim().toLowerCase() === "or" ? "or" : "and");

export const useTextAttribute =
	({ path, edit }: Pick<ElementEditorProps, "path" | "edit">) =>
	(name: string) =>
	(value: string) =>
		edit((query) => setAttributes(query, path, { [name]: value.trim() === "" ? null : value.trim() }));

const FetchRow = ({ path, element, edit }: ElementEditorProps) => {
	const text = useTextAttribute({ path, edit });
	return (
		<>
			<Word>top</Word>
			<DraftInput label="top" kind="number" type="number" value={attributeValue(element, "top") ?? ""} placeholder="all" onCommit={text("top")} />
			<Flag
				name="distinct"
				checked={isTrueValue(attributeValue(element, "distinct"))}
				onChange={(checked) => edit((query) => setAttributes(query, path, { distinct: checked ? "true" : null }))}
			/>
		</>
	);
};

export const EntityTablePicker = ({ path, element }: Pick<ElementEditorProps, "path" | "element">) => {
	const change = useTableChange(path);
	return <TablePicker label="name" value={presentValue(element, "name")} onChange={(value) => void change(value)} />;
};

const AttributeRow = ({ document, path, element, edit }: ElementEditorProps) => {
	const { metadata } = useQueryEditing();
	const text = useTextAttribute({ path, edit });
	const scope = tableScope(document, path, "name", metadata);
	const aggregate = isAggregateQuery(document);
	const alias = attributeValue(element, "alias");
	return (
		<>
			<ColumnPicker
				label="name"
				scope={scope}
				purpose="read"
				value={presentValue(element, "name")}
				onChange={(value) => edit((query) => setAttributes(query, path, { name: value ?? "" }))}
			/>
			{aggregate ? (
				<EnumPicker
					label="aggregate"
					value={aggregateChoiceOf(element) ?? undefined}
					values={AGGREGATE_VALUES}
					placeholder="aggregate"
					onChange={(choice) => edit((query) => setAggregateChoice(query, path, choice))}
				/>
			) : null}
			{aggregate || alias !== undefined ? (
				<>
					<Word>alias</Word>
					<DraftInput
						label="alias"
						kind="alias"
						value={alias ?? ""}
						placeholder={aggregate ? "required" : "alias"}
						required={aggregate}
						onCommit={text("alias")}
					/>
				</>
			) : null}
		</>
	);
};

const OrderRow = ({ document, path, element, edit }: ElementEditorProps) => {
	const { metadata } = useQueryEditing();
	const aggregate = isAggregateQuery(document);
	const aliases = useMemo(() => attributeAliasOptions(document), [document]);
	const scope = tableScope(document, path, "attribute", metadata);
	return (
		<>
			{aggregate ? (
				<>
					<Word>alias</Word>
					<OptionPicker
						label="alias"
						kind="alias"
						value={presentValue(element, "alias")}
						options={aliases}
						placeholder="(choose an alias)"
						onChange={(value) => edit((query) => setAttributes(query, path, { alias: value }))}
					/>
				</>
			) : (
				<ColumnPicker
					label="attribute"
					scope={scope}
					purpose="read"
					value={presentValue(element, "attribute")}
					onChange={(value) => edit((query) => setAttributes(query, path, { attribute: value ?? "" }))}
				/>
			)}
			<DirectionToggle
				descending={isTrueValue(attributeValue(element, "descending"))}
				onChange={(descending) => edit((query) => setAttributes(query, path, { descending: descending ? "true" : null }))}
			/>
		</>
	);
};

const FilterRow = ({ path, element, edit }: ElementEditorProps) => (
	<Segmented label="type" value={filterType(element)} options={FILTER_TYPES} onChange={(type) => edit((query) => setAttributes(query, path, { type }))} />
);

export const ConditionColumnPicker = ({ document, path, element, edit }: ElementEditorProps) => {
	const { metadata } = useQueryEditing();
	const scope = tableScope(document, path, "attribute", metadata);
	return (
		<ColumnPicker
			label="attribute"
			scope={scope}
			value={presentValue(element, "attribute")}
			onChange={(value) => edit((query) => changeConditionColumn(query, path, value ?? "", scopeColumn(scope, value ?? undefined)))}
		/>
	);
};

export const ConditionOperatorPicker = ({ document, path, element, edit }: ElementEditorProps) => {
	const { metadata } = useQueryEditing();
	const scope = tableScope(document, path, "attribute", metadata);
	const column = scopeColumn(scope, presentValue(element, "attribute"));
	const options = useMemo(() => operatorOptions(column), [column]);
	return (
		<SearchPicker
			label="operator"
			kind="operator"
			value={presentValue(element, "operator") ?? null}
			options={options}
			placeholder="operator"
			onPick={(operator) => edit((query) => changeConditionOperator(query, path, operator, column))}
		/>
	);
};

export const ConditionValueEditor = (props: ElementEditorProps) => {
	const { metadata } = useQueryEditing();
	const scope = tableScope(props.document, props.path, "attribute", metadata);
	return <ConditionValue {...props} scope={scope} column={scopeColumn(scope, presentValue(props.element, "attribute"))} />;
};

const ConditionRow = (props: ElementEditorProps) => (
	<>
		<ConditionColumnPicker {...props} />
		<ConditionOperatorPicker {...props} />
		<ConditionValueEditor {...props} />
	</>
);

export const RelationshipPicker = ({ document, path, element, edit }: ElementEditorProps) => {
	const { metadata, tables } = useQueryEditing();
	const lead = useQueryBuilder((state) => state.namesLead);
	const parent = tableScope(document, path, "to", metadata);
	const relationships = useMemo(() => (parent.state === "loaded" ? linkRelationships(parent.table) : []), [parent]);
	const options = useMemo(() => relationshipOptions(relationships, tables ?? [], lead), [relationships, tables, lead]);
	const match = matchingRelationship(relationships, element);
	const name = presentValue(element, "name");
	return (
		<SearchPicker
			label="relationship"
			kind="relationship"
			value={match?.key ?? null}
			text={name === undefined ? undefined : CUSTOM_JOIN}
			options={options}
			placeholder="(choose a relationship)"
			onPick={(key) => {
				const relationship = relationships.find((candidate) => candidate.key === key);
				if (relationship) {
					edit((query) => pickRelationship(query, path, relationship));
				}
			}}
		/>
	);
};

export const LINK_TYPES = enumValues("link-entity", "link-type");

const LinkEntityRow = (props: ElementEditorProps) => {
	const { path, element, edit } = props;
	const text = useTextAttribute({ path, edit });
	return (
		<>
			<RelationshipPicker {...props} />
			<Word>link-type</Word>
			<EnumPicker
				label="link-type"
				value={presentValue(element, "link-type")}
				values={LINK_TYPES}
				placeholder="inner"
				onChange={(value) => edit((query) => setAttributes(query, path, { "link-type": value }))}
			/>
			<Word>alias</Word>
			<DraftInput label="alias" kind="alias" value={attributeValue(element, "alias") ?? ""} placeholder="alias" onCommit={text("alias")} />
		</>
	);
};

export const ROW_EDITORS: Partial<Record<string, (props: ElementEditorProps) => ReactNode>> = {
	fetch: FetchRow,
	entity: EntityTablePicker,
	attribute: AttributeRow,
	order: OrderRow,
	filter: FilterRow,
	condition: ConditionRow,
	"link-entity": LinkEntityRow,
};

export const PENDING_SCOPE: Partial<Record<string, string>> = {
	attribute: "name",
	order: "attribute",
	condition: "attribute",
	"link-entity": "to",
};
