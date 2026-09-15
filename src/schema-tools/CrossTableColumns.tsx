import { Button, Checkbox, Dropdown, Field, Input, makeStyles, MessageBar, MessageBarBody, Option, Text, tokens } from "@fluentui/react-components";
import { Search20Regular } from "@fluentui/react-icons";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import {
	type AttributeProperty,
	type ColumnEditArgs,
	columnEditPlan,
	columnEditSummary,
	customisableReason,
	editablePropertiesFor,
	mixedTypeReason,
	PROPERTY_LABELS,
	tablesToPublish,
	typeMismatches,
} from "@/modules/schema/lib";
import { BulkRunDialog, DataTable, type DataTableColumn, FormRow, Grow, MANAGED_COLORS, TableFilter, useTableFilter, ValueChip } from "@/shared/components";
import { type AttributeEdit, type AttributeMatch, type BulkRunPlan, REQUIRED_LEVELS } from "@/shared/types";

import { type SchemaGateway } from "./useSchemaToolsBootstrap";

const useStyles = makeStyles({
	caption: { color: tokens.colorNeutralForeground3 },
	warn: { color: tokens.colorPaletteRedForeground1 },
	narrow: { maxWidth: "160px" },
});

interface CrossTableColumnsProps {
	gateway: SchemaGateway;
	solutionUniqueName: string | null;
	onPickSolution: () => void;
}

const numberOrUndefined = (value: string): number | undefined => {
	const trimmed = value.trim();
	if (trimmed === "") {
		return undefined;
	}
	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? parsed : undefined;
};

export const CrossTableColumns = ({ gateway, solutionUniqueName, onPickSolution }: CrossTableColumnsProps) => {
	const styles = useStyles();
	const [query, setQuery] = useState("");
	const [customOnly, setCustomOnly] = useState(false);
	const [matches, setMatches] = useState<AttributeMatch[]>([]);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [values, setValues] = useState<Record<AttributeProperty, string>>({
		label: "",
		description: "",
		requiredLevel: "",
		maxLength: "",
		minValue: "",
		maxValue: "",
		precision: "",
	});
	const [plan, setPlan] = useState<BulkRunPlan<ColumnEditArgs> | null>(null);

	const search = useMutation({
		mutationFn: (logicalName: string) => gateway.ops.findAttributeAcrossTables({ logicalName, customOnly }),
		onSuccess: (result: AttributeMatch[]) => {
			setMatches(result);
			setSelectedIds([]);
		},
	});

	const mismatched = useMemo(() => typeMismatches(matches), [matches]);
	const selected = useMemo(() => matches.filter((match) => selectedIds.includes(match.tableLogicalName)), [matches, selectedIds]);
	const filter = useTableFilter(matches, (match) => [match.tableDisplayName, match.tableLogicalName, match.attributeType, match.label]);

	const available = useMemo(() => editablePropertiesFor(selected.map((match) => match.attributeType)), [selected]);
	const mixedReason = useMemo(() => mixedTypeReason(selected.map((match) => match.attributeType)), [selected]);
	const set = (key: AttributeProperty, value: string) => setValues((current) => ({ ...current, [key]: value }));

	const edit: AttributeEdit = {
		...(values.label.trim() !== "" ? { label: values.label.trim() } : {}),
		...(values.description.trim() !== "" ? { description: values.description.trim() } : {}),
		...(values.requiredLevel !== "" ? { requiredLevel: values.requiredLevel } : {}),
		...(numberOrUndefined(values.maxLength) !== undefined ? { maxLength: numberOrUndefined(values.maxLength) } : {}),
		...(numberOrUndefined(values.minValue) !== undefined ? { minValue: numberOrUndefined(values.minValue) } : {}),
		...(numberOrUndefined(values.maxValue) !== undefined ? { maxValue: numberOrUndefined(values.maxValue) } : {}),
		...(numberOrUndefined(values.precision) !== undefined ? { precision: numberOrUndefined(values.precision) } : {}),
	};

	const columns: DataTableColumn<AttributeMatch>[] = [
		{ id: "table", label: "Table", width: 170, render: (match) => match.tableDisplayName, sortValue: (match) => match.tableDisplayName },
		{
			id: "type",
			label: "Type",
			width: 110,
			render: (match) => <span className={mismatched.has(match.tableLogicalName) ? styles.warn : undefined}>{match.attributeType}</span>,
			sortValue: (match) => match.attributeType,
		},
		{ id: "label", label: "Label", width: 160, render: (match) => match.label, sortValue: (match) => match.label },
		{ id: "required", label: "Requirement", width: 140, render: (match) => match.requiredLevel, sortValue: (match) => match.requiredLevel },
		{
			id: "managed",
			label: "Managed",
			width: 130,
			render: (match) => <ValueChip value={match.isManaged ? "Managed" : "Unmanaged"} palette={MANAGED_COLORS} />,
			sortValue: (match) => String(match.isManaged),
		},
		{
			id: "locked",
			label: "",
			width: 220,
			render: (match) => {
				const reason = customisableReason(match);
				return reason ? (
					<Text size={200} className={styles.warn}>
						{reason}
					</Text>
				) : null;
			},
		},
	];

	const execute = async (item: { args: ColumnEditArgs }) => {
		await gateway.ops.updateAttribute({ ...item.args, solutionUniqueName });
	};

	return (
		<>
			<MessageBar intent="info" layout="multiline">
				<MessageBarBody>
					The same column often exists on several tables — a status, a region, a reference code copied from table to table. Over time their labels,
					descriptions and requirement levels drift apart, and fixing that in the maker portal means opening every table in turn. Search a column
					logical name here to see every table in the environment that has it, then change the ones you pick in one run.
				</MessageBarBody>
			</MessageBar>
			<FormRow>
				<Grow>
					<Field label="Column logical name">
						<Input
							value={query}
							placeholder="new_region"
							onChange={(_, data) => setQuery(data.value)}
							onKeyDown={(event) => event.key === "Enter" && query.trim() && search.mutate(query.trim())}
						/>
					</Field>
				</Grow>
				<Checkbox checked={customOnly} label="Custom tables only" onChange={(_, data) => setCustomOnly(data.checked === true)} />
				<Button icon={<Search20Regular />} disabled={!gateway.ready || !query.trim() || search.isPending} onClick={() => search.mutate(query.trim())}>
					Find tables
				</Button>
			</FormRow>
			{matches.length > 0 ? (
				<FormRow>
					<Grow>
						<TableFilter query={filter.query} onChange={filter.setQuery} shown={filter.shown} total={filter.total} placeholder="Filter tables" />
					</Grow>
				</FormRow>
			) : null}
			<DataTable
				items={filter.filtered}
				columns={columns}
				getRowId={(match) => match.tableLogicalName}
				selectionMode="multiselect"
				selectedIds={new Set(selectedIds)}
				onSelectionChange={(ids) => setSelectedIds([...ids].map(String))}
				maxHeight="440px"
				autoFitColumns={false}
				emptyMessage={matches.length === 0 ? "Search a column logical name to see every table that has it." : "No tables match that filter."}
			/>
			{mixedReason ? (
				<MessageBar intent="warning">
					<MessageBarBody>{mixedReason}</MessageBarBody>
				</MessageBar>
			) : null}
			<FormRow>
				{available.includes("label") ? (
					<Field label={PROPERTY_LABELS.label}>
						<Input value={values.label} placeholder="leave blank to keep" onChange={(_, data) => set("label", data.value)} />
					</Field>
				) : null}
				<Grow>
					<Field label={PROPERTY_LABELS.description}>
						<Input value={values.description} placeholder="leave blank to keep" onChange={(_, data) => set("description", data.value)} />
					</Field>
				</Grow>
				<Field label={PROPERTY_LABELS.requiredLevel}>
					<Dropdown
						selectedOptions={[values.requiredLevel]}
						value={values.requiredLevel || "Keep as is"}
						onOptionSelect={(_, data) => set("requiredLevel", data.optionValue ?? "")}>
						<Option value="">Keep as is</Option>
						{REQUIRED_LEVELS.map((level) => (
							<Option key={level} value={level}>
								{level}
							</Option>
						))}
					</Dropdown>
				</Field>
			</FormRow>
			{available.length > 3 ? (
				<FormRow>
					{(["maxLength", "minValue", "maxValue", "precision"] as AttributeProperty[])
						.filter((key) => available.includes(key))
						.map((key) => (
							<Field key={key} label={PROPERTY_LABELS[key]} className={styles.narrow}>
								<Input type="number" value={values[key]} placeholder="keep" onChange={(_, data) => set(key, data.value)} />
							</Field>
						))}
					<Grow>
						<Text size={200} className={styles.caption}>
							These apply to {selected[0]?.attributeType} columns. Selecting a mix of types hides them.
						</Text>
					</Grow>
				</FormRow>
			) : null}
			<FormRow>
				<Button appearance="subtle" onClick={onPickSolution}>
					{solutionUniqueName ? `Solution: ${solutionUniqueName}` : "Choose a solution"}
				</Button>
				<Grow>
					<Text size={200} className={styles.caption}>
						{columnEditSummary(selected, edit)} Nothing is written until you confirm, and each table is reported separately.
					</Text>
				</Grow>
				<Button
					appearance="primary"
					disabled={selected.length === 0 || Object.keys(edit).length === 0}
					onClick={() => setPlan(columnEditPlan(selected, edit))}>
					Review changes
				</Button>
			</FormRow>
			<BulkRunDialog
				plan={plan}
				execute={execute}
				warning="Metadata changes are published after the run, for the tables that succeeded."
				onClose={() => setPlan(null)}
				onFinished={async (result) => {
					const succeeded = result.outcomes.filter((outcome) => outcome.kind === "succeeded").map((outcome) => outcome.id);
					const tables = tablesToPublish(succeeded);
					if (tables.length > 0) {
						await gateway.ops.publishTables({ logicalNames: tables }).catch(() => undefined);
					}
				}}
			/>
		</>
	);
};
