import { describe, expect, it } from "vitest";

import { DEFAULT_TRACE_QUERY, type TraceQuery } from "@/shared/types";

import { activeTraceFilterCount } from "./traceFilters";

const query = (changes: Partial<TraceQuery>): TraceQuery => ({ ...DEFAULT_TRACE_QUERY, ...changes });

describe("activeTraceFilterCount", () => {
	it("counts nothing for the default query", () => {
		expect(activeTraceFilterCount(DEFAULT_TRACE_QUERY)).toBe(0);
	});

	it("does not count Top, which is a size and not a filter", () => {
		expect(activeTraceFilterCount(query({ top: 5000 }))).toBe(0);
	});

	it("counts each text filter that holds something", () => {
		expect(activeTraceFilterCount(query({ typeName: "Contoso" }))).toBe(1);
		expect(activeTraceFilterCount(query({ typeName: "Contoso", primaryEntity: "account" }))).toBe(2);
	});

	it("ignores a text filter that holds only spaces", () => {
		expect(activeTraceFilterCount(query({ messageName: "   " }))).toBe(0);
	});

	it("counts the dates, the correlation id and the exceptions switch", () => {
		expect(activeTraceFilterCount(query({ from: "2026-11-14T09:00" }))).toBe(1);
		expect(activeTraceFilterCount(query({ to: "2026-11-14T10:00" }))).toBe(1);
		expect(activeTraceFilterCount(query({ correlationId: "0000" }))).toBe(1);
		expect(activeTraceFilterCount(query({ exceptionsOnly: true }))).toBe(1);
	});

	it("counts them all together", () => {
		expect(
			activeTraceFilterCount(
				query({ from: "a", to: "b", typeName: "c", messageName: "d", primaryEntity: "e", correlationId: "f", exceptionsOnly: true, top: 1000 })
			)
		).toBe(7);
	});
});
