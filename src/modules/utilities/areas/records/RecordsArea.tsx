import { Button, Field, makeStyles, Text, tokens } from "@fluentui/react-components";
import { ChevronLeft20Regular, ChevronRight20Regular } from "@fluentui/react-icons";
import { useState } from "react";

import { pageKeys, usePageFetcher, usePageMutation, usePageQuery } from "@/messaging/client";
import { AreaContainer, DataTable, type DataTableColumn, FormRow, Grow, useAppToast, useSelectDialog } from "@/shared/components";
import { useAsyncAction } from "@/shared/hooks";
import { useSessionStore } from "@/shared/stores";

import { type RecordSetRow, recordSetColumns, recordSetPosition, recordSetRows, recordSetStep } from "../../lib";

const PAGE_SIZE = 250;

const useStyles = makeStyles({ caption: { color: tokens.colorNeutralForeground3 }, current: { backgroundColor: tokens.colorNeutralBackground1Selected } });

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
	const [columns, setColumns] = useState<string[]>([]);
	const [entityName, setEntityName] = useState<string | null>(null);
	const [truncated, setTruncated] = useState(false);
	const [limit, setLimit] = useState(PAGE_SIZE);
	const pick = useAsyncAction("Could not load that view");
	const step = useAsyncAction("Could not open that record");

	const load = (nextLimit: number, fetchXml?: string) =>
		pick.run(async () => {
			let chosen = fetchXml;
			if (!chosen) {
				const queries = await fetchPage("utilities.generateFetchXml", undefined, { fresh: true });
				const value = await select<string>({
					title: "Select a view",
					description: "Load the records from a view or subgrid on this page.",
					items: queries.map((query) => ({ key: query.name, label: query.name, value: query.fetchXml })),
					placeholder: "Select a view...",
				});
				if (!value) {
					return;
				}
				chosen = value;
			}
			const raw = await fetchPage("webapi.executeFetchXml", { fetchXml: chosen }, { fresh: true });
			const name = /<entity name="([^"]+)"/.exec(chosen)?.[1] ?? "";
			const loaded = recordSetRows(raw.slice(0, nextLimit), name);
			setEntityName(name);
			setColumns(recordSetColumns(raw.slice(0, nextLimit)).filter((key) => key !== `${name}id`));
			setRows(loaded);
			setTruncated(raw.length > nextLimit);
			setLimit(nextLimit);
			if (loaded.length === 0) {
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

	const tableColumns: DataTableColumn<RecordSetRow>[] = [
		{ id: "primary", label: "Record", width: 220, render: (row) => row.primary, sortValue: (row) => row.primary },
		...columns.map<DataTableColumn<RecordSetRow>>((key) => ({
			id: key,
			label: key,
			width: 160,
			render: (row) => row.values[key] ?? "",
			sortValue: (row) => row.values[key] ?? "",
		})),
	];

	return (
		<AreaContainer fill>
			<FormRow>
				<Button appearance="primary" disabled={pick.running} onClick={() => load(PAGE_SIZE)}>
					Choose a view
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
						{position.caption}
						{truncated ? ` · first ${limit} shown` : ""}
					</Text>
				</Grow>
				{truncated ? (
					<Button appearance="subtle" disabled={pick.running} onClick={() => load(limit + PAGE_SIZE)}>
						Load more
					</Button>
				) : null}
			</FormRow>
			<Field label="Records" hint="Click a record to open it in the tab Power Tools is reading.">
				<DataTable
					items={rows}
					columns={tableColumns}
					getRowId={(row) => row.id}
					maxHeight="520px"
					autoFitColumns={false}
					onRowClick={(row) => open(row)}
					rowClassName={(row) => (currentId && row.id.toLowerCase() === currentId.toLowerCase() ? styles.current : undefined)}
					emptyMessage="Choose a view to load its records."
				/>
			</Field>
		</AreaContainer>
	);
};
