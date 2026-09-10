import { type PluginTraceLog } from "@/shared/types";

export const traceMatches = (trace: PluginTraceLog, filter: string): boolean => {
	const term = filter.trim().toLowerCase();
	if (!term) {
		return true;
	}
	return [
		trace.typeName,
		trace.messageName,
		trace.primaryEntity,
		trace.correlationId,
		trace.requestId,
		trace.pluginStepId,
		trace.exceptionDetails,
		trace.messageBlock,
	].some((value) => value?.toLowerCase().includes(term));
};

export const formatTraceTime = (iso: string | null): string => {
	if (!iso) {
		return "—";
	}
	const date = new Date(iso);
	return Number.isNaN(date.getTime()) ? iso : date.toLocaleString(undefined, { dateStyle: "short", timeStyle: "medium" });
};

export const formatDuration = (milliseconds: number | null): string => (milliseconds === null ? "—" : `${milliseconds} ms`);
