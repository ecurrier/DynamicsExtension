import { AccordionHeader, Badge, Button, Input, Link, makeStyles, Text, tokens, Tooltip } from "@fluentui/react-components";
import { ArrowClockwise20Regular, Search20Regular } from "@fluentui/react-icons";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import { usePluginStepsStore } from "@/modules/pluginsteps";
import {
	AreaContainer,
	AreaToolbar,
	DataTable,
	type DataTableColumn,
	EmptyState,
	FillAccordion,
	FillAccordionItem,
	FillAccordionPanel,
	FormStack,
	Grow,
	PageRequirementGate,
} from "@/shared/components";
import { useNavigationStore } from "@/shared/stores";
import { AUTOMATION_KIND_LABELS, type AutomationItem, type AutomationRun, type TriggerRegistration } from "@/shared/types";

import { InvestigateConnection, TablePicker } from "../../components";
import { useInvestigateGateway } from "../../hooks";
import { automationMatches, describeMessages } from "../../lib";
import { useInvestigateStore } from "../../store";

const useStyles = makeStyles({
	caption: {
		color: tokens.colorNeutralForeground3,
	},
	mono: {
		fontFamily: tokens.fontFamilyMonospace,
		fontSize: tokens.fontSizeBase200,
	},
});

const KIND_COLORS: Record<string, "brand" | "informative" | "success" | "warning" | "severe"> = {
	plugin: "brand",
	flow: "success",
	workflow: "informative",
	businessrule: "warning",
	bpf: "severe",
};

export const AutomationArea = () => {
	const styles = useStyles();
	const connection = useInvestigateStore((state) => state.connection);
	const table = useInvestigateStore((state) => state.table);
	const gateway = useInvestigateGateway(connection);
	const navigate = useNavigationStore((state) => state.navigate);
	const focusStep = usePluginStepsStore((state) => state.focusStep);
	const [filter, setFilter] = useState("");

	const openPluginStep = useCallback(
		(item: AutomationItem) => {
			focusStep({ id: item.id, name: item.name }, connection);
			navigate("pluginsteps.steps");
		},
		[focusStep, navigate, connection]
	);

	const automation = useQuery({
		queryKey: gateway.key("getTableAutomation", { entityLogicalName: table }),
		queryFn: () => gateway.ops.getTableAutomation({ entityLogicalName: table }),
		enabled: gateway.ready && table.trim().length > 0,
		staleTime: 60_000,
		retry: false,
	});

	const items = useMemo(() => automation.data?.items ?? [], [automation.data]);
	const filtered = useMemo(() => items.filter((item) => automationMatches(item, filter)), [items, filter]);

	const columns = useMemo<DataTableColumn<AutomationItem>[]>(
		() => [
			{
				id: "name",
				label: "Name",
				width: 220,
				render: (item) =>
					item.kind === "plugin" ? (
						<Link as="button" title={`Open ${item.name} in Plugin Steps`} onClick={() => openPluginStep(item)}>
							{item.name}
						</Link>
					) : (
						<span title={item.description ?? undefined}>{item.name}</span>
					),
				sortValue: (item) => item.name,
			},
			{
				id: "kind",
				label: "Type",
				width: 130,
				render: (item) => (
					<Badge appearance="tint" size="small" color={KIND_COLORS[item.kind] ?? "informative"}>
						{AUTOMATION_KIND_LABELS[item.kind]}
					</Badge>
				),
				sortValue: (item) => item.kind,
			},
			{
				id: "messages",
				label: "Runs on",
				width: 140,
				render: (item) => describeMessages(item.messages),
				sortValue: (item) => item.messages.join(","),
			},
			{
				id: "stage",
				label: "Stage",
				width: 120,
				render: (item) => item.stageLabel ?? "—",
				sortValue: (item) => item.stage ?? 100,
			},
			{
				id: "mode",
				label: "Mode",
				width: 80,
				render: (item) => (item.mode === null ? "—" : item.mode === "sync" ? "Sync" : "Async"),
				sortValue: (item) => item.mode ?? "",
			},
			{
				id: "rank",
				label: "Order",
				width: 70,
				render: (item) => (item.rank === null ? "—" : String(item.rank)),
				sortValue: (item) => item.rank ?? 0,
			},
			{
				id: "state",
				label: "State",
				width: 90,
				render: (item) => (
					<Badge appearance="tint" size="small" color={item.enabled ? "success" : "danger"}>
						{item.enabled ? "On" : "Off"}
					</Badge>
				),
				sortValue: (item) => (item.enabled ? 1 : 0),
			},
			{
				id: "filters",
				label: "Filtering columns",
				width: 200,
				render: (item) => (
					<span className={styles.mono} title={item.filteringAttributes.join(", ")}>
						{item.filteringAttributes.length > 0 ? item.filteringAttributes.join(", ") : "—"}
					</span>
				),
				sortValue: (item) => item.filteringAttributes.length,
			},
			{
				id: "owner",
				label: "Plug-in type",
				width: 220,
				render: (item) => (
					<span className={styles.mono} title={item.owner ?? undefined}>
						{item.owner ?? "—"}
					</span>
				),
				sortValue: (item) => item.owner,
			},
		],
		[styles, openPluginStep]
	);

	const registrationColumns = useMemo<DataTableColumn<TriggerRegistration>[]>(
		() => [
			{
				id: "message",
				label: "Message",
				width: 120,
				render: (row) => row.message ?? "—",
				sortValue: (row) => row.message,
			},
			{
				id: "filters",
				label: "Filtering columns",
				width: 220,
				render: (row) => <span className={styles.mono}>{row.filteringAttributes ?? "—"}</span>,
				sortValue: (row) => row.filteringAttributes,
			},
			{
				id: "name",
				label: "Registration",
				width: 260,
				render: (row) => row.name ?? row.id,
				sortValue: (row) => row.name,
			},
		],
		[styles]
	);

	const runColumns = useMemo<DataTableColumn<AutomationRun>[]>(
		() => [
			{ id: "name", label: "Job", width: 220, render: (row) => row.name, sortValue: (row) => row.name },
			{
				id: "status",
				label: "Status",
				width: 120,
				render: (row) => (
					<Badge appearance="tint" size="small" color={row.failed ? "danger" : "informative"}>
						{row.statusLabel}
					</Badge>
				),
				sortValue: (row) => row.statusLabel,
			},
			{
				id: "started",
				label: "Started",
				width: 160,
				render: (row) => (row.startedOn ? new Date(row.startedOn).toLocaleString() : "—"),
				sortValue: (row) => row.startedOn,
			},
			{
				id: "message",
				label: "Message",
				width: 260,
				render: (row) => <span title={row.message ?? undefined}>{row.message ?? "—"}</span>,
				sortValue: (row) => row.message,
			},
		],
		[]
	);

	const data = automation.data;
	const body = (
		<FormStack fill>
			<TablePicker />
			<AreaToolbar>
				<Grow>
					<Input
						contentBefore={<Search20Regular />}
						placeholder="Filter by name, type, message, or column..."
						value={filter}
						onChange={(_, input) => setFilter(input.value)}
					/>
				</Grow>
				<Tooltip content="Reload" relationship="label">
					<Button
						icon={<ArrowClockwise20Regular />}
						disabled={!gateway.ready || !table || automation.isFetching}
						onClick={() => void automation.refetch()}
						aria-label="Reload automation"
					/>
				</Tooltip>
			</AreaToolbar>
			{!table ? <EmptyState intent="info" title="Choose a table to see everything registered against it." /> : null}
			{automation.isError ? <EmptyState intent="error" title={automation.error.message} /> : null}
			{table && data ? (
				<>
					<DataTable
						items={filtered}
						columns={columns}
						getRowId={(item) => item.id}
						fill
						minHeight="160px"
						emptyMessage={automation.isFetching ? "Loading..." : "Nothing is registered against this table"}
					/>
					<Text size={200} className={styles.caption}>
						{`${filtered.length} of ${items.length} registrations · ordered by stage, then execution order`}
					</Text>
					<FillAccordion collapsible multiple>
						<FillAccordionItem value="registrations">
							<AccordionHeader>{`Cloud flow trigger registrations (${data.registrations.length})`}</AccordionHeader>
							<FillAccordionPanel>
								<FormStack fill>
									<Text size={200} className={styles.caption}>
										A Dataverse-triggered cloud flow needs a row here. A flow with no registration will not fire, and duplicates make it
										fire more than once.
									</Text>
									{data.registrationsUnavailable ? (
										<EmptyState intent="warning" title={data.registrationsUnavailable} />
									) : (
										<DataTable
											items={data.registrations}
											columns={registrationColumns}
											getRowId={(row) => row.id}
											fill
											emptyMessage="No trigger registrations for this table"
										/>
									)}
								</FormStack>
							</FillAccordionPanel>
						</FillAccordionItem>
						<FillAccordionItem value="runs">
							<AccordionHeader>{`Recent system jobs (${data.recentRuns.length})`}</AccordionHeader>
							<FillAccordionPanel>
								{data.runsUnavailable ? (
									<EmptyState intent="warning" title={data.runsUnavailable} />
								) : (
									<DataTable
										items={data.recentRuns}
										columns={runColumns}
										getRowId={(row) => row.id}
										fill
										emptyMessage="No background jobs have run for this table recently"
									/>
								)}
							</FillAccordionPanel>
						</FillAccordionItem>
					</FillAccordion>
				</>
			) : null}
		</FormStack>
	);

	return (
		<AreaContainer fill>
			<InvestigateConnection />
			{gateway.mode === "page" ? <PageRequirementGate requires="model-driven-app">{body}</PageRequirementGate> : body}
		</AreaContainer>
	);
};
