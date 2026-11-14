import { DEFAULT_TRACE_QUERY, type TraceQuery } from "@/shared/types";

/**
 * How many server filters are set. It shows on the Filters button, so a narrowed list of traces is
 * never a surprise. `top` is a size, not a filter, and stays out of the count and out of the panel.
 */
export const activeTraceFilterCount = (query: TraceQuery): number => {
	const text = [query.typeName, query.messageName, query.primaryEntity, query.from, query.to, query.correlationId];
	return text.filter((value) => (value ?? "").trim() !== "").length + (query.exceptionsOnly ? 1 : 0);
};

/** The filters the panel owns, back to their defaults. `top` is left as the user set it. */
export const clearedTraceQuery = (query: TraceQuery): TraceQuery => ({ ...DEFAULT_TRACE_QUERY, top: query.top });
