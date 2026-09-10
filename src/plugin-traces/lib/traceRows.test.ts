import { describe, expect, it } from "vitest";

import { type PluginTraceLog } from "@/shared/types";

import { shortId, splitGuids } from "./splitGuids";
import { formatDuration, traceMatches } from "./traceRows";

const trace: PluginTraceLog = {
	id: "id",
	createdOn: "2024-01-01T00:00:00Z",
	typeName: "Contoso.Plugins.AccountPreCreate",
	messageName: "Create",
	primaryEntity: "account",
	operationType: 1,
	mode: 0,
	depth: 1,
	correlationId: "aaaaaaaa-0000-4000-8000-000000000001",
	requestId: null,
	pluginStepId: null,
	executionStart: null,
	executionDurationMs: 12,
	constructorDurationMs: null,
	exceptionDetails: null,
	messageBlock: "Target record bbbbbbbb-0000-4000-8000-000000000002 locked",
	configuration: null,
	secureConfiguration: null,
};

describe("traceMatches", () => {
	it("matches across names, ids, and text blocks", () => {
		expect(traceMatches(trace, "")).toBe(true);
		expect(traceMatches(trace, "precreate")).toBe(true);
		expect(traceMatches(trace, "aaaaaaaa")).toBe(true);
		expect(traceMatches(trace, "locked")).toBe(true);
		expect(traceMatches(trace, "contact")).toBe(false);
	});
});

describe("splitGuids", () => {
	it("splits text around guids and lowercases them", () => {
		expect(splitGuids("Record AAAAAAAA-0000-4000-8000-000000000001 and bbbbbbbb-0000-4000-8000-000000000002.")).toEqual([
			{ kind: "text", value: "Record " },
			{ kind: "guid", value: "aaaaaaaa-0000-4000-8000-000000000001" },
			{ kind: "text", value: " and " },
			{ kind: "guid", value: "bbbbbbbb-0000-4000-8000-000000000002" },
			{ kind: "text", value: "." },
		]);
		expect(splitGuids("plain text")).toEqual([{ kind: "text", value: "plain text" }]);
		expect(splitGuids("")).toEqual([]);
	});

	it("shortens ids", () => {
		expect(shortId("aaaaaaaa-0000-4000-8000-000000000001")).toBe("aaaaaaaa");
		expect(shortId(null)).toBe("");
		expect(formatDuration(null)).toBe("—");
		expect(formatDuration(42)).toBe("42 ms");
	});
});
