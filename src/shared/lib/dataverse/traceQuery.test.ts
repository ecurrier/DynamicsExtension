import { describe, expect, it } from "vitest";

import { DEFAULT_TRACE_QUERY } from "@/shared/types";

import { buildTraceFilter, buildTraceQuery, mapTraceLog, modeLabel, operationTypeLabel } from "./traceQuery";

describe("buildTraceQuery", () => {
	it("selects every column, orders newest first, and applies top without a filter", () => {
		const query = buildTraceQuery(DEFAULT_TRACE_QUERY);
		expect(query.startsWith("plugintracelogs?$select=plugintracelogid,createdon,typename,")).toBe(true);
		expect(query).not.toContain("$filter");
		expect(query.endsWith("&$orderby=createdon desc&$top=100")).toBe(true);
	});

	it("joins every active clause with and", () => {
		expect(
			buildTraceFilter({
				top: 500,
				from: "2024-01-01T00:00:00.000Z",
				to: "2024-01-02T00:00:00.000Z",
				typeName: " Contoso.Plugins.O'Brien ",
				messageName: "Create",
				primaryEntity: "account",
				exceptionsOnly: true,
				correlationId: "{11111111-1111-4111-8111-111111111111}",
			})
		).toBe(
			[
				"createdon ge 2024-01-01T00:00:00.000Z",
				"createdon le 2024-01-02T00:00:00.000Z",
				"contains(typename,'Contoso.Plugins.O''Brien')",
				"contains(messagename,'Create')",
				"contains(primaryentity,'account')",
				"exceptiondetails ne null",
				"correlationid eq 11111111-1111-4111-8111-111111111111",
			].join(" and ")
		);
	});

	it("ignores blank text, invalid dates, and non-guid correlation ids", () => {
		expect(buildTraceFilter({ ...DEFAULT_TRACE_QUERY, from: "not a date", typeName: "   ", correlationId: "abc" })).toBeNull();
	});
});

describe("mapTraceLog", () => {
	it("normalises ids and fills defaults", () => {
		expect(
			mapTraceLog({
				plugintracelogid: "{AAAAAAAA-0000-4000-8000-000000000001}",
				createdon: "2024-01-01T10:00:00Z",
				typename: "Contoso.Plugin",
				correlationid: "BBBBBBBB-0000-4000-8000-000000000002",
				performanceexecutionduration: 42,
			})
		).toEqual({
			id: "aaaaaaaa-0000-4000-8000-000000000001",
			createdOn: "2024-01-01T10:00:00Z",
			typeName: "Contoso.Plugin",
			messageName: "",
			primaryEntity: "",
			operationType: 0,
			mode: 0,
			depth: 1,
			correlationId: "bbbbbbbb-0000-4000-8000-000000000002",
			requestId: null,
			pluginStepId: null,
			executionStart: null,
			executionDurationMs: 42,
			constructorDurationMs: null,
			exceptionDetails: null,
			messageBlock: null,
			configuration: null,
			secureConfiguration: null,
		});
	});

	it("labels operation types and modes", () => {
		expect(operationTypeLabel(1)).toBe("Plug-in");
		expect(operationTypeLabel(2)).toBe("Workflow Activity");
		expect(operationTypeLabel(9)).toBe("Type 9");
		expect(modeLabel(0)).toBe("Sync");
		expect(modeLabel(1)).toBe("Async");
	});
});
