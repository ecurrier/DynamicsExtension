import { Button, makeStyles, Spinner, Text, tokens } from "@fluentui/react-components";
import { Add20Regular } from "@fluentui/react-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { usePageQuery } from "@/messaging/client";
import { useAppToast, useConfirm } from "@/shared/components";
import { type PolymorphicLookup, type PolymorphicTarget } from "@/shared/types";

import { LookupDetail } from "./LookupDetail";
import { LookupList } from "./LookupList";
import { type NewLookupDraft, NewLookupForm } from "./NewLookupForm";
import { usePanelStyles } from "./panelStyles";
import { type SchemaSolution } from "./useSchemaSolution";
import { type SchemaGateway } from "./useSchemaToolsBootstrap";

const useStyles = makeStyles({
	container: {
		containerType: "inline-size",
		height: "100%",
	},
	layout: {
		display: "grid",
		gridTemplateColumns: "320px minmax(0, 1fr)",
		columnGap: tokens.spacingHorizontalL,
		boxSizing: "border-box",
		height: "100%",
		padding: tokens.spacingHorizontalL,
		"@container (max-width: 760px)": {
			gridTemplateColumns: "minmax(0, 1fr)",
			rowGap: tokens.spacingVerticalL,
			height: "auto",
		},
	},
	detail: {
		display: "flex",
		flexDirection: "column",
		minWidth: 0,
		minHeight: 0,
		"& > *": {
			flexGrow: 1,
		},
	},
	loading: {
		padding: tokens.spacingVerticalXXXL,
	},
});

interface AddTargetRequest {
	lookup: PolymorphicLookup;
	targetTable: string;
}

interface PolymorphicLookupsProps {
	gateway: SchemaGateway;
	solution: SchemaSolution;
}

export const PolymorphicLookups = ({ gateway, solution }: PolymorphicLookupsProps) => {
	const styles = useStyles();
	const panel = usePanelStyles();
	const toast = useAppToast();
	const confirm = useConfirm();
	const [table, setTable] = useState("");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [creating, setCreating] = useState(false);

	const tablesQuery = usePageQuery("investigate.listTables", undefined);
	const tables = useMemo(() => tablesQuery.data ?? [], [tablesQuery.data]);
	const lookups = useQuery({
		queryKey: gateway.key("listPolymorphicLookups", { tableLogicalName: table }),
		queryFn: () => gateway.ops.listPolymorphicLookups({ tableLogicalName: table }),
		enabled: gateway.ready && table !== "",
		staleTime: 0,
		retry: false,
	});
	const list = useMemo(() => lookups.data ?? [], [lookups.data]);
	const current = creating ? null : (list.find((lookup) => lookup.columnLogicalName === selectedId) ?? list[0] ?? null);
	const tableLabel = tables.find((entity) => entity.logicalName === table)?.displayName || table;
	const nameOf = (logicalName: string) => tables.find((entity) => entity.logicalName === logicalName)?.displayName || logicalName;
	const primaryIdOf = (logicalName: string) => tables.find((entity) => entity.logicalName === logicalName)?.primaryIdAttribute ?? `${logicalName}id`;

	const create = useMutation({
		mutationFn: (draft: NewLookupDraft) =>
			gateway.ops.createPolymorphicLookup({
				tableLogicalName: table,
				columnSchemaName: `${solution.prefix}_${draft.schemaName}`,
				label: draft.label,
				...(draft.description ? { description: draft.description } : {}),
				targetTableLogicalNames: draft.targets,
				solutionUniqueName: solution.uniqueName,
			}),
		onSuccess: (_, draft) => {
			toast.success("Polymorphic lookup created");
			setSelectedId(`${solution.prefix}_${draft.schemaName}`.toLowerCase());
			setCreating(false);
			void lookups.refetch();
		},
		onError: (error) => toast.error("Could not create the polymorphic lookup", error),
	});

	const addTarget = useMutation({
		mutationFn: ({ lookup, targetTable }: AddTargetRequest) =>
			gateway.ops.addPolymorphicTarget({
				tableLogicalName: lookup.tableLogicalName,
				columnSchemaName: lookup.columnLogicalName,
				columnLogicalName: lookup.columnLogicalName,
				label: lookup.label ?? lookup.columnLogicalName,
				targetTableLogicalName: targetTable,
				targetPrimaryIdAttribute: primaryIdOf(targetTable),
				solutionUniqueName: solution.uniqueName,
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

	const chooseTable = (next: string) => {
		setTable(next);
		setSelectedId(null);
		setCreating(false);
	};

	const addTo = async (lookup: PolymorphicLookup, targetTable: string): Promise<boolean> => {
		try {
			await addTarget.mutateAsync({ lookup, targetTable });
			return true;
		} catch {
			return false;
		}
	};

	const confirmRemove = async (target: PolymorphicTarget) => {
		const ok = await confirm({
			title: `Remove ${nameOf(target.tableLogicalName)}?`,
			content:
				"This deletes the relationship behind that target. Records already pointing at a row in that table keep their stored id, but it will no longer resolve. This cannot be undone from here.",
			confirmLabel: "Remove target",
		});
		if (ok) {
			removeTarget.mutate(target);
		}
	};

	const detail = () => {
		if (table === "") {
			return (
				<div className={panel.panel}>
					<div className={panel.message}>
						<Text as="h2" size={500} weight="semibold" className={panel.heading}>
							Polymorphic lookups
						</Text>
						<Text className={panel.muted}>
							A polymorphic lookup points at a row in any one of several tables. The maker portal can't create or change them, so this is where
							you do it.
						</Text>
						<Text className={panel.muted}>Choose a table to see its lookups, add or remove their target tables, or create a new one.</Text>
					</div>
				</div>
			);
		}
		if (creating) {
			return (
				<NewLookupForm
					tableLogicalName={table}
					tableLabel={tableLabel}
					tables={tables}
					prefix={solution.prefix}
					solutionName={solution.name}
					creating={create.isPending}
					onCreate={(draft) => create.mutate(draft)}
					onCancel={() => setCreating(false)}
				/>
			);
		}
		if (current) {
			return (
				<LookupDetail
					key={current.columnLogicalName}
					lookup={current}
					tableLabel={tableLabel}
					tables={tables}
					solutionName={solution.name}
					adding={addTarget.isPending}
					removing={removeTarget.isPending}
					onAddTarget={(targetTable) => addTo(current, targetTable)}
					onRemoveTarget={(target) => void confirmRemove(target)}
				/>
			);
		}
		if (lookups.isLoading) {
			return (
				<div className={panel.panel}>
					<Spinner className={styles.loading} label="Reading lookups..." />
				</div>
			);
		}
		return (
			<div className={panel.panel}>
				<div className={panel.message}>
					<Text weight="semibold">{tableLabel} has no polymorphic lookups yet</Text>
					<Text size={200} className={panel.muted}>
						Create one to let a single column point at rows in several tables.
					</Text>
					<Button icon={<Add20Regular />} onClick={() => setCreating(true)}>
						New polymorphic lookup
					</Button>
				</div>
			</div>
		);
	};

	return (
		<div className={styles.container}>
			<div className={styles.layout}>
				<LookupList
					tables={tables}
					tablesLoading={tablesQuery.isLoading}
					table={table}
					onTableChange={chooseTable}
					lookups={list}
					loading={lookups.isFetching}
					error={lookups.error}
					selectedId={current?.columnLogicalName ?? null}
					creating={creating}
					onSelect={(id) => {
						setSelectedId(id);
						setCreating(false);
					}}
					onNew={() => setCreating(true)}
				/>
				<div className={styles.detail}>{detail()}</div>
			</div>
		</div>
	);
};
