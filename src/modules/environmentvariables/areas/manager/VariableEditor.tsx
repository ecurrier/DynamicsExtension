import { Badge, Button, Dropdown, Field, Input, makeStyles, MessageBar, MessageBarBody, Option, Text, Textarea, tokens } from "@fluentui/react-components";
import { Delete20Regular, Save20Regular } from "@fluentui/react-icons";
import { useState } from "react";

import { CodeEditor, CopyButton, FormStack } from "@/shared/components";
import { ENVIRONMENT_VARIABLE_TYPE_LABELS, type EnvironmentVariable } from "@/shared/types";

import { isEditableType, isTrueValue, normalizeVariableValue, validateVariableValue } from "../../lib";

const useStyles = makeStyles({
	header: {
		display: "flex",
		alignItems: "center",
		flexWrap: "wrap",
		gap: "8px",
	},
	mono: {
		fontFamily: tokens.fontFamilyMonospace,
		fontSize: tokens.fontSizeBase200,
		color: tokens.colorNeutralForeground3,
	},
	muted: {
		color: tokens.colorNeutralForeground3,
	},
	defaultRow: {
		display: "flex",
		alignItems: "center",
		gap: "4px",
		minWidth: 0,
	},
	defaultValue: {
		fontFamily: tokens.fontFamilyMonospace,
		fontSize: tokens.fontSizeBase200,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
	actions: {
		display: "flex",
		justifyContent: "flex-end",
		gap: "8px",
	},
});

interface VariableEditorProps {
	variable: EnvironmentVariable;
	saving: boolean;
	onSave: (value: string) => void;
	onClear: () => void;
}

const BOOLEAN_TYPE = 100000002;
const NUMBER_TYPE = 100000001;
const JSON_TYPE = 100000003;

export const VariableEditor = ({ variable, saving, onSave, onClear }: VariableEditorProps) => {
	const styles = useStyles();
	const [draft, setDraft] = useState(variable.currentValue ?? "");
	const editable = isEditableType(variable.type);
	const validation = validateVariableValue(variable.type, draft);
	const changed = draft.trim() !== "" && normalizeVariableValue(variable.type, draft) !== (variable.currentValue ?? "");
	const showValidation = draft.trim() !== "" && validation !== null;

	const input = () => {
		if (!editable) {
			return <Input value={variable.currentValue ?? ""} readOnly />;
		}
		if (variable.type === BOOLEAN_TYPE) {
			const selected = draft.trim() ? (isTrueValue(draft) ? "yes" : "no") : "";
			return (
				<Dropdown
					placeholder="Select yes or no..."
					value={selected === "yes" ? "Yes" : selected === "no" ? "No" : ""}
					selectedOptions={selected ? [selected] : []}
					onOptionSelect={(_, data) => setDraft(data.optionValue ?? "")}>
					<Option value="yes" text="Yes">
						Yes
					</Option>
					<Option value="no" text="No">
						No
					</Option>
				</Dropdown>
			);
		}
		if (variable.type === NUMBER_TYPE) {
			return <Input value={draft} inputMode="decimal" onChange={(_, data) => setDraft(data.value)} />;
		}
		if (variable.type === JSON_TYPE) {
			return <CodeEditor value={draft} language="json" height="140px" onChange={setDraft} />;
		}
		return <Textarea value={draft} rows={3} resize="vertical" onChange={(_, data) => setDraft(data.value)} />;
	};

	return (
		<FormStack>
			<div className={styles.header}>
				<Text weight="semibold">{variable.displayName}</Text>
				<span className={styles.mono}>{variable.schemaName}</span>
				<CopyButton text={variable.schemaName} iconOnly appearance="subtle" label="Copy schema name" />
				<Badge appearance="tint" size="small">
					{ENVIRONMENT_VARIABLE_TYPE_LABELS[variable.type]}
				</Badge>
				{variable.isManaged ? (
					<Badge appearance="tint" size="small" color="informative">
						Managed
					</Badge>
				) : null}
			</div>
			{variable.description ? (
				<Text size={200} className={styles.muted}>
					{variable.description}
				</Text>
			) : null}
			<div className={styles.defaultRow}>
				<Text size={200} className={styles.muted}>
					Default:
				</Text>
				<span className={styles.defaultValue} title={variable.defaultValue ?? undefined}>
					{variable.defaultValue ?? "none"}
				</span>
				{variable.defaultValue ? <CopyButton text={variable.defaultValue} iconOnly appearance="subtle" label="Copy default value" /> : null}
			</div>
			{editable ? null : (
				<MessageBar intent="info">
					<MessageBarBody>Secret variables reference a key vault secret and are managed in the maker portal.</MessageBarBody>
				</MessageBar>
			)}
			<Field
				label="Current value"
				hint={variable.hint ?? undefined}
				validationMessage={showValidation ? validation : undefined}
				validationState={showValidation ? "error" : "none"}>
				{input()}
			</Field>
			<div className={styles.actions}>
				<Button icon={<Delete20Regular />} disabled={!editable || saving || variable.valueId === null} onClick={onClear}>
					Remove value
				</Button>
				<Button
					appearance="primary"
					icon={<Save20Regular />}
					disabled={!editable || saving || validation !== null || !changed}
					onClick={() => onSave(normalizeVariableValue(variable.type, draft))}>
					{saving ? "Saving..." : "Save value"}
				</Button>
			</div>
		</FormStack>
	);
};
