import { Button, Dropdown, Input, makeStyles, Option, Select, Textarea } from "@fluentui/react-components";
import { Dismiss16Regular } from "@fluentui/react-icons";
import { useState } from "react";

import { RecordLookup, type RecordLookupServices } from "@/shared/components";

import { type DraftValue, type RecordColumn } from "../../lib";

const useStyles = makeStyles({
	full: {
		width: "100%",
		minWidth: 0,
	},
	memo: {
		width: "100%",
		minWidth: 0,
		"& textarea": {
			resize: "vertical",
		},
	},
});

interface ColumnEditorProps {
	row: RecordColumn;
	value: DraftValue;
	lookupServices: RecordLookupServices;
	onChange: (value: DraftValue) => void;
}

const EMPTY_OPTION = "";

export const ColumnEditor = ({ row, value, lookupServices, onChange }: ColumnEditorProps) => {
	const styles = useStyles();
	const [expanded, setExpanded] = useState(false);
	const options = row.column.optionSet?.options ?? [];
	const label = row.displayName;
	const optionLabel = (optionValue: string) => options.find((option) => String(option.value) === optionValue)?.label ?? optionValue;

	if (value.kind === "text") {
		const setText = (text: string) => onChange({ kind: "text", text });
		const clear =
			value.text !== "" ? (
				<Button appearance="transparent" size="small" icon={<Dismiss16Regular />} aria-label={`Clear ${label}`} onClick={() => setText("")} />
			) : undefined;
		switch (row.editor) {
			case "memo":
				return (
					<Textarea
						className={styles.memo}
						size="small"
						aria-label={label}
						value={value.text}
						rows={expanded ? 6 : 1}
						onFocus={() => setExpanded(true)}
						onBlur={() => setExpanded(false)}
						onChange={(_, data) => setText(data.value)}
					/>
				);
			case "date":
			case "dateTime":
				return (
					<Input
						className={styles.full}
						size="small"
						aria-label={label}
						type={row.editor === "date" ? "date" : "datetime-local"}
						value={value.text}
						contentAfter={clear}
						onChange={(_, data) => setText(data.value)}
					/>
				);
			case "number":
				return (
					<Input
						className={styles.full}
						size="small"
						aria-label={label}
						inputMode="decimal"
						value={value.text}
						onChange={(_, data) => setText(data.value)}
					/>
				);
			default:
				return <Input className={styles.full} size="small" aria-label={label} value={value.text} onChange={(_, data) => setText(data.value)} />;
		}
	}

	if (value.kind === "option") {
		return (
			<Select
				className={styles.full}
				size="small"
				aria-label={label}
				value={value.value === null ? EMPTY_OPTION : String(value.value)}
				onChange={(_, data) => onChange({ kind: "option", value: data.value === EMPTY_OPTION ? null : Number(data.value) })}>
				<option value={EMPTY_OPTION}>—</option>
				{options.map((option) => (
					<option key={option.value} value={String(option.value)}>
						{option.label}
					</option>
				))}
			</Select>
		);
	}

	if (value.kind === "options") {
		const selected = value.values.map(String);
		return (
			<Dropdown
				className={styles.full}
				size="small"
				aria-label={label}
				multiselect
				clearable
				placeholder="—"
				value={selected.map(optionLabel).join("; ")}
				selectedOptions={selected}
				onOptionSelect={(_, data) => onChange({ kind: "options", values: data.selectedOptions.map(Number) })}>
				{options.map((option) => (
					<Option key={option.value} value={String(option.value)} text={option.label}>
						{option.label}
					</Option>
				))}
			</Dropdown>
		);
	}

	return (
		<RecordLookup
			targets={row.column.targets}
			value={value.value}
			placeholder="—"
			size="small"
			aria-label={label}
			onChange={(lookup) => onChange({ kind: "lookup", value: lookup })}
			search={lookupServices.search}
			getEntityInfo={lookupServices.getEntityInfo}
		/>
	);
};
