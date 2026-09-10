import { Badge, Button, makeStyles, Tab, TabList, Text, tokens } from "@fluentui/react-components";
import { Filter20Regular } from "@fluentui/react-icons";
import { type ReactNode, useState } from "react";

import { CopyButton, EmptyState } from "@/shared/components";
import { modeLabel, operationTypeLabel } from "@/shared/lib";
import { type PluginTraceLog } from "@/shared/types";

import { formatDuration, formatTraceTime } from "./lib";
import { PluginStepCard } from "./PluginStepCard";
import { type GuidActions, TraceText } from "./TraceText";

const useStyles = makeStyles({
	root: {
		display: "flex",
		flexDirection: "column",
		gap: "8px",
		minHeight: 0,
		height: "100%",
	},
	header: {
		display: "flex",
		flexDirection: "column",
		gap: "2px",
	},
	subtitle: {
		color: tokens.colorNeutralForeground3,
	},
	body: {
		flex: 1,
		minHeight: 0,
		overflow: "auto",
	},
	summary: {
		display: "grid",
		gridTemplateColumns: "max-content 1fr",
		columnGap: "16px",
		rowGap: "6px",
		alignItems: "center",
		padding: "12px",
		backgroundColor: tokens.colorNeutralBackground1,
		border: `1px solid ${tokens.colorNeutralStroke2}`,
		borderRadius: tokens.borderRadiusMedium,
	},
	label: {
		color: tokens.colorNeutralForeground3,
	},
	value: {
		display: "flex",
		alignItems: "center",
		gap: "6px",
		minWidth: 0,
	},
	mono: {
		fontFamily: tokens.fontFamilyMonospace,
		fontSize: tokens.fontSizeBase200,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
	section: {
		display: "flex",
		flexDirection: "column",
		gap: "4px",
		marginBottom: "12px",
	},
	span: {
		gridColumn: "1 / -1",
	},
});

type DetailTab = "message" | "exception" | "configuration" | "summary";

interface TraceDetailsProps extends GuidActions {
	trace: PluginTraceLog | null;
}

export const TraceDetails = ({ trace, ...actions }: TraceDetailsProps) => {
	const styles = useStyles();
	const [tab, setTab] = useState<DetailTab>("message");

	if (!trace) {
		return (
			<div className={styles.root}>
				<EmptyState title="Select a trace">
					Click a row to read its message block, exception details, and configuration. Ids in the text are clickable.
				</EmptyState>
			</div>
		);
	}

	const idRow = (label: string, value: string | null): ReactNode => (
		<>
			<Text size={200} className={styles.label}>
				{label}
			</Text>
			<span className={styles.value}>
				<span className={styles.mono} title={value ?? undefined}>
					{value ?? "—"}
				</span>
				{value ? <CopyButton text={value} label={`Copy ${label.toLowerCase()}`} iconOnly appearance="subtle" /> : null}
			</span>
		</>
	);

	const textRow = (label: string, value: string): ReactNode => (
		<>
			<Text size={200} className={styles.label}>
				{label}
			</Text>
			<Text size={200}>{value}</Text>
		</>
	);

	return (
		<div className={styles.root}>
			<div className={styles.header}>
				<Text weight="semibold" title={trace.typeName}>
					{trace.typeName || "Unnamed plug-in"}
					{trace.exceptionDetails ? (
						<>
							{" "}
							<Badge appearance="tint" color="danger" size="small">
								Exception
							</Badge>
						</>
					) : null}
				</Text>
				<Text size={200} className={styles.subtitle}>
					{trace.messageName || "—"} on {trace.primaryEntity || "—"} · {formatTraceTime(trace.createdOn)} · {modeLabel(trace.mode)} · depth{" "}
					{trace.depth}
				</Text>
			</div>
			<TabList size="small" selectedValue={tab} onTabSelect={(_, data) => setTab(data.value as DetailTab)}>
				<Tab value="message">Message Block</Tab>
				<Tab value="exception">Exception</Tab>
				<Tab value="configuration">Configuration</Tab>
				<Tab value="summary">Summary</Tab>
			</TabList>
			<div className={styles.body}>
				{tab === "message" ? <TraceText text={trace.messageBlock} emptyLabel="No message block was written" {...actions} /> : null}
				{tab === "exception" ? <TraceText text={trace.exceptionDetails} emptyLabel="No exception recorded" {...actions} /> : null}
				{tab === "configuration" ? (
					<>
						<div className={styles.section}>
							<Text size={200} className={styles.label}>
								Unsecure configuration
							</Text>
							<TraceText text={trace.configuration} emptyLabel="No unsecure configuration" {...actions} />
						</div>
						<div className={styles.section}>
							<Text size={200} className={styles.label}>
								Secure configuration
							</Text>
							<TraceText text={trace.secureConfiguration} emptyLabel="No secure configuration" {...actions} />
						</div>
					</>
				) : null}
				{tab === "summary" ? (
					<div className={styles.summary}>
						{textRow("Operation", operationTypeLabel(trace.operationType))}
						{textRow("Mode", modeLabel(trace.mode))}
						{textRow("Depth", String(trace.depth))}
						{textRow("Created on", formatTraceTime(trace.createdOn))}
						{textRow("Execution start", formatTraceTime(trace.executionStart))}
						{textRow("Execution duration", formatDuration(trace.executionDurationMs))}
						{textRow("Constructor duration", formatDuration(trace.constructorDurationMs))}
						{idRow("Trace id", trace.id)}
						{idRow("Correlation id", trace.correlationId)}
						{idRow("Request id", trace.requestId)}
						{idRow("Plug-in step id", trace.pluginStepId)}
						{trace.pluginStepId ? (
							<div className={styles.span}>
								<PluginStepCard stepId={trace.pluginStepId} />
							</div>
						) : null}
						<span />
						<span>
							<Button
								size="small"
								icon={<Filter20Regular />}
								disabled={!trace.correlationId}
								onClick={() => trace.correlationId && actions.onShowCorrelation(trace.correlationId)}>
								Show correlation
							</Button>
						</span>
					</div>
				) : null}
			</div>
		</div>
	);
};
