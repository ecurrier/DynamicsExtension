import { Field, makeStyles, Text, tokens } from "@fluentui/react-components";
import { type ReactNode, useMemo } from "react";

import { aliasesIn, type Diagnostic } from "@/shared/lib/fetchxml";

import {
	attributeAliasOptions,
	type DetailsEntry,
	enumerationOptions,
	isTrueValue,
	linkReferenceOptions,
	worstSeverity,
	presentValue,
	setAttributes,
	setConditionValueOf,
	tableScope,
	valueOfOptions,
} from "../lib";
import { SeverityIcon } from "../ProblemIcon";
import { useQueryBuilder } from "../store";
import { Flag, MultiPicker } from "./Controls";
import { DraftInput } from "./DraftInput";
import { useQueryEditing } from "./EditingContext";
import { ColumnPicker, EnumPicker, OptionPicker, TablePicker } from "./Pickers";
import {
	ConditionColumnPicker,
	ConditionOperatorPicker,
	ConditionValueEditor,
	type ElementEditorProps,
	EntityTablePicker,
	RelationshipPicker,
	useTextAttribute,
} from "./RowEditors";

const useStyles = makeStyles({
	label: {
		fontFamily: tokens.fontFamilyMonospace,
		fontWeight: tokens.fontWeightSemibold,
		overflowWrap: "anywhere",
	},
	optional: {
		fontFamily: tokens.fontFamilyBase,
		fontWeight: tokens.fontWeightRegular,
		color: tokens.colorNeutralForeground3,
	},
	written: {
		fontFamily: tokens.fontFamilyMonospace,
		fontSize: tokens.fontSizeBase200,
		overflowWrap: "anywhere",
	},
});

interface DetailsFieldProps {
	name: string;
	hint?: string;
	optional?: boolean;
	problems?: readonly Diagnostic[];
	children: ReactNode;
}

const NO_PROBLEMS: readonly Diagnostic[] = [];

export const DetailsField = ({ name, hint, optional = false, problems = NO_PROBLEMS, children }: DetailsFieldProps) => {
	const styles = useStyles();
	const severity = worstSeverity(problems);
	return (
		<Field
			label={{
				children: optional ? (
					<>
						{name}
						<span className={styles.optional}> (optional)</span>
					</>
				) : (
					name
				),
				className: styles.label,
			}}
			hint={hint}
			validationState={severity === "error" ? "error" : severity === "warning" ? "warning" : "none"}
			validationMessage={severity === null ? undefined : problems.map((problem) => problem.message).join(" ")}
			validationMessageIcon={severity === "info" ? <SeverityIcon severity="info" /> : undefined}>
			{children}
		</Field>
	);
};

interface AttributeControlProps extends ElementEditorProps {
	entry: Extract<DetailsEntry, { kind: "known" }>;
}

const OptionalAliasPicker = ({ document, path, entry, edit }: AttributeControlProps) => {
	const references = useMemo(
		() =>
			entry.name === "entityname"
				? linkReferenceOptions(document)
				: entry.name === "alias" && entry.definition.value.kind === "alias"
					? attributeAliasOptions(document)
					: aliasesIn(document).map((alias) => ({ value: alias.alias, text: alias.alias })),
		[document, entry]
	);
	return (
		<OptionPicker
			label={entry.name}
			kind="alias"
			value={entry.value}
			options={references}
			optional
			onChange={(value) => edit((query) => setAttributes(query, path, { [entry.name]: value }))}
		/>
	);
};

const ValueOfPicker = ({ document, path, entry, edit }: AttributeControlProps) => {
	const { metadata } = useQueryEditing();
	const lead = useQueryBuilder((state) => state.namesLead);
	const options = useMemo(() => valueOfOptions(document, path, metadata, lead), [document, path, metadata, lead]);
	return (
		<OptionPicker
			label="valueof"
			kind="value"
			value={entry.value}
			options={options}
			optional
			onChange={(reference) => edit((query) => setConditionValueOf(query, path, reference))}
		/>
	);
};

const GenericControl = (props: AttributeControlProps) => {
	const { document, path, entry, edit } = props;
	const { metadata } = useQueryEditing();
	const text = useTextAttribute({ path, edit });
	const set = (value: string | null) => edit((query) => setAttributes(query, path, { [entry.name]: value }));
	const kind = entry.definition.value;
	switch (kind.kind) {
		case "enumeration":
			if (kind.multiple) {
				const values = (entry.value ?? "")
					.split(",")
					.map((part) => part.trim())
					.filter((part) => part !== "");
				return (
					<MultiPicker
						label={entry.name}
						values={values}
						options={enumerationOptions(kind.values)}
						onChange={(next) => set(next.length === 0 ? null : next.join(","))}
					/>
				);
			}
			return <EnumPicker label={entry.name} value={entry.value} values={kind.values} optional={!entry.definition.required} onChange={set} />;
		case "boolean":
			return <Flag name={entry.name} checked={isTrueValue(entry.value)} onChange={(checked) => set(checked ? "true" : null)} />;
		case "number":
			return <DraftInput label={entry.name} kind="number" type="number" value={entry.value ?? ""} onCommit={text(entry.name)} />;
		case "table":
			return <TablePicker label={entry.name} value={presentValue(props.element, entry.name)} optional={!entry.definition.required} onChange={set} />;
		case "column":
			return (
				<ColumnPicker
					label={entry.name}
					scope={tableScope(document, path, entry.name, metadata)}
					value={presentValue(props.element, entry.name)}
					optional={!entry.definition.required}
					onChange={set}
				/>
			);
		case "alias":
			return <OptionalAliasPicker {...props} />;
		case "text":
			return <DraftInput label={entry.name} kind="value" value={entry.value ?? ""} onCommit={text(entry.name)} />;
	}
};

export const AttributeControl = (props: AttributeControlProps) => {
	const { path, element, entry } = props;
	const key = `${element.name}.${entry.name}`;
	switch (key) {
		case "entity.name":
			return <EntityTablePicker path={path} element={element} />;
		case "condition.attribute":
			return <ConditionColumnPicker {...props} />;
		case "condition.operator":
			return <ConditionOperatorPicker {...props} />;
		case "condition.value":
			return <ConditionValueEditor {...props} />;
		case "condition.valueof":
			return <ValueOfPicker {...props} />;
		default:
			return <GenericControl {...props} />;
	}
};

export const RelationshipField = (props: ElementEditorProps) => (
	<DetailsField name="relationship" hint="Sets name, from and to together. A custom join uses no relationship.">
		<RelationshipPicker {...props} />
	</DetailsField>
);

export const WrittenValue = ({ value }: { value: string }) => {
	const styles = useStyles();
	return <Text className={styles.written}>{value === "" ? '""' : value}</Text>;
};
