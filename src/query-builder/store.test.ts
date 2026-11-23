import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type StoreApi } from "zustand";

import { PAGE_CONNECTION } from "@/shared/connections";
import { type QueryRunResult } from "@/shared/types";

import { createQueryBuilderStore, firstRunOf, PARSE_DELAY_MS, type QueryBuilderState } from "./store";

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

const DEV_KEY = "environment:env-dev";

const firstRun = (store: StoreApi<QueryBuilderState>) => firstRunOf(store.getState());

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
		expect(firstRunOf(state)?.status).toBe("idle");
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
		const id = store.getState().startRuns()[DEV_KEY] ?? 0;
		expect(firstRun(store)).toMatchObject({ status: "running", connection: ENVIRONMENT, rows: [] });
		store.getState().finishRun(DEV_KEY, id, RESULT);
		expect(firstRun(store)).toMatchObject({
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
		const id = store.getState().startRuns().page ?? 0;
		store.getState().failRun("page", id, "'account' entity doesn't contain attribute with Name = 'nope'");
		expect(firstRun(store)).toMatchObject({ status: "failed", error: "'account' entity doesn't contain attribute with Name = 'nope'" });
	});

	it("clears the results and keeps the Query when the Connection changes", () => {
		const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: GOOD });
		const query = store.getState().query;
		store.getState().finishRun("page", store.getState().startRuns().page ?? 0, RESULT);
		store.getState().setConnection(ENVIRONMENT);
		expect(store.getState().connection).toEqual(ENVIRONMENT);
		expect(store.getState().connections).toEqual([ENVIRONMENT]);
		expect(firstRun(store)).toMatchObject({ status: "idle", rows: [], connection: ENVIRONMENT });
		expect(store.getState().runs.page).toBeUndefined();
		expect(store.getState().query).toBe(query);
		expect(store.getState().text).toBe(GOOD);
	});

	it("ignores a Query Run that finishes after the Connection changed", () => {
		const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: GOOD });
		const id = store.getState().startRuns().page ?? 0;
		store.getState().setConnection(ENVIRONMENT);
		store.getState().finishRun("page", id, RESULT);
		store.getState().failRun("page", id, "late");
		expect(firstRun(store)?.status).toBe("idle");
		expect(store.getState().runs.page).toBeUndefined();
	});

	describe("several Connections", () => {
		const TEST = { kind: "environment" as const, environmentId: "env-test" };
		const TEST_KEY = "environment:env-test";

		it("adds Connections after the first and starts one Query Run on each", () => {
			const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: GOOD });
			store.getState().addConnection(ENVIRONMENT);
			store.getState().addConnection(TEST);
			store.getState().addConnection(ENVIRONMENT);
			expect(store.getState().connections).toEqual([PAGE_CONNECTION, ENVIRONMENT, TEST]);
			const ids = store.getState().startRuns();
			expect(Object.keys(ids)).toEqual(["page", DEV_KEY, TEST_KEY]);
			expect(new Set(Object.values(ids)).size).toBe(3);
			expect(Object.values(store.getState().runs).map((run) => run.status)).toEqual(["running", "running", "running"]);
			expect(store.getState().lastRunText).toBe(GOOD);
		});

		it("keeps each Connection's results apart and clears only the removed Connection's", () => {
			const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: GOOD });
			store.getState().addConnection(ENVIRONMENT);
			store.getState().addConnection(TEST);
			const ids = store.getState().startRuns();
			store.getState().finishRun("page", ids.page ?? 0, RESULT);
			store.getState().failRun(TEST_KEY, ids[TEST_KEY] ?? 0, "Column x does not exist.");
			store.getState().removeConnection(DEV_KEY);
			expect(store.getState().connections).toEqual([PAGE_CONNECTION, TEST]);
			expect(store.getState().runs.page?.status).toBe("done");
			expect(store.getState().runs[TEST_KEY]?.status).toBe("failed");
			expect(store.getState().runs[DEV_KEY]).toBeUndefined();
			store.getState().finishRun(DEV_KEY, ids[DEV_KEY] ?? 0, RESULT);
			expect(store.getState().runs[DEV_KEY]).toBeUndefined();
		});

		it("swaps when the first Connection becomes one that is already in the list", () => {
			const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: GOOD });
			store.getState().addConnection(ENVIRONMENT);
			store.getState().finishRun("page", store.getState().startRuns().page ?? 0, RESULT);
			store.getState().setConnection(ENVIRONMENT);
			expect(store.getState().connection).toEqual(ENVIRONMENT);
			expect(store.getState().connections).toEqual([ENVIRONMENT, PAGE_CONNECTION]);
			expect(store.getState().runs.page?.status).toBe("done");
		});

		it("does not remove the first Connection", () => {
			const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: GOOD });
			store.getState().removeConnection("page");
			expect(store.getState().connections).toEqual([PAGE_CONNECTION]);
		});

		it("finds the runner that each Connection registers", () => {
			const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: GOOD });
			const runner = { start: () => Promise.resolve(), loadPages: () => Promise.resolve("complete" as const) };
			const release = store.getState().registerRunner("page", runner);
			expect(store.getState().runnerFor("page")).toBe(runner);
			release();
			expect(store.getState().runnerFor("page")).toBeUndefined();
		});
	});

	it("resizes and collapses panes", () => {
		const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: null });
		store.getState().resizePane("tree", 320);
		store.getState().resizePane("results", 200);
		store.getState().togglePane("xml");
		expect(store.getState().layout).toEqual({
			treeWidth: 320,
			detailsWidth: 280,
			resultsHeight: 200,
			collapsed: { tree: false, details: false, xml: true, results: false },
			detailsForced: false,
			resultsMaximised: false,
			detailsGroups: { more: false, legacy: false },
			xmlTab: "fetchxml",
		});
		store.getState().togglePane("xml");
		expect(store.getState().layout.collapsed.xml).toBe(false);
	});

	it("opens the tree at two fifths of the Workspace and the details pane at 280px", () => {
		const { layout } = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: null }).getState();
		expect(layout.treeWidth).toBeNull();
		expect(layout.detailsWidth).toBe(280);
	});

	it("keeps the details pane's width while it is collapsed and forces it open only when asked to", () => {
		const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: null });
		store.getState().resizePane("details", 320);
		store.getState().togglePane("details");
		expect(store.getState().layout).toMatchObject({ detailsWidth: 320, collapsed: { details: true }, detailsForced: false });
		store.getState().showDetails(true);
		expect(store.getState().layout).toMatchObject({ detailsWidth: 320, collapsed: { details: false }, detailsForced: true });
		store.getState().releaseDetails();
		expect(store.getState().layout.detailsForced).toBe(false);
	});

	it("commits the focused draft before acting on the Query", () => {
		const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: null });
		const commits: string[] = [];
		const release = store.getState().registerDraft(() => commits.push("a"));
		store.getState().flushDraft();
		release();
		store.getState().flushDraft();
		expect(commits).toEqual(["a"]);
	});

	it("adds no undo step for an edit that leaves the Fetch XML as it was", () => {
		const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: GOOD });
		store.getState().edit((query) => ({ ok: true, change: { document: query, shift: { kind: "none" }, select: null } }));
		expect(store.getState().history.undo).toHaveLength(1);
		store.getState().edit((query) => ({ ok: true, change: { document: query, shift: { kind: "none" }, select: [0] } }));
		expect(store.getState().history.undo).toHaveLength(1);
		expect(store.getState().selectedPath).toEqual([0]);
	});

	it("remembers which details groups are open, per group and not per row", () => {
		const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: GOOD });
		store.getState().setDetailsGroupOpen("more", true);
		store.getState().select([0]);
		expect(store.getState().layout.detailsGroups).toEqual({ more: true, legacy: false });
		store.getState().setDetailsGroupOpen("more", false);
		expect(store.getState().layout.detailsGroups.more).toBe(false);
	});

	it("remembers which tab the right pane shows, and keeps the text when it changes", () => {
		const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: GOOD });
		expect(store.getState().layout.xmlTab).toBe("fetchxml");
		store.getState().setXmlTab("webapi");
		expect(store.getState().layout.xmlTab).toBe("webapi");
		expect(store.getState().text).toBe(GOOD);
		const layout = store.getState().layout;
		store.getState().setXmlTab("webapi");
		expect(store.getState().layout).toBe(layout);
	});

	it("maximises the results and restores the layout as it was", () => {
		const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: null });
		store.getState().resizePane("tree", 320);
		store.getState().togglePane("results");
		const before = store.getState().layout;
		store.getState().setResultsMaximised(true);
		expect(store.getState().layout).toEqual({ ...before, resultsMaximised: true });
		store.getState().setResultsMaximised(false);
		expect(store.getState().layout).toEqual(before);
	});

	describe("paging a Query Run", () => {
		const pagedRun = () => {
			const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: GOOD });
			const query = store.getState().query;
			if (!query) {
				throw new Error("no query");
			}
			const id = store.getState().startRuns().page ?? 0;
			store
				.getState()
				.finishRun(
					"page",
					id,
					{ ...RESULT, annotations: { "@Microsoft.Dynamics.CRM.morerecords": true } },
					{ query, entitySetName: "accounts", pageable: true }
				);
			return { store, id };
		};

		it("keeps the first page as the first of the loaded pages", () => {
			const { store } = pagedRun();
			expect(firstRun(store)).toMatchObject({
				pageNumber: 1,
				pages: [{ rows: RESULT.rows, annotations: { "@Microsoft.Dynamics.CRM.morerecords": true } }],
			});
			expect(firstRun(store)?.source?.entitySetName).toBe("accounts");
		});

		it("accumulates each further page with its cookie and elapsed time", () => {
			const { store, id } = pagedRun();
			expect(store.getState().startPaging("page", id, "next")).toBe(true);
			expect(firstRun(store)?.paging).toBe("next");
			store.getState().appendPage("page", id, { ...RESULT, rows: [{ name: "Fabrikam" }], moreRecords: false, pagingCookie: null, elapsedMs: 7 });
			store.getState().finishPaging("page", id, { kind: "finished" });
			expect(firstRun(store)).toMatchObject({
				rows: [{ name: "Contoso" }, { name: "Fabrikam" }],
				pageNumber: 2,
				moreRecords: false,
				pagingCookie: null,
				elapsedMs: 7,
				paging: "idle",
			});
			expect(firstRun(store)?.pages).toHaveLength(2);
			expect(store.getState().startPaging("page", id, "next")).toBe(false);
		});

		it("refuses to page a Query Run that cannot be paged or is already paging", () => {
			const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: GOOD });
			const id = store.getState().startRuns().page ?? 0;
			store.getState().finishRun("page", id, RESULT);
			expect(store.getState().startPaging("page", id, "all")).toBe(false);
			const paged = pagedRun();
			expect(paged.store.getState().startPaging("page", paged.id, "all")).toBe(true);
			expect(paged.store.getState().startPaging("page", paged.id, "next")).toBe(false);
		});

		it("records a stop request, a pause at the limit, and a failed page without losing Records", () => {
			const { store, id } = pagedRun();
			store.getState().startPaging("page", id, "all");
			store.getState().requestStop("page", id);
			expect(firstRun(store)?.stopRequested).toBe(true);
			store.getState().finishPaging("page", id, { kind: "confirm" });
			expect(firstRun(store)).toMatchObject({ paging: "idle", stopRequested: false, awaitingLimitConfirmation: true });
			store.getState().startPaging("page", id, "all", true);
			expect(firstRun(store)).toMatchObject({ pastLimitConfirmed: true, awaitingLimitConfirmation: false });
			store.getState().finishPaging("page", id, { kind: "failed", message: "boom" });
			expect(firstRun(store)).toMatchObject({ pageError: "boom", rows: RESULT.rows, status: "done" });
		});

		it("ignores pages for a Query Run that has been replaced", () => {
			const { store, id } = pagedRun();
			store.getState().startPaging("page", id, "next");
			store.getState().startRuns();
			store.getState().appendPage("page", id, RESULT);
			expect(firstRun(store)?.rows).toEqual([]);
		});
	});
});
