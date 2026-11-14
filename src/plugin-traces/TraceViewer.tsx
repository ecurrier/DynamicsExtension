import {
	Button,
	Dropdown,
	Field,
	makeStyles,
	mergeClasses,
	MessageBar,
	MessageBarBody,
	Option,
	Switch,
	type TableRowId,
	Text,
	Title3,
	tokens,
	Tooltip,
} from "@fluentui/react-components";
import { ArrowClockwise20Regular, Delete20Regular } from "@fluentui/react-icons";
import { useMemo, useState } from "react";

import { pageKeys, usePageMutation, usePageQuery } from "@/messaging/client";
import { useExtensionSettings } from "@/modules/settings";
import { DataTable, FailureBanner, HostAccessBanner, InfoTip, SearchField, useAppToast, useConfirm } from "@/shared/components";
import { useSessionStore } from "@/shared/stores";
import {
	DEFAULT_TRACE_QUERY,
	TRACE_LOG_SETTING_LABELS,
	TRACE_LOG_SETTINGS,
	type TraceLogSetting,
	type TraceQuery,
	TRACE_TOPS,
	type TraceTop,
	type TraceViewerLaunch,
} from "@/shared/types";

import { shownTraceColumns, traceMatches } from "./lib";
import { TraceColumnPicker } from "./TraceColumnPicker";
import { useTraceColumns } from "./traceColumns";
import { TraceDetails } from "./TraceDetails";
import { TraceFilters } from "./TraceFilters";

const ACCESS_REASON = "The viewer reads traces through this tab, and can only reconnect after the page navigates with access to the site.";

const AUTO_REFRESH_MS = 10_000;

const QUICK_FILTER_HELP =
	"Narrows the traces already loaded, without querying the server. Matches text in Type Name, Message, Entity, Correlation id, Request id, Plug-in Step id, Exception details, and Message block.";

const useStyles = makeStyles({
	root: {
		// A column, not four declared rows: a banner or an error used to add a fifth row and
		// steal the split's 1fr.
		display: "flex",
		flexDirection: "column",
		gap: "12px",
		padding: "16px 24px 24px",
		height: "100%",
		boxSizing: "border-box",
		backgroundColor: tokens.colorNeutralBackground2,
	},
	header: {
		display: "flex",
		alignItems: "center",
		gap: "16px",
	},
	subtitle: {
		color: tokens.colorNeutralForeground3,
	},
	grow: {
		flex: 1,
	},
	toolbar: {
		display: "flex",
		alignItems: "center",
		flexWrap: "wrap",
		gap: "12px",
	},
	quick: {
		display: "flex",
		alignItems: "center",
		flex: "1 1 240px",
		minWidth: "200px",
	},
	split: {
		display: "grid",
		// One column until a row is selected: an empty detail pane held two fifths of the width.
		gridTemplateColumns: "minmax(0, 1fr)",
		gap: "16px",
		flex: 1,
		minHeight: 0,
	},
	withDetail: {
		gridTemplateColumns: "minmax(0, 3fr) minmax(360px, 2fr)",
	},
	table: {
		display: "flex",
		flexDirection: "column",
		minWidth: 0,
		minHeight: 0,
	},
	exceptionRow: {
		backgroundColor: tokens.colorPaletteRedBackground1,
	},
	activeRow: {
		outline: `2px solid ${tokens.colorBrandStroke1}`,
		outlineOffset: "-2px",
	},
});

interface TraceViewerProps {
	launch: TraceViewerLaunch;
}

export const TraceViewer = ({ launch }: TraceViewerProps) => {
	const styles = useStyles();
	const toast = useAppToast();
	const confirm = useConfirm();
	const tabId = useSessionStore((state) => state.tabId);
	const { settings, setSetting } = useExtensionSettings();
	const [draft, setDraft] = useState<TraceQuery>(DEFAULT_TRACE_QUERY);
	const [applied, setApplied] = useState<TraceQuery>(DEFAULT_TRACE_QUERY);
	const [quickFilter, setQuickFilter] = useState("");
	const [autoRefresh, setAutoRefresh] = useState(false);
	const [selectedIds, setSelectedIds] = useState<Set<TableRowId>>(() => new Set());
	const [detailId, setDetailId] = useState<string | null>(null);
	const [highlightedGuid, setHighlightedGuid] = useState<string | null>(null);

	const traces = usePageQuery("traces.query", applied, { refetchInterval: autoRefresh ? AUTO_REFRESH_MS : false });
	const setting = usePageQuery("traces.getSetting", undefined);
	const updateSetting = usePageMutation("traces.setSetting", {
		invalidates: () => (tabId === null ? [] : [pageKeys.command(tabId, "traces.getSetting", null)]),
		onSuccess: (_, args) => toast.success(`Plug-in trace logging set to ${TRACE_LOG_SETTING_LABELS[args.value]}`),
	});
	const remove = usePageMutation("traces.delete", {
		invalidates: () => (tabId === null ? [] : [pageKeys.command(tabId, "traces.query", applied)]),
		onSuccess: (result) => {
			toast.success(`Deleted ${result.deleted} trace log${result.deleted === 1 ? "" : "s"}`);
			setSelectedIds(new Set());
			setDetailId(null);
		},
	});

	const rows = useMemo(() => traces.data ?? [], [traces.data]);
	const filtered = useMemo(() => rows.filter((row) => traceMatches(row, quickFilter)), [rows, quickFilter]);
	const correlationIds = useMemo(() => new Set(rows.flatMap((row) => (row.correlationId ? [row.correlationId] : []))), [rows]);
	const detail = rows.find((row) => row.id === detailId) ?? null;
	const shownColumns = useMemo(() => shownTraceColumns(settings.traceColumns), [settings.traceColumns]);
	const columns = useTraceColumns(highlightedGuid, shownColumns);

	const showCorrelation = (correlationId: string) => {
		const next = { ...draft, correlationId };
		setDraft(next);
		setApplied(next);
		setHighlightedGuid(correlationId);
	};

	const onDelete = async () => {
		const ids = [...selectedIds].map(String);
		if (ids.length === 0) {
			return;
		}
		const confirmed = await confirm({
			title: "Delete trace logs?",
			content: (
				<p>
					{ids.length} trace log{ids.length === 1 ? "" : "s"} will be deleted from {launch.environmentName}. This cannot be undone.
				</p>
			),
			confirmLabel: "Delete",
		});
		if (confirmed) {
			remove.mutate({ ids });
		}
	};

	const settingLabel = setting.data === undefined ? "" : TRACE_LOG_SETTING_LABELS[setting.data];
	const limitReached = rows.length >= applied.top;

	return (
		<div className={styles.root}>
			<div className={styles.header}>
				<Title3>Plugin Trace Logs</Title3>
				<Text size={200} className={styles.subtitle}>
					{launch.environmentName} · {launch.orgOrigin}
				</Text>
				<div className={styles.grow} />
				<Field label="Trace logging" orientation="horizontal">
					<Dropdown
						value={setting.isLoading ? "Loading..." : settingLabel}
						selectedOptions={setting.data === undefined ? [] : [String(setting.data)]}
						disabled={setting.data === undefined || updateSetting.isPending}
						style={{ minWidth: "140px" }}
						onOptionSelect={(_, data) => {
							if (data.optionValue) {
								updateSetting.mutate({ value: Number(data.optionValue) as TraceLogSetting });
							}
						}}>
						{TRACE_LOG_SETTINGS.map((value) => (
							<Option key={value} value={String(value)} text={TRACE_LOG_SETTING_LABELS[value]}>
								{TRACE_LOG_SETTING_LABELS[value]}
							</Option>
						))}
					</Dropdown>
				</Field>
			</div>
			{/* The launcher Area used to ask for site access before opening the viewer. The viewer now
			    asks for itself, so a direct launch from the navigation drawer cannot skip it. */}
			<HostAccessBanner origin={launch.orgOrigin} reason={ACCESS_REASON} />
			<FailureBanner />
			<div className={styles.toolbar}>
				<div className={styles.quick}>
					<SearchField
						value={quickFilter}
						onChange={setQuickFilter}
						placeholder="Search loaded traces"
						aria-label="Search loaded traces"
						hint={<InfoTip content={QUICK_FILTER_HELP} />}
					/>
				</div>
				<Text size={200} className={styles.subtitle}>
					{traces.isFetching ? "Loading..." : `${rows.length} loaded`}
					{filtered.length !== rows.length ? `, ${filtered.length} shown` : ""}
					{limitReached ? ` (limit of ${applied.top} reached, narrow the filters or raise Top)` : ""}
				</Text>
				<div className={styles.grow} />
				<TraceFilters draft={draft} loading={traces.isFetching} onChange={setDraft} onApply={() => setApplied(draft)} />
				<Field label="Top" orientation="horizontal">
					<Dropdown
						value={String(applied.top)}
						selectedOptions={[String(applied.top)]}
						style={{ minWidth: "90px" }}
						onOptionSelect={(_, data) => {
							if (data.optionValue) {
								const top = Number(data.optionValue) as TraceTop;
								setDraft({ ...draft, top });
								setApplied({ ...applied, top });
							}
						}}>
						{TRACE_TOPS.map((top) => (
							<Option key={top} value={String(top)} text={String(top)}>
								{top}
							</Option>
						))}
					</Dropdown>
				</Field>
				<Switch label="Auto-refresh" checked={autoRefresh} onChange={(_, data) => setAutoRefresh(data.checked)} />
				<Tooltip content="Reload with the current filters" relationship="label">
					<Button icon={<ArrowClockwise20Regular />} disabled={traces.isFetching} onClick={() => void traces.refetch()} aria-label="Refresh" />
				</Tooltip>
				<TraceColumnPicker shown={shownColumns} onChange={(columns) => void setSetting("traceColumns", columns)} />
				<Tooltip content="Delete the selected trace logs" relationship="label">
					<Button icon={<Delete20Regular />} disabled={selectedIds.size === 0 || remove.isPending} onClick={() => void onDelete()}>
						{remove.isPending ? "Deleting..." : `Delete (${selectedIds.size})`}
					</Button>
				</Tooltip>
			</div>
			{traces.isError ? (
				<MessageBar intent="error">
					<MessageBarBody>{traces.error.message}</MessageBarBody>
				</MessageBar>
			) : null}
			<div className={mergeClasses(styles.split, detail !== null && styles.withDetail)}>
				<div className={styles.table}>
					<DataTable
						items={filtered}
						columns={columns}
						getRowId={(row) => row.id}
						pageSize={100}
						fill
						selectionMode="multiselect"
						autoFitColumns={false}
						selectedIds={selectedIds}
						onSelectionChange={setSelectedIds}
						onRowClick={(row) => setDetailId(row.id)}
						rowClassName={(row) => mergeClasses(row.exceptionDetails ? styles.exceptionRow : undefined, row.id === detailId && styles.activeRow)}
						emptyMessage={traces.isFetching ? "Loading trace logs..." : "No trace logs match the current filters"}
					/>
				</div>
				{detail ? (
					<TraceDetails
						trace={detail}
						highlightedGuid={highlightedGuid}
						correlationIds={correlationIds}
						onHighlight={setHighlightedGuid}
						onShowCorrelation={showCorrelation}
					/>
				) : null}
			</div>
		</div>
	);
};
