import { describe, expect, it } from "vitest";

import { displayCaption, displayPageOf, displayWindow, loadAllStep, resultsStatus, type ResultsStatusInput } from "./resultsView";

describe("displayWindow", () => {
	it("shows one screen of the loaded Records at a time", () => {
		expect(displayWindow(320, 1, 50)).toEqual({ page: 1, pageCount: 7, start: 50, end: 100 });
		expect(displayWindow(320, 6, 50)).toEqual({ page: 6, pageCount: 7, start: 300, end: 320 });
	});

	it("clamps a page past either end", () => {
		expect(displayWindow(120, 9, 50)).toEqual({ page: 2, pageCount: 3, start: 100, end: 120 });
		expect(displayWindow(120, -1, 50)).toEqual({ page: 0, pageCount: 3, start: 0, end: 50 });
		expect(displayWindow(0, 3, 50)).toEqual({ page: 0, pageCount: 1, start: 0, end: 0 });
	});

	it("finds the page a Record falls on", () => {
		expect(displayPageOf(50, 50)).toBe(1);
		expect(displayPageOf(49, 50)).toBe(0);
	});
});

describe("displayCaption", () => {
	it("says which Records are on screen out of those loaded", () => {
		expect(displayCaption(displayWindow(320, 1, 50), 320)).toBe("Records 51-100 of 320 loaded");
		expect(displayCaption(displayWindow(0, 0, 50), 0)).toBe("No Records loaded");
	});
});

describe("loadAllStep", () => {
	const progress = { loaded: 100, moreRecords: true, stopRequested: false, pastLimitConfirmed: false };

	it("keeps loading while more Records exist", () => {
		expect(loadAllStep(progress)).toBe("continue");
		expect(loadAllStep({ ...progress, moreRecords: false })).toBe("done");
	});

	it("stops when asked", () => {
		expect(loadAllStep({ ...progress, stopRequested: true })).toBe("stopped");
		expect(loadAllStep({ ...progress, stopRequested: true, moreRecords: false })).toBe("done");
	});

	it("asks before passing the limit, once", () => {
		expect(loadAllStep({ ...progress, loaded: 50_000 })).toBe("confirm");
		expect(loadAllStep({ ...progress, loaded: 49_950 })).toBe("continue");
		expect(loadAllStep({ ...progress, loaded: 60_000, pastLimitConfirmed: true })).toBe("continue");
		expect(loadAllStep({ ...progress, loaded: 10 }, 10)).toBe("confirm");
	});
});

describe("resultsStatus", () => {
	const done: ResultsStatusInput = {
		status: "done",
		loaded: 50,
		moreRecords: true,
		pageable: true,
		paging: "idle",
		elapsedMs: 150.4,
		connectionName: "Contoso Dev",
	};

	it("reports Records loaded, the server, the last request and the Connection", () => {
		expect(resultsStatus(done)).toBe("50 Records loaded · more on the server · last request 150 ms · Contoso Dev");
		expect(resultsStatus({ ...done, loaded: 130, moreRecords: false })).toBe(
			"130 Records loaded · no more on the server · last request 150 ms · Contoso Dev"
		);
		expect(resultsStatus({ ...done, loaded: 1, pageable: false, moreRecords: false })).toBe(
			"1 Record loaded · single page · last request 150 ms · Contoso Dev"
		);
	});

	it("shows a running count while loading", () => {
		expect(resultsStatus({ ...done, loaded: 300, paging: "all" })).toBe("All pages: 300 Records loaded · Contoso Dev");
		expect(resultsStatus({ ...done, paging: "next" })).toBe("50 Records loaded · next page to come · Contoso Dev");
	});

	it("names the Connection before and around a Query Run", () => {
		expect(resultsStatus({ ...done, status: "idle" })).toBe("Contoso Dev");
		expect(resultsStatus({ ...done, status: "running" })).toBe("The Query is running on Contoso Dev");
		expect(resultsStatus({ ...done, status: "failed" })).toBe("Query Run failed on Contoso Dev");
	});
});
