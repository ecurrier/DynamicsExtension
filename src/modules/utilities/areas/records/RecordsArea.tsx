import { Button, Field, makeStyles, MessageBar, MessageBarBody, MessageBarTitle, Text, tokens } from "@fluentui/react-components";
import { ChevronLeft20Regular, ChevronRight20Regular } from "@fluentui/react-icons";
import { useState } from "react";

import { pageKeys, usePageFetcher, usePageMutation, usePageQuery } from "@/messaging/client";
import { AreaContainer, DataTable, type DataTableColumn, FormRow, Grow, TableFilter, useAppToast, useSelectDialog, useTableFilter } from "@/shared/components";
import { useAsyncAction } from "@/shared/hooks";
import { useSessionStore } from "@/shared/stores";

import { displayValue, fetchXmlAttributes, type RecordSetRow, recordSetPosition, recordSetStep } from "../../lib";

const PAGE_SIZE = 250;

const useStyles = makeStyles({
	caption: { color: tokens.colorNeutralForeground3 },
	current: { backgroundColor: tokens.colorNeutralBackground1Selected },
	steps: { display: "flex", flexDirection: "column", gap: "2px" },
});

interface LoadedColumn {
	key: string;
	label: string;
}

export const RecordsArea = () => {
	const styles = useStyles();
	const toast = useAppToast();
	const select = useSelectDialog();
	const fetchPage = usePageFetcher();
	const tabId = useSessionStore((state) => state.tabId);
	const navigate = usePageMutation("utilities.navigateToRecord", {
		silent: true,
		invalidates: () => (tabId === null ? [] : [pageKeys.command(tabId, "utilities.getPageTarget", null)]),
	});
	const target = usePageQuery("utilities.getPageTarget", undefined);
	const [rows, setRows] = useState<RecordSetRow[]>([]);
	const [columns, setColumns] = useState<LoadedColumn[]>([]);
	const [viewName, setViewName] = useState<string | null>(null);
	const [entityName, setEntityName] = useState<string | null>(null);
	const [truncated, setTruncated] = useState(false);
	const [limit, setLimit] = useState(PAGE_SIZE);
	const pick = useAsyncAction("Could not load that view");
	const step = useAsyncAction("Could not open that record");
	const filter = useTableFilter(rows, (row) => [row.primary, ...Object.values(row.values)]);

	const load = (nextLimit: number, chosen?: { name: string; fetchXml: string }) =>
		pick.run(async () => {
			let view = chosen;
			if (!view) {
				const queries = await fetchPage("utilities.generateFetchXml", undefined, { fresh: true });
				const value = await select<{ name: string; fetchXml: string }>({
					title: "Choose a view",
					description: "Load the records from a view or subgrid on this page.",
					items: queries.map((query) => ({ key: query.name, label: query.name, value: query })),
					placeholder: "Select a view...",
					defaultToFirst: true,
				});
				if (!value) {
					return;
				}
				view = value;
			}
			const logicalName = /<entity name="([^"]+)"/.exec(view.fetchXml)?.[1] ?? "";
			const raw = await fetchPage("webapi.executeFetchXml", { fetchXml: view.fetchXml }, { fresh: true });
			const page = raw.slice(0, nextLimit);
			const idKey = `${logicalName}id`;
			const names = fetchXmlAttributes(view.fetchXml).filter((name) => name !== idKey);
			const labels = await fetchPage("codegen.getTableModel", { entityLogicalName: logicalName })
				.then((model) => new Map(model.columns.map((column) => [column.logicalName, column.displayName])))
				.catch(() => new Map<string, string>());
			const loadedColumns = names.map((name) => ({ key: name, label: labels.get(name) ?? name }));
			setColumns(loadedColumns);
			setEntityName(logicalName);
			setViewName(view.name);
			setRows(
				page.flatMap((record) => {
					const id = displayValue(record, idKey);
					if (!id) {
						return [];
					}
					const values = Object.fromEntries(loadedColumns.map((column) => [column.key, displayValue(record, column.key)]));
					return [{ id, primary: values[loadedColumns[0]?.key ?? ""] || id, values }];
				})
			);
			setTruncated(raw.length > nextLimit);
			setLimit(nextLimit);
			filter.setQuery("");
			if (page.length === 0) {
				toast.info("That view returned no records");
			}
		});

	const currentId = target.data?.recordId ?? null;
	const position = recordSetPosition(rows, currentId);

	const open = (row: RecordSetRow | null) =>
		step.run(async () => {
			if (row && entityName) {
				await navigate.mutateAsync({ entityLogicalName: entityName, recordId: row.id });
			}
		});

	const tableColumns: DataTableColumn<RecordSetRow>[] = columns.map((column, index) => ({
		id: column.key,
		label: column.label,
		width: index === 0 ? 220 : 160,
		render: (row) => row.values[column.key] ?? "",
		sortValue: (row) => row.values[column.key] ?? "",
	}));

	return (
		<AreaContainer fill>
			<MessageBar intent="info" layout="multiline">
				<MessageBarBody>
					<MessageBarTitle>Step through a view without going back to the list</MessageBarTitle>
					<span className={styles.steps}>
						<span>1. Choose a view or subgrid from the page you have open.</span>
						<span>2. Click a record here, or use Previous and Next, and the tab moves to it.</span>
					</span>
				</MessageBarBody>
			</MessageBar>
			<FormRow>
				<Button appearance="primary" disabled={pick.running} onClick={() => load(PAGE_SIZE)}>
					{viewName ? "Choose another view" : "Choose a view"}
				</Button>
				<Button
					icon={<ChevronLeft20Regular />}
					disabled={!position.hasPrevious || step.running}
					onClick={() => open(recordSetStep(rows, currentId, -1))}>
					Previous
				</Button>
				<Button icon={<ChevronRight20Regular />} disabled={rows.length === 0 || step.running} onClick={() => open(recordSetStep(rows, currentId, 1))}>
					Next
				</Button>
				<Grow>
					<Text size={200} className={styles.caption}>
						{viewName ? `${viewName} · ${position.caption}` : position.caption}
						{truncated ? ` · first ${limit} shown` : ""}
					</Text>
				</Grow>
				{truncated ? (
					<Button appearance="subtle" disabled={pick.running} onClick={() => load(limit + PAGE_SIZE, undefined)}>
						Load more
					</Button>
				) : null}
			</FormRow>
			{rows.length > 0 ? (
				<FormRow>
					<Grow>
						<TableFilter query={filter.query} onChange={filter.setQuery} shown={filter.shown} total={filter.total} placeholder="Filter records" />
					</Grow>
				</FormRow>
			) : null}
			<Field label="Records">
				<DataTable
					items={filter.filtered}
					columns={tableColumns}
					getRowId={(row) => row.id}
					maxHeight="520px"
					autoFitColumns={false}
					onRowClick={(row) => open(row)}
					rowClassName={(row) => (currentId && row.id.toLowerCase() === currentId.toLowerCase() ? styles.current : undefined)}
					emptyMessage={viewName ? "No records matched." : "Choose a view to load its records."}
				/>
			</Field>
		</AreaContainer>
	);
};
