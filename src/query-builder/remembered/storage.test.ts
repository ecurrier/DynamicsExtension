import { describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";

import { queryHistoryItem, storedQueriesItem, workingQueryItem } from "@/shared/storage";

import { recordRun } from "./history";
import { addStoredQuery } from "./storedQueries";

const ACCOUNTS = '<fetch><entity name="account" /></fetch>';

describe("remembered Query storage", () => {
	it("defaults to no working Query, no history and no Stored Queries", async () => {
		expect(await workingQueryItem.getValue()).toBeNull();
		expect(await queryHistoryItem.getValue()).toEqual([]);
		expect(await storedQueriesItem.getValue()).toEqual({});
	});

	it("round-trips each item under its own local key", async () => {
		await workingQueryItem.setValue({ fetchXml: ACCOUNTS, writtenAt: 10 });
		const history = recordRun([], {
			fetchXml: ACCOUNTS,
			connection: { kind: "environment", environmentId: "dev" },
			connectionLabel: "Dev",
			ranAt: 20,
			outcome: { kind: "records", count: 3, moreRecords: false },
			elapsedMs: 40,
		});
		await queryHistoryItem.setValue(history);
		const added = addStoredQuery({}, { id: "s1", name: "Accounts", fetchXml: ACCOUNTS, now: 30 });
		if (!added.ok) {
			throw new Error(added.reason);
		}
		await storedQueriesItem.setValue(added.storedQueries);

		expect(await workingQueryItem.getValue()).toEqual({ fetchXml: ACCOUNTS, writtenAt: 10 });
		expect(await queryHistoryItem.getValue()).toEqual(history);
		expect(await storedQueriesItem.getValue()).toEqual(added.storedQueries);
		const raw = await fakeBrowser.storage.local.get(["workingQuery", "queryHistory", "storedQueries"]);
		expect(Object.keys(raw).sort()).toEqual(["queryHistory", "storedQueries", "workingQuery"]);
	});
});
