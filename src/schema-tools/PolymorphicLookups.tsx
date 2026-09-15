import { Button, Dropdown, Field, Input, makeStyles, MessageBar, MessageBarBody, Option, Text, tokens } from "@fluentui/react-components";
import { Add20Regular, Delete20Regular } from "@fluentui/react-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { usePageQuery } from "@/messaging/client";
import { DataTable, type DataTableColumn, FormRow, Grow, MultiSelectPicker, type PickerOption, useAppToast, useConfirm } from "@/shared/components";
import { type PolymorphicLookup, type PolymorphicTarget } from "@/shared/types";

import { type SchemaGateway } from "./useSchemaToolsBootstrap";

const useStyles = makeStyles({
	caption: { color: tokens.colorNeutralForeground3 },
	preview: { fontFamily: tokens.fontFamilyMonospace, fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground2 },
});

interface PolymorphicLookupsProps {
	gateway: SchemaGateway;
	solutionUniqueName: string | null;
	publisherPrefix: string | null;
	onPickSolution: () => void;
}

export const PolymorphicLookups = ({ gateway, solutionUniqueName, publisherPrefix, onPickSolution }: PolymorphicLookupsProps) => {
	const styles = useStyles();
	const toast = useAppToast();
	const confirm = useConfirm();
	const [table, setTable] = useState("");
	const [columnName, setColumnName] = useState("");
	const [label, setLabel] = useState("");
	const [targets, setTargets] = useState<string[]>([]);
	const [selectedLookup, setSelectedLookup] = useState<string | null>(null);

	const tables = usePageQuery("investigate.listTables", undefined);
	const tableOptions = useMemo<PickerOption[]>(
		() =>
			(tables.data ?? []).map((entity) => ({
				value: entity.logicalName,
				label: entity.displayName || entity.logicalName,
				description: entity.logicalName,
			})),
		[tables.data]
	);

	const lookups = useQuery({
		queryKey: gateway.key("listPolymorphicLookups", { tableLogicalName: table }),
		queryFn: () => gateway.ops.listPolymorphicLookups({ tableLogicalName: table }),
		enabled: gateway.ready && table !== "",
		staleTime: 0,
		retry: false,
	});

	const schemaName = publisherPrefix && columnName.trim() ? `${publisherPrefix}_${columnName.trim()}` : "";
	const lookup = (lookups.data ?? []).find((entry) => entry.columnLogicalName === selectedLookup) ?? null;
	const addableTargets = useMemo(() => {
		const used = new Set(lookup?.targets.map((target) => target.tableLogicalName) ?? []);
		return tableOptions.filter((option) => !used.has(option.value));
	}, [tableOptions, lookup]);

	const primaryIdOf = (logicalName: string) =>
		(tables.data ?? []).find((entity) => entity.logicalName === logicalName)?.primaryIdAttribute ?? `${logicalName}id`;

	const create = useMutation({
		mutationFn: () =>
			gateway.ops.createPolymorphicLookup({
				tableLogicalName: table,
				columnSchemaName: schemaName,
				label: label.trim() || columnName.trim(),
				targetTableLogicalNames: targets,
				solutionUniqueName,
			}),
		onSuccess: () => {
			toast.success("Polymorphic lookup created");
			setTargets([]);
			setColumnName("");
			void lookups.refetch();
		},
		onError: (error) => toast.error("Could not create the polymorphic lookup", error),
	});

	const addTarget = useMutation({
		mutationFn: (targetTable: string) =>
			gateway.ops.addPolymorphicTarget({
				tableLogicalName: table,
				columnSchemaName: lookup?.columnLogicalName ?? "",
				columnLogicalName: lookup?.columnLogicalName ?? "",
				label: lookup?.columnLogicalName ?? "",
				targetTableLogicalName: targetTable,
				targetPrimaryIdAttribute: primaryIdOf(targetTable),
				solutionUniqueName,
			}),
		onSuccess: () => {
			toast.success("Target added");
			void lookups.refetch();
		},
		onError: (error) => toast.error("Could not add that target", error),
	});

	const removeTarget = useMutation({
		mutationFn: (target: PolymorphicTarget) => gateway.ops.removePolymorphicTarget({ relationshipId: target.relationshipId }),
		onSuccess: () => {
			toast.success("Target removed");
			void lookups.refetch();
		},
		onError: (error) => toast.error("Could not remove that target", error),
	});

	const confirmRemove = async (target: PolymorphicTarget) => {
		if (!lookup || lookup.targets.length <= 1) {
			toast.error("A polymorphic lookup must keep at least one target", "Delete the column instead if it is no longer needed.");
			return;
		}
		const ok = await confirm({
			title: `Remove ${target.tableLogicalName}?`,
			content:
				"This deletes the relationship behind that target. Records already pointing at a row in that table keep their stored id, but it will no longer resolve. This cannot be undone from here.",
			confirmLabel: "Remove target",
		});
		if (ok) {
			removeTarget.mutate(target);
		}
	};

	const lookupColumns: DataTableColumn<PolymorphicLookup>[] = [
		{ id: "column", label: "Column", width: 220, render: (entry) => entry.columnLogicalName, sortValue: (entry) => entry.columnLogicalName },
		{ id: "targets", label: "Target tables", width: 340, render: (entry) => entry.targets.map((target) => target.tableLogicalName).join(", ") },
		{ id: "count", label: "Targets", width: 90, render: (entry) => String(entry.targets.length), sortValue: (entry) => entry.targets.length },
	];

	const targetColumns: DataTableColumn<PolymorphicTarget>[] = [
		{ id: "table", label: "Target table", width: 220, render: (target) => target.tableLogicalName, sortValue: (target) => target.tableLogicalName },
		{ id: "relationship", label: "Relationship", width: 300, render: (target) => target.relationshipSchemaName },
		{
			id: "remove",
			label: "",
			width: 110,
			render: (target) => (
				<Button
					size="small"
					appearance="subtle"
					icon={<Delete20Regular />}
					disabled={removeTarget.isPending}
					onClick={() => void confirmRemove(target)}>
					Remove
				</Button>
			),
		},
	];

	return (
		<>
			<MessageBar intent="info" layout="multiline">
				<MessageBarBody>
					A polymorphic lookup points at a row in any one of several tables. The maker portal cannot create or change them, so this is the only place
					to do it. Pick a table to see the ones it already has, add or remove target tables, or create a new lookup.
				</MessageBarBody>
			</MessageBar>
			<FormRow>
				<Grow>
					<Field label="Table">
						<Dropdown
							disabled={tables.isLoading}
							selectedOptions={table ? [table] : []}
							value={tableOptions.find((option) => option.value === table)?.label ?? ""}
							placeholder={tables.isLoading ? "Loading tables..." : "Choose a table"}
							onOptionSelect={(_, data) => {
								setTable(data.optionValue ?? "");
								setSelectedLookup(null);
							}}>
							{tableOptions.map((option) => (
								<Option key={option.value} value={option.value} text={option.label}>
									{option.label}
								</Option>
							))}
						</Dropdown>
					</Field>
				</Grow>
				<Button appearance="subtle" onClick={onPickSolution}>
					{solutionUniqueName ? `Solution: ${solutionUniqueName}` : "Choose a solution"}
				</Button>
			</FormRow>

			<Field label="Existing polymorphic lookups" hint="A column with more than one relationship behind it.">
				<DataTable
					items={lookups.data ?? []}
					columns={lookupColumns}
					getRowId={(entry) => entry.columnLogicalName}
					selectionMode="single"
					selectedIds={new Set(selectedLookup ? [selectedLookup] : [])}
					onSelectionChange={(ids) => setSelectedLookup([...ids].map(String)[0] ?? null)}
					maxHeight="200px"
					autoFitColumns={false}
					emptyMessage={table === "" ? "Choose a table to see its polymorphic lookups." : "This table has none."}
				/>
			</Field>

			{lookup ? (
				<>
					<Field label={`Targets of ${lookup.columnLogicalName}`}>
						<DataTable
							items={lookup.targets}
							columns={targetColumns}
							getRowId={(target) => target.relationshipId}
							maxHeight="200px"
							autoFitColumns={false}
						/>
					</Field>
					<FormRow>
						<Grow>
							<MultiSelectPicker
								label="Add a target table"
								options={addableTargets}
								selected={[]}
								onChange={(selected) => {
									const next = selected[0];
									if (next) {
										addTarget.mutate(next);
									}
								}}
								placeholder="Search tables..."
								disabled={addTarget.isPending}
								hint="Adding a target creates another relationship behind the same column."
							/>
						</Grow>
					</FormRow>
				</>
			) : null}

			<Field label="Create a new polymorphic lookup">
				<FormRow>
					<Field label="Column name">
						<Input value={columnName} placeholder="RelatedTo" onChange={(_, data) => setColumnName(data.value)} />
					</Field>
					<Field label="Schema name">
						<Text className={styles.preview}>{schemaName || (publisherPrefix ? "…" : "Choose a solution for the prefix")}</Text>
					</Field>
					<Grow>
						<Field label="Label">
							<Input value={label} placeholder="Related to" onChange={(_, data) => setLabel(data.value)} />
						</Field>
					</Grow>
				</FormRow>
				<MultiSelectPicker
					label="Target tables"
					options={tableOptions}
					selected={targets}
					onChange={setTargets}
					placeholder="Search tables..."
					hint="The tables a value in this column may point at. This set cannot be reduced below one later."
				/>
				<FormRow>
					<Grow>
						<Text size={200} className={styles.caption}>
							{targets.length === 0
								? "Pick at least one target table."
								: `${targets.length} target ${targets.length === 1 ? "table" : "tables"}.`}
						</Text>
					</Grow>
					<Button
						appearance="primary"
						icon={<Add20Regular />}
						disabled={!gateway.ready || table === "" || schemaName === "" || targets.length === 0 || create.isPending}
						onClick={() => create.mutate()}>
						Create lookup
					</Button>
				</FormRow>
			</Field>
		</>
	);
};
