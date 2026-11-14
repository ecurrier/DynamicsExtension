import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS } from "@/shared/storage";

import { DEFAULT_TRACE_COLUMNS, shownTraceColumns, TRACE_COLUMN_ORDER, toggledTraceColumns } from "./traceColumnChoice";

describe("shownTraceColumns", () => {
	it("gives the six defaults when nothing is remembered", () => {
		expect(shownTraceColumns(undefined)).toEqual(DEFAULT_TRACE_COLUMNS);
		expect(DEFAULT_TRACE_COLUMNS).toEqual(["createdOn", "typeName", "messageName", "primaryEntity", "duration", "exception"]);
	});

	it("keeps the table's own order, not the order the user ticked them in", () => {
		expect(shownTraceColumns(["exception", "createdOn"])).toEqual(["createdOn", "exception"]);
	});

	it("drops a remembered column that no longer exists", () => {
		expect(shownTraceColumns(["createdOn", "gone"])).toEqual(["createdOn"]);
	});

	it("falls back to the defaults when the user has hidden everything", () => {
		expect(shownTraceColumns([])).toEqual(DEFAULT_TRACE_COLUMNS);
	});
});

describe("toggledTraceColumns", () => {
	it("adds a column in the table's order", () => {
		expect(toggledTraceColumns(["createdOn", "exception"], "mode")).toEqual(["createdOn", "mode", "exception"]);
	});

	it("removes a column", () => {
		expect(toggledTraceColumns(["createdOn", "mode", "exception"], "mode")).toEqual(["createdOn", "exception"]);
	});

	it("refuses to remove the last column, because an empty table shows nothing", () => {
		expect(toggledTraceColumns(["createdOn"], "createdOn")).toEqual(["createdOn"]);
	});

	it("covers every column the table can show", () => {
		expect(TRACE_COLUMN_ORDER).toContain("correlation");
		expect(TRACE_COLUMN_ORDER).toContain("pluginStep");
		expect(TRACE_COLUMN_ORDER).toContain("depth");
	});
});

describe("the stored default", () => {
	it("matches the settings fallback, so a fresh install shows the six", () => {
		expect(DEFAULT_SETTINGS.traceColumns).toEqual(DEFAULT_TRACE_COLUMNS);
	});
});
