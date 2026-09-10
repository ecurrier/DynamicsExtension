import { Button, Input, makeStyles, Text, tokens } from "@fluentui/react-components";
import { NumberSymbol20Regular, Search20Regular } from "@fluentui/react-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import {
	AreaContainer,
	AreaToolbar,
	DataTable,
	type DataTableColumn,
	EmptyState,
	FormStack,
	Grow,
	InfoTip,
	PageRequirementGate,
	useAppToast,
} from "@/shared/components";
import { type EntitySummary } from "@/shared/types";

import { InvestigateConnection } from "../../components";
import { useInvestigateGateway } from "../../hooks";
import { type CountRow, recordCountsViewModel } from "../../lib";
import { useInvestigateStore } from "../../store";

const useStyles = makeStyles({
	caption: {
		color: tokens.colorNeutralForeground3,
	},
	mono: {
		fontFamily: tokens.fontFamilyMonospace,
		fontSize: tokens.fontSizeBase200,
	},
	number: {
		fontVariantNumeric: "tabular-nums",
	},
});

export const RecordCountsArea = () => {
	const styles = useStyles();
	const toast = useAppToast();
	const connection = useInvestigateStore((state) => state.connection);
	const gateway = useInvestigateGateway(connection);
	const [filter, setFilter] = useState("");

	const tables = useQuery({
		queryKey: gateway.key("listTables"),
		queryFn: () => gateway.ops.listTables(),
		enabled: gateway.ready,
		staleTime: 300_000,
		retry: false,
	});

	const counts = useMutation({
		mutationFn: (rows: EntitySummary[]) => gateway.ops.getRecordCounts({ entityLogicalNames: rows.map((row) => row.logicalName) }),
		onError: (error) => toast.error("Could not read row counts", error),
	});

	const model = useMemo(() => recordCountsViewModel(tables.data ?? [], counts.data ?? null, filter), [tables.data, counts.data, filter]);

	const columns = useMemo<DataTableColumn<CountRow>[]>(
		() => [
			{
				id: "count",
				label: "Rows",
				width: 110,
				render: (row) => <span className={styles.number}>{row.count.toLocaleString()}</span>,
				sortValue: (row) => row.count,
			},
			{
				id: "display",
				label: "Table",
				width: 240,
				render: (row) => row.displayName,
				sortValue: (row) => row.displayName,
			},
			{
				id: "logical",
				label: "Logical name",
				width: 240,
				render: (row) => <span className={styles.mono}>{row.logicalName}</span>,
				sortValue: (row) => row.logicalName,
			},
		],
		[styles]
	);

	const body = (
		<FormStack fill>
			<AreaToolbar>
				<Grow>
					<Input
						contentBefore={<Search20Regular />}
						placeholder="Filter tables..."
						value={filter}
						onChange={(_, data) => setFilter(data.value)}
						disabled={model.rows.length === 0}
					/>
				</Grow>
				<Button
					appearance="primary"
					icon={<NumberSymbol20Regular />}
					disabled={!gateway.ready || tables.isLoading || counts.isPending}
					onClick={() => counts.mutate(tables.data ?? [])}>
					{counts.isPending ? "Counting..." : "Load row counts"}
				</Button>
			</AreaToolbar>
			{tables.isError ? <EmptyState intent="error" title={tables.error.message} /> : null}
			{model.rows.length === 0 ? (
				<EmptyState intent="info" title="Load row counts to see what is actually big in this environment.">
					The platform returns these from a snapshot taken within the last 24 hours, so a row you created a moment ago will not be reflected yet.
				</EmptyState>
			) : (
				<>
					<DataTable
						items={model.filtered}
						columns={columns}
						getRowId={(row) => row.logicalName}
						fill
						pageSize={100}
						emptyMessage={model.emptyMessage}
					/>
					<Text size={200} className={styles.caption}>
						{`${model.filtered.length} of ${model.rows.length} tables · ${model.total.toLocaleString()} rows in total`}
						{counts.data && counts.data.missing.length > 0 ? ` · ${counts.data.missing.length} table(s) returned no count` : ""}
					</Text>
					<Text size={200} className={styles.caption}>
						Counts come from a platform snapshot taken within the last 24 hours, not a live query.
						<InfoTip content="RetrieveTotalRecordCount is served from a daily snapshot. Treat these as sizing figures for scoping work, not as an up-to-the-second count." />
					</Text>
				</>
			)}
		</FormStack>
	);

	return (
		<AreaContainer fill>
			<InvestigateConnection />
			{gateway.mode === "page" ? <PageRequirementGate requires="model-driven-app">{body}</PageRequirementGate> : body}
		</AreaContainer>
	);
};
