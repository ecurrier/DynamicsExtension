export const DISPLAY_PAGE_SIZE = 50;

export const LOAD_ALL_CONFIRM_AT = 50_000;

export interface DisplayWindow {
	page: number;
	pageCount: number;
	start: number;
	end: number;
}

export const displayWindow = (total: number, page: number, size: number = DISPLAY_PAGE_SIZE): DisplayWindow => {
	const pageSize = Math.max(1, Math.trunc(size));
	const pageCount = Math.max(1, Math.ceil(total / pageSize));
	const current = Math.min(Math.max(0, Math.trunc(page)), pageCount - 1);
	const start = Math.min(current * pageSize, total);
	return { page: current, pageCount, start, end: Math.min(start + pageSize, total) };
};

export const displayPageOf = (index: number, size: number = DISPLAY_PAGE_SIZE): number => Math.max(0, Math.floor(index / Math.max(1, Math.trunc(size))));

const count = (value: number): string => value.toLocaleString();

export const recordCount = (value: number, suffix: string): string => (value === 1 ? `1 Record ${suffix}` : `${count(value)} Records ${suffix}`);

export const displayCaption = (window: DisplayWindow, total: number): string =>
	total === 0 ? "No Records loaded" : `Records ${count(window.start + 1)}-${count(window.end)} of ${count(total)} loaded`;

export type LoadAllStep = "continue" | "done" | "stopped" | "confirm";

export interface LoadAllProgress {
	loaded: number;
	moreRecords: boolean;
	stopRequested: boolean;
	pastLimitConfirmed: boolean;
}

export const loadAllStep = ({ loaded, moreRecords, stopRequested, pastLimitConfirmed }: LoadAllProgress, limit: number = LOAD_ALL_CONFIRM_AT): LoadAllStep => {
	if (!moreRecords) {
		return "done";
	}
	if (stopRequested) {
		return "stopped";
	}
	return loaded >= limit && !pastLimitConfirmed ? "confirm" : "continue";
};

export type ResultsPaging = "idle" | "next" | "all";

export interface ResultsStatusInput {
	status: "idle" | "running" | "done" | "failed";
	loaded: number;
	moreRecords: boolean;
	pageable: boolean;
	paging: ResultsPaging;
	elapsedMs: number | null;
	connectionName: string;
}

const serverState = ({ pageable, moreRecords }: ResultsStatusInput): string => {
	if (!pageable) {
		return "single page";
	}
	return moreRecords ? "more on the server" : "no more on the server";
};

export const resultsStatus = (input: ResultsStatusInput): string => {
	const { status, loaded, paging, elapsedMs, connectionName } = input;
	switch (status) {
		case "idle":
			return connectionName;
		case "running":
			return `Running on ${connectionName}`;
		case "failed":
			return `Query Run failed on ${connectionName}`;
		case "done":
			break;
	}
	if (paging === "all") {
		return [`Loading all: ${recordCount(loaded, "loaded so far")}`, connectionName].join(" · ");
	}
	if (paging === "next") {
		return [recordCount(loaded, "loaded"), "loading the next page", connectionName].join(" · ");
	}
	return [recordCount(loaded, "loaded"), serverState(input), elapsedMs === null ? null : `last request ${Math.round(elapsedMs)} ms`, connectionName]
		.filter((part) => part !== null)
		.join(" · ");
};
