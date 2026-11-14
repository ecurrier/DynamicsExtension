import { makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import { useMemo } from "react";

import { type DataTableColumn, TextBadge } from "@/shared/components";
import { modeLabel } from "@/shared/lib";
import { type PluginTraceLog } from "@/shared/types";

import { formatDuration, formatTraceTime, shortId } from "./lib";

const useStyles = makeStyles({
	mono: {
		fontFamily: tokens.fontFamilyMonospace,
		fontSize: tokens.fontSizeBase200,
	},
	highlight: {
		backgroundColor: tokens.colorPaletteYellowBackground2,
		color: tokens.colorNeutralForeground1,
		borderRadius: tokens.borderRadiusSmall,
		padding: "0 3px",
		// Not colour alone: the mark must survive a scroll and a colour-blind reader.
		fontWeight: tokens.fontWeightBold,
		textDecorationLine: "underline",
	},
});

/** The label of every column the table can show, so the Columns picker and the table agree. */
export const TRACE_COLUMN_LABELS = {
	createdOn: "Created On",
	typeName: "Type Name",
	messageName: "Message",
	primaryEntity: "Entity",
	mode: "Mode",
	depth: "Depth",
	duration: "Duration",
	exception: "Exception",
	correlation: "Correlation",
	pluginStep: "Step",
};

export const useTraceColumns = (highlightedGuid: string | null, shown: string[]): DataTableColumn<PluginTraceLog>[] => {
	const styles = useStyles();
	return useMemo(() => {
		const all: DataTableColumn<PluginTraceLog>[] = [
			{
				id: "createdOn",
				label: TRACE_COLUMN_LABELS.createdOn,
				width: 150,
				render: (trace) => formatTraceTime(trace.createdOn),
				sortValue: (trace) => trace.createdOn,
			},
			{
				id: "typeName",
				label: TRACE_COLUMN_LABELS.typeName,
				width: 260,
				render: (trace) => (
					<span style={{ paddingLeft: `${Math.max(0, trace.depth - 1) * 12}px` }} title={trace.typeName}>
						{trace.typeName}
					</span>
				),
				sortValue: (trace) => trace.typeName,
			},
			{
				id: "messageName",
				label: TRACE_COLUMN_LABELS.messageName,
				width: 100,
				render: (trace) => trace.messageName,
				sortValue: (trace) => trace.messageName,
			},
			{
				id: "primaryEntity",
				label: TRACE_COLUMN_LABELS.primaryEntity,
				width: 110,
				render: (trace) => trace.primaryEntity,
				sortValue: (trace) => trace.primaryEntity,
			},
			{
				id: "mode",
				label: TRACE_COLUMN_LABELS.mode,
				width: 70,
				render: (trace) => modeLabel(trace.mode),
				sortValue: (trace) => trace.mode,
			},
			{ id: "depth", label: TRACE_COLUMN_LABELS.depth, width: 60, render: (trace) => trace.depth, sortValue: (trace) => trace.depth },
			{
				id: "duration",
				label: TRACE_COLUMN_LABELS.duration,
				width: 90,
				render: (trace) => formatDuration(trace.executionDurationMs),
				sortValue: (trace) => trace.executionDurationMs,
			},
			{
				id: "exception",
				label: TRACE_COLUMN_LABELS.exception,
				width: 100,
				render: (trace) =>
					trace.exceptionDetails ? (
						<TextBadge appearance="tint" color="danger" size="small">
							Exception
						</TextBadge>
					) : null,
				sortValue: (trace) => (trace.exceptionDetails ? 1 : 0),
			},
			{
				id: "correlation",
				label: TRACE_COLUMN_LABELS.correlation,
				width: 110,
				render: (trace) =>
					trace.correlationId ? (
						<span className={mergeClasses(styles.mono, trace.correlationId === highlightedGuid && styles.highlight)} title={trace.correlationId}>
							{shortId(trace.correlationId)}
						</span>
					) : (
						"—"
					),
				sortValue: (trace) => trace.correlationId,
			},
			{
				id: "pluginStep",
				label: TRACE_COLUMN_LABELS.pluginStep,
				width: 90,
				render: (trace) =>
					trace.pluginStepId ? (
						<span className={mergeClasses(styles.mono, trace.pluginStepId === highlightedGuid && styles.highlight)} title={trace.pluginStepId}>
							{shortId(trace.pluginStepId)}
						</span>
					) : (
						"—"
					),
				sortValue: (trace) => trace.pluginStepId,
			},
		];
		return all.filter((column) => shown.includes(column.id));
	}, [highlightedGuid, shown, styles]);
};
