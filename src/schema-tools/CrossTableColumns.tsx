import { Button, Checkbox, Dropdown, Field, Input, makeStyles, Option, Text, tokens } from "@fluentui/react-components";
import { Search20Regular } from "@fluentui/react-icons";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { type ColumnEditArgs, columnEditPlan, columnEditSummary, customisableReason, tablesToPublish, typeMismatches } from "@/modules/schema/lib";
import { BulkRunDialog, DataTable, type DataTableColumn, FormRow, Grow } from "@/shared/components";
import { type AttributeEdit, type AttributeMatch, type BulkRunPlan, REQUIRED_LEVELS } from "@/shared/types";

import { type SchemaGateway } from "./useSchemaToolsBootstrap";

const useStyles = makeStyles({ caption: { color: tokens.colorNeutralForeground3 }, warn: { color: tokens.colorPaletteRedForeground1 } });

interface CrossTableColumnsProps {
	gateway: SchemaGateway;
	solutionUniqueName: string | null;
	onPickSolution: () => void;
}

export const CrossTableColumns = ({ gateway, solutionUniqueName, onPickSolution }: CrossTableColumnsProps) => {
	const styles = useStyles();
	const [query, setQuery] = useState("");
	const [customOnly, setCustomOnly] = useState(false);
	const [matches, setMatches] = useState<AttributeMatch[]>([]);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [label, setLabel] = useState("");
	const [description, setDescription] = useState("");
	const [requiredLevel, setRequiredLevel] = useState("");
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
	const edit: AttributeEdit = {
		...(label.trim() !== "" ? { label: label.trim() } : {}),
		...(description.trim() !== "" ? { description: description.trim() } : {}),
		...(requiredLevel !== "" ? { requiredLevel } : {}),
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
			id: "state",
			label: "Managed",
			width: 150,
			render: (match) => customisableReason(match) ?? (match.isManaged ? "Managed, editable" : "Unmanaged"),
			sortValue: (match) => String(match.isCustomizable),
		},
	];

	const execute = async (item: { args: ColumnEditArgs }) => {
		await gateway.ops.updateAttribute({ ...item.args, solutionUniqueName });
	};

	return (
		<>
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
			<DataTable
				items={matches}
				columns={columns}
				getRowId={(match) => match.tableLogicalName}
				selectionMode="multiselect"
				selectedIds={new Set(selectedIds)}
				onSelectionChange={(ids) => setSelectedIds([...ids].map(String))}
				maxHeight="300px"
				autoFitColumns={false}
				emptyMessage="Search a column logical name to see every table that has it."
			/>
			<FormRow>
				<Field label="New label">
					<Input value={label} placeholder="leave blank to keep" onChange={(_, data) => setLabel(data.value)} />
				</Field>
				<Field label="New description">
					<Input value={description} placeholder="leave blank to keep" onChange={(_, data) => setDescription(data.value)} />
				</Field>
				<Field label="Requirement level">
					<Dropdown
						selectedOptions={[requiredLevel]}
						value={requiredLevel || "Keep as is"}
						onOptionSelect={(_, data) => setRequiredLevel(data.optionValue ?? "")}>
						<Option value="">Keep as is</Option>
						{REQUIRED_LEVELS.map((level) => (
							<Option key={level} value={level}>
								{level}
							</Option>
						))}
					</Dropdown>
				</Field>
			</FormRow>
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
