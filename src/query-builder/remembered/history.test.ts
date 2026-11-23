import { describe, expect, it } from "vitest";

import { type QueryHistory, type QueryHistoryEntry } from "@/shared/storage";

import { clearHistory, filterHistory, firstLine, QUERY_HISTORY_LIMIT, recordRun, sameConnection, summarizeHistoryEntry } from "./history";

const ACCOUNTS = '<fetch top="5"><entity name="account"><attribute name="name" /></entity></fetch>';
const ACCOUNTS_FORMATTED = `<fetch top="5">\n\t<entity name="account">\n\t\t<attribute name="name" />\n\t</entity>\n</fetch>`;
const CONTACTS = '<fetch><entity name="contact" /></fetch>';

const entry = (overrides: Partial<QueryHistoryEntry> = {}): QueryHistoryEntry => ({
	fetchXml: ACCOUNTS,
	connection: { kind: "page", host: "contoso.crm.dynamics.com" },
	connectionLabel: "Current page",
	ranAt: 1000,
	outcome: { kind: "records", count: 5, moreRecords: false },
	elapsedMs: 120,
	...overrides,
});

const DEV = { kind: "environment", environmentId: "dev" } as const;

describe("recordRun", () => {
	it("adds a new entry to the top", () => {
		const history = recordRun([entry({ fetchXml: CONTACTS, ranAt: 1 })], entry({ ranAt: 2 }));
		expect(history.map((item) => item.ranAt)).toEqual([2, 1]);
	});

	it("moves the same Fetch XML on the same Connection to the top with the new time, count and elapsed time", () => {
		const start = recordRun(recordRun([], entry({ ranAt: 1 })), entry({ fetchXml: CONTACTS, ranAt: 2 }));
		const history = recordRun(
			start,
			entry({ fetchXml: ACCOUNTS_FORMATTED, ranAt: 3, outcome: { kind: "records", count: 7, moreRecords: true }, elapsedMs: 80 })
		);
		expect(history).toHaveLength(2);
		expect(history[0]).toMatchObject({ ranAt: 3, fetchXml: ACCOUNTS_FORMATTED, outcome: { kind: "records", count: 7, moreRecords: true }, elapsedMs: 80 });
		expect(history[1]?.fetchXml).toBe(CONTACTS);
	});

	it("keeps separate entries for different Connections", () => {
		const onPage = recordRun([], entry({ ranAt: 1 }));
		const onDev = recordRun(onPage, entry({ ranAt: 2, connection: DEV, connectionLabel: "Dev" }));
		const onOtherPage = recordRun(onDev, entry({ ranAt: 3, connection: { kind: "page", host: "fabrikam.crm.dynamics.com" } }));
		expect(onOtherPage.map((item) => item.ranAt)).toEqual([3, 2, 1]);
		const again = recordRun(onOtherPage, entry({ ranAt: 4, connection: { kind: "environment", environmentId: "dev" } }));
		expect(again.map((item) => item.ranAt)).toEqual([4, 3, 1]);
	});

	it("records failed runs with only the first line of the error", () => {
		const history = recordRun([], entry({ outcome: { kind: "error", message: "\nThe attribute is missing.\nat line 3\nmore detail" } }));
		expect(history[0]?.outcome).toEqual({ kind: "error", message: "The attribute is missing." });
	});

	it("caps the history at the limit, dropping the oldest", () => {
		let history: QueryHistory = [];
		for (let index = 0; index < QUERY_HISTORY_LIMIT + 5; index += 1) {
			history = recordRun(history, entry({ fetchXml: `<fetch top="${index + 1}"><entity name="account" /></fetch>`, ranAt: index }));
		}
		expect(history).toHaveLength(QUERY_HISTORY_LIMIT);
		expect(history[0]?.ranAt).toBe(QUERY_HISTORY_LIMIT + 4);
		expect(history.at(-1)?.ranAt).toBe(5);
	});

	it("does not change the history it is given", () => {
		const history = Object.freeze([Object.freeze(entry({ ranAt: 1 }))]) as unknown as QueryHistory;
		const next = recordRun(history, entry({ ranAt: 2 }));
		expect(history).toHaveLength(1);
		expect(history[0]?.ranAt).toBe(1);
		expect(next).not.toBe(history);
	});
});

describe("sameConnection", () => {
	it("compares page hosts ignoring case and Environments by id", () => {
		expect(sameConnection({ kind: "page", host: "Contoso.crm.dynamics.com" }, { kind: "page", host: "contoso.crm.dynamics.com" })).toBe(true);
		expect(sameConnection(DEV, { kind: "environment", environmentId: "test" })).toBe(false);
		expect(sameConnection(DEV, { kind: "page", host: "dev" })).toBe(false);
	});
});

describe("firstLine", () => {
	it("returns the first non-empty line, trimmed", () => {
		expect(firstLine("  one  \r\ntwo")).toBe("one");
		expect(firstLine("")).toBe("");
	});
});

describe("clearHistory", () => {
	it("returns an empty history", () => {
		expect(clearHistory()).toEqual([]);
	});
});

describe("filterHistory", () => {
	const history = [
		entry({ ranAt: 1 }),
		entry({ ranAt: 2, fetchXml: CONTACTS, connection: DEV, connectionLabel: "Dev sandbox" }),
		entry({
			ranAt: 3,
			fetchXml: '<fetch><entity name="lead"><filter><condition attribute="subject" operator="like" value="%urgent%" /></filter></entity></fetch>',
		}),
	];

	it("returns everything for an empty filter", () => {
		expect(filterHistory(history, "  ")).toEqual(history);
	});

	it("matches the root Table, the Connection label and the Fetch XML, ignoring case", () => {
		expect(filterHistory(history, "CONTACT").map((item) => item.ranAt)).toEqual([2]);
		expect(filterHistory(history, "sandbox").map((item) => item.ranAt)).toEqual([2]);
		expect(filterHistory(history, "urgent").map((item) => item.ranAt)).toEqual([3]);
		expect(filterHistory(history, "nothing like this")).toEqual([]);
	});
});

describe("summarizeHistoryEntry", () => {
	it("names the root Table and the Record count", () => {
		expect(summarizeHistoryEntry(entry())).toEqual({ tableName: "account", title: "account", outcome: "5 Records", failed: false });
		expect(summarizeHistoryEntry(entry({ outcome: { kind: "records", count: 1, moreRecords: false } })).outcome).toBe("1 Record");
		expect(summarizeHistoryEntry(entry({ outcome: { kind: "records", count: 5000, moreRecords: true } })).outcome).toBe("5,000+ Records");
	});

	it("shows the error and falls back when the XML names no Table", () => {
		expect(summarizeHistoryEntry(entry({ fetchXml: "<fetch />", outcome: { kind: "error", message: "No Table" } }))).toEqual({
			tableName: null,
			title: "No Table",
			outcome: "No Table",
			failed: true,
		});
		expect(summarizeHistoryEntry(entry({ fetchXml: "<fetch><entity name='contact'" })).tableName).toBe("contact");
	});
});
