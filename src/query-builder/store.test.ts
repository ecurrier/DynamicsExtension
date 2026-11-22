import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PAGE_CONNECTION } from "@/shared/connections";
import { type QueryRunResult } from "@/shared/types";

import { createQueryBuilderStore, PARSE_DELAY_MS } from "./store";

const GOOD = '<fetch><entity name="account"><attribute name="name" /></entity></fetch>';
const OTHER = '<fetch><entity name="contact" /></fetch>';
const BROKEN = '<fetch><entity name="account"></fetch>';

const RESULT: QueryRunResult = {
	rows: [{ name: "Contoso" }],
	moreRecords: true,
	pagingCookie: "<cookie />",
	totalRecordCount: null,
	totalRecordCountLimitExceeded: false,
	elapsedMs: 42,
	annotations: {},
};

const ENVIRONMENT = { kind: "environment" as const, environmentId: "env-dev" };

describe("the Query Builder store", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("opens with the launch's Fetch XML already parsed", () => {
		const state = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: GOOD }).getState();
		expect(state.text).toBe(GOOD);
		expect(state.query?.root.name).toBe("fetch");
		expect(state.errors).toEqual([]);
		expect(state.selectedPath).toBeNull();
		expect(state.run.status).toBe("idle");
	});

	it("opens empty with no Query and no errors", () => {
		const state = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: null }).getState();
		expect(state.text).toBe("");
		expect(state.query).toBeNull();
		expect(state.errors).toEqual([]);
	});

	it("sets the text at once and parses it after the delay", () => {
		const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: GOOD });
		store.getState().setText(OTHER);
		expect(store.getState().text).toBe(OTHER);
		expect(store.getState().parsedText).toBe(GOOD);
		vi.advanceTimersByTime(PARSE_DELAY_MS);
		expect(store.getState().parsedText).toBe(OTHER);
		expect(store.getState().query?.root.children).toHaveLength(1);
	});

	it("parses only the last text when typing continues", () => {
		const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: null });
		store.getState().setText(BROKEN);
		vi.advanceTimersByTime(PARSE_DELAY_MS - 1);
		store.getState().setText(GOOD);
		vi.advanceTimersByTime(PARSE_DELAY_MS - 1);
		expect(store.getState().parsedText).toBe("");
		vi.advanceTimersByTime(1);
		expect(store.getState().errors).toEqual([]);
		expect(store.getState().query).not.toBeNull();
	});

	it("keeps the last valid Query and records the errors when the text stops parsing", () => {
		const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: GOOD });
		const valid = store.getState().query;
		store.getState().setText(BROKEN);
		vi.advanceTimersByTime(PARSE_DELAY_MS);
		expect(store.getState().query).toBe(valid);
		expect(store.getState().errors.length).toBeGreaterThan(0);
		store.getState().setText(GOOD);
		vi.advanceTimersByTime(PARSE_DELAY_MS);
		expect(store.getState().errors).toEqual([]);
	});

	it("parses at once when asked, cancelling the pending parse", () => {
		const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: null });
		store.getState().setText(GOOD);
		const parsed = store.getState().parseNow();
		expect(parsed.query?.root.name).toBe("fetch");
		expect(store.getState().parsedText).toBe(GOOD);
		const before = store.getState().query;
		vi.advanceTimersByTime(PARSE_DELAY_MS);
		expect(store.getState().query).toBe(before);
	});

	it("records a Query Run from start to finish with its Connection", () => {
		const store = createQueryBuilderStore({ connection: ENVIRONMENT, fetchXml: GOOD });
		const id = store.getState().startRun();
		expect(store.getState().run).toMatchObject({ status: "running", connection: ENVIRONMENT, rows: [] });
		store.getState().finishRun(id, RESULT);
		expect(store.getState().run).toMatchObject({
			status: "done",
			connection: ENVIRONMENT,
			rows: RESULT.rows,
			moreRecords: true,
			pagingCookie: "<cookie />",
			elapsedMs: 42,
		});
	});

	it("records a failed Query Run with the platform's message", () => {
		const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: GOOD });
		const id = store.getState().startRun();
		store.getState().failRun(id, "'account' entity doesn't contain attribute with Name = 'nope'");
		expect(store.getState().run).toMatchObject({ status: "failed", error: "'account' entity doesn't contain attribute with Name = 'nope'" });
	});

	it("clears the results and keeps the Query when the Connection changes", () => {
		const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: GOOD });
		const query = store.getState().query;
		store.getState().finishRun(store.getState().startRun(), RESULT);
		store.getState().setConnection(ENVIRONMENT);
		expect(store.getState().connection).toEqual(ENVIRONMENT);
		expect(store.getState().run.status).toBe("idle");
		expect(store.getState().run.rows).toEqual([]);
		expect(store.getState().query).toBe(query);
		expect(store.getState().text).toBe(GOOD);
	});

	it("ignores a Query Run that finishes after the Connection changed", () => {
		const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: GOOD });
		const id = store.getState().startRun();
		store.getState().setConnection(ENVIRONMENT);
		store.getState().finishRun(id, RESULT);
		store.getState().failRun(id, "late");
		expect(store.getState().run.status).toBe("idle");
	});

	it("resizes and collapses panes", () => {
		const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: null });
		store.getState().resizePane("tree", 320);
		store.getState().resizePane("results", 200);
		store.getState().togglePane("xml");
		expect(store.getState().layout).toEqual({ treeWidth: 320, resultsHeight: 200, collapsed: { tree: false, xml: true, results: false } });
		store.getState().togglePane("xml");
		expect(store.getState().layout.collapsed.xml).toBe(false);
	});
});
