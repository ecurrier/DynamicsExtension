import { Button, Field, Input, makeStyles, MessageBar, MessageBarBody, MessageBarTitle, Text, tokens } from "@fluentui/react-components";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { DataTable, type DataTableColumn, FormRow, Grow, useAppToast } from "@/shared/components";
import { type PolymorphicLookup, polymorphicOperations } from "@/shared/lib";

const useStyles = makeStyles({ caption: { color: tokens.colorNeutralForeground3 } });

interface PolymorphicLookupsProps {
	http: Parameters<typeof polymorphicOperations>[0] | null;
	solutionUniqueName: string | null;
	onPickSolution: () => void;
}

export const PolymorphicLookups = ({ http, solutionUniqueName, onPickSolution }: PolymorphicLookupsProps) => {
	const styles = useStyles();
	const toast = useAppToast();
	const [table, setTable] = useState("");
	const [loaded, setLoaded] = useState("");
	const [columnSchemaName, setColumnSchemaName] = useState("");
	const [label, setLabel] = useState("");
	const [targets, setTargets] = useState("");
	const [prefix, setPrefix] = useState("");

	const lookups = useQuery({
		queryKey: ["schema", "polymorphic", loaded],
		queryFn: () => (http ? polymorphicOperations(http).listPolymorphicLookups({ tableLogicalName: loaded }) : Promise.resolve([])),
		enabled: http !== null && loaded !== "",
		staleTime: 0,
		retry: false,
	});

	const create = useMutation({
		mutationFn: async () => {
			if (!http) {
				return;
			}
			await polymorphicOperations(http).createPolymorphicLookup({
				tableLogicalName: table.trim(),
				columnSchemaName: columnSchemaName.trim(),
				label: label.trim() || columnSchemaName.trim(),
				targetTableLogicalNames: targets
					.split(",")
					.map((entry) => entry.trim())
					.filter(Boolean),
				publisherPrefix: prefix.trim(),
				solutionUniqueName,
			});
		},
		onSuccess: () => {
			toast.success("Polymorphic lookup created");
			setLoaded(table.trim());
			void lookups.refetch();
		},
		onError: (error) => toast.error("Could not create the polymorphic lookup", error),
	});

	const columns: DataTableColumn<PolymorphicLookup>[] = [
		{ id: "column", label: "Column", width: 200, render: (lookup) => lookup.columnLogicalName, sortValue: (lookup) => lookup.columnLogicalName },
		{ id: "targets", label: "Target tables", width: 320, render: (lookup) => lookup.targets.map((target) => target.tableLogicalName).join(", ") },
		{ id: "count", label: "Targets", width: 90, render: (lookup) => String(lookup.targets.length), sortValue: (lookup) => lookup.targets.length },
	];

	const canCreate = http !== null && table.trim() !== "" && columnSchemaName.trim() !== "" && prefix.trim() !== "" && targets.trim() !== "";

	return (
		<>
			<MessageBar intent="warning" layout="multiline">
				<MessageBarBody>
					<MessageBarTitle>Creating only, for now</MessageBarTitle>
					This tool lists the polymorphic lookups on a table and creates new ones. Adding a target to an existing lookup, or removing one, is not
					implemented: the platform request that does it has not been confirmed, and guessing at a schema-deleting call is not worth the risk. See the
					research ticket in `.scratch/schema-bulk-edit/`.
				</MessageBarBody>
			</MessageBar>
			<FormRow>
				<Grow>
					<Field label="Table logical name">
						<Input value={table} placeholder="account" onChange={(_, data) => setTable(data.value)} />
					</Field>
				</Grow>
				<Button disabled={http === null || table.trim() === ""} onClick={() => setLoaded(table.trim())}>
					List lookups
				</Button>
			</FormRow>
			<DataTable
				items={lookups.data ?? []}
				columns={columns}
				getRowId={(lookup) => lookup.columnLogicalName}
				maxHeight="220px"
				autoFitColumns={false}
				emptyMessage={loaded === "" ? "Enter a table to list its polymorphic lookups." : "This table has no polymorphic lookups."}
			/>
			<FormRow>
				<Field label="New column schema name">
					<Input value={columnSchemaName} placeholder="new_RelatedTo" onChange={(_, data) => setColumnSchemaName(data.value)} />
				</Field>
				<Field label="Label">
					<Input value={label} placeholder="Related to" onChange={(_, data) => setLabel(data.value)} />
				</Field>
				<Field label="Publisher prefix">
					<Input value={prefix} placeholder="new" onChange={(_, data) => setPrefix(data.value)} />
				</Field>
			</FormRow>
			<FormRow>
				<Grow>
					<Field label="Target tables" hint="Comma separated logical names, for example account, contact, lead">
						<Input value={targets} placeholder="account, contact" onChange={(_, data) => setTargets(data.value)} />
					</Field>
				</Grow>
				<Button appearance="subtle" onClick={onPickSolution}>
					{solutionUniqueName ? `Solution: ${solutionUniqueName}` : "Choose a solution"}
				</Button>
				<Button appearance="primary" disabled={!canCreate || create.isPending} onClick={() => create.mutate()}>
					Create lookup
				</Button>
			</FormRow>
			<Text size={200} className={styles.caption}>
				A polymorphic lookup cannot be changed into a different set of targets after it is created, so check the target list before creating.
			</Text>
		</>
	);
};
