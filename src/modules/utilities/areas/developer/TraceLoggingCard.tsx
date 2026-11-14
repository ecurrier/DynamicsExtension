import { Dropdown, makeStyles, Option, Text, tokens } from "@fluentui/react-components";
import { History20Regular } from "@fluentui/react-icons";

import { pageKeys, usePageMutation, usePageQuery } from "@/messaging/client";
import { TaskCard, useAppToast } from "@/shared/components";
import { useSessionStore } from "@/shared/stores";
import { TRACE_LOG_SETTING_LABELS, TRACE_LOG_SETTINGS, type TraceLogSetting } from "@/shared/types";

import { DEVELOPER_UTILITIES } from "../../lib";

const useStyles = makeStyles({
	hint: {
		flex: 1,
		minWidth: 0,
		color: tokens.colorNeutralForeground3,
	},
	dropdown: {
		minWidth: "120px",
	},
});

const SETTING_HINTS: Record<TraceLogSetting, string> = {
	0: "Plug-ins write no trace logs. Turn this on before reproducing an issue.",
	1: "Trace logs are kept only when a plug-in throws an exception.",
	2: "Every plug-in execution writes a trace log. Turn it off again when you are done, to limit storage growth.",
};

/**
 * Setting the trace logging level is a one-shot action on the open page, which `CONTEXT.md` calls a
 * Utility. It used to live on the Plug-in Traces launcher screen. The Trace Viewer keeps its own copy.
 */
export const TraceLoggingCard = () => {
	const styles = useStyles();
	const toast = useAppToast();
	const tabId = useSessionStore((state) => state.tabId);
	const setting = usePageQuery("traces.getSetting", undefined);
	const update = usePageMutation("traces.setSetting", {
		invalidates: () => (tabId === null ? [] : [pageKeys.command(tabId, "traces.getSetting", null)]),
		onSuccess: (_, args) => toast.success(`Plug-in trace logging set to ${TRACE_LOG_SETTING_LABELS[args.value]}`),
	});
	const level = setting.data;
	return (
		<TaskCard
			utility={DEVELOPER_UTILITIES.traceLogging}
			icon={History20Regular}
			extra={
				<>
					<Text size={200} className={styles.hint}>
						{setting.isError ? setting.error.message : level === undefined ? "" : SETTING_HINTS[level]}
					</Text>
					<Dropdown
						className={styles.dropdown}
						aria-label="Plug-in trace logging level"
						placeholder={setting.isLoading ? "Loading..." : "Select a level"}
						value={level === undefined ? "" : TRACE_LOG_SETTING_LABELS[level]}
						selectedOptions={level === undefined ? [] : [String(level)]}
						disabled={level === undefined || update.isPending}
						onOptionSelect={(_, data) => {
							if (data.optionValue) {
								update.mutate({ value: Number(data.optionValue) as TraceLogSetting });
							}
						}}>
						{TRACE_LOG_SETTINGS.map((value) => (
							<Option key={value} value={String(value)} text={TRACE_LOG_SETTING_LABELS[value]}>
								{TRACE_LOG_SETTING_LABELS[value]}
							</Option>
						))}
					</Dropdown>
				</>
			}
		/>
	);
};
