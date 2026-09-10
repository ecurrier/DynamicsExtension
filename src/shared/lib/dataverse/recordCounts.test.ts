import { describe, expect, it } from "vitest";

import { createFakeHttp } from "@/test/fakeHttp";

import { mapRecordCounts, recordCountOperations } from "./recordCounts";

describe("mapRecordCounts", () => {
	it("zips the parallel key and value arrays the platform returns", () => {
		expect(mapRecordCounts({ EntityRecordCountCollection: { Keys: ["account", "contact"], Values: [12, 34] } })).toEqual([
			{ entityLogicalName: "account", count: 12 },
			{ entityLogicalName: "contact", count: 34 },
		]);
	});

	it("survives a missing collection", () => {
		expect(mapRecordCounts(undefined)).toEqual([]);
		expect(mapRecordCounts({ EntityRecordCountCollection: null })).toEqual([]);
	});
});

describe("recordCountOperations", () => {
	it("sorts largest first and reports tables the platform skipped", async () => {
		const { http } = createFakeHttp({
			RetrieveTotalRecordCount: { EntityRecordCountCollection: { Keys: ["contact", "account"], Values: [5, 900] } },
		});
		const result = await recordCountOperations(http).getRecordCounts({
			entityLogicalNames: ["account", "contact", "new_missing"],
		});
		expect(result.counts).toEqual([
			{ entityLogicalName: "account", count: 900 },
			{ entityLogicalName: "contact", count: 5 },
		]);
		expect(result.missing).toEqual(["new_missing"]);
	});

	it("batches large table lists rather than building one enormous URL", async () => {
		const { http, calls } = createFakeHttp({
			RetrieveTotalRecordCount: { EntityRecordCountCollection: { Keys: [], Values: [] } },
		});
		const names = Array.from({ length: 95 }, (_, index) => `new_table${index}`);
		await recordCountOperations(http).getRecordCounts({ entityLogicalNames: names });
		expect(calls).toHaveLength(3);
	});

	it("rejects anything that is not a logical name", async () => {
		const { http } = createFakeHttp({});
		await expect(recordCountOperations(http).getRecordCounts({ entityLogicalNames: ["account'; drop"] })).rejects.toThrow("not a valid logical name");
	});
});
