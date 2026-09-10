import { describe, expect, it, vi } from "vitest";

import { type RetrievePageRequest } from "@/shared/types";

import { retrieveAllRows } from "./retrieveAll";

const pages = (sizes: number[]) => {
	let index = 0;
	return vi.fn(async (request: RetrievePageRequest) => {
		const size = sizes[index] ?? 0;
		const rows = Array.from({ length: size }, (_, offset) => ({ id: `${index}-${offset}`, link: request.nextLink }));
		index += 1;
		return { rows, nextLink: index < sizes.length ? `next-${index}` : null };
	});
};

describe("retrieveAllRows", () => {
	it("follows next links and reports progress", async () => {
		const retrievePage = pages([2, 2, 1]);
		const progress: number[] = [];
		const result = await retrieveAllRows(retrievePage, { entitySetName: "accounts", fetchXml: "<fetch/>", maxRows: 100, pageSize: 2 }, (count) =>
			progress.push(count)
		);
		expect(result).toEqual({ rows: expect.any(Array), truncated: false });
		expect(result.rows).toHaveLength(5);
		expect(progress).toEqual([2, 4, 5]);
		expect(retrievePage.mock.calls.map(([request]) => [request.fetchXml, request.nextLink])).toEqual([
			["<fetch/>", null],
			[null, "next-1"],
			[null, "next-2"],
		]);
	});

	it("stops at the row cap and honours cancellation", async () => {
		const capped = await retrieveAllRows(pages([3, 3]), {
			entitySetName: "accounts",
			fetchXml: "x",
			maxRows: 4,
			pageSize: 3,
		});
		expect(capped.rows).toHaveLength(4);
		expect(capped.truncated).toBe(true);
		const controller = new AbortController();
		controller.abort();
		const cancelled = await retrieveAllRows(
			pages([3]),
			{ entitySetName: "accounts", fetchXml: "x", maxRows: 10, pageSize: 3 },
			undefined,
			controller.signal
		);
		expect(cancelled).toEqual({ rows: [], truncated: true });
	});
});
