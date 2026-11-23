import { describe, expect, it } from "vitest";

import { type ConnectionTarget, PAGE_CONNECTION } from "@/shared/connections";

import { addableConnections, addConnection, connectionKey, removeConnection, sameConnection, setFirstConnection } from "./connectionList";

const DEV: ConnectionTarget = { kind: "environment", environmentId: "env-dev" };
const TEST: ConnectionTarget = { kind: "environment", environmentId: "env-test" };
const STAGING: ConnectionTarget = { kind: "environment", environmentId: "env-staging" };

describe("the Connection list", () => {
	it("gives each Connection a stable key", () => {
		expect(connectionKey(PAGE_CONNECTION)).toBe("page");
		expect(connectionKey(DEV)).toBe("environment:env-dev");
		expect(sameConnection(DEV, { kind: "environment", environmentId: "env-dev" })).toBe(true);
		expect(sameConnection(DEV, TEST)).toBe(false);
	});

	it("adds a Connection after the others", () => {
		expect(addConnection([PAGE_CONNECTION], DEV)).toEqual([PAGE_CONNECTION, DEV]);
	});

	it("does not add the same Environment or the page Connection twice", () => {
		const list = [PAGE_CONNECTION, DEV];
		expect(addConnection(list, { kind: "environment", environmentId: "env-dev" })).toBe(list);
		expect(addConnection(list, { kind: "page" })).toBe(list);
	});

	it("removes an added Connection but never the first", () => {
		const list = [PAGE_CONNECTION, DEV, TEST];
		expect(removeConnection(list, "environment:env-dev")).toEqual([PAGE_CONNECTION, TEST]);
		expect(removeConnection(list, "page")).toBe(list);
		expect(removeConnection(list, "environment:gone")).toBe(list);
	});

	it("replaces the first Connection with one that is not in the list", () => {
		expect(setFirstConnection([PAGE_CONNECTION, TEST], DEV)).toEqual([DEV, TEST]);
	});

	it("swaps when the new first Connection is already in the list", () => {
		expect(setFirstConnection([PAGE_CONNECTION, DEV, TEST], TEST)).toEqual([TEST, DEV, PAGE_CONNECTION]);
	});

	it("leaves the list as it is when the first Connection does not change", () => {
		const list = [PAGE_CONNECTION, DEV];
		expect(setFirstConnection(list, { kind: "page" })).toBe(list);
	});

	it("offers the page Connection and each Environment that is not in the list", () => {
		const environments = [
			{ id: "env-dev", name: "Contoso Dev" },
			{ id: "env-test", name: "Contoso Test" },
			{ id: "env-staging", name: "Contoso Staging" },
		];
		expect(addableConnections([DEV, STAGING], { pageAvailable: true, environments })).toEqual([
			{ key: "page", connection: PAGE_CONNECTION, name: "Current page" },
			{ key: "environment:env-test", connection: TEST, name: "Contoso Test" },
		]);
	});

	it("does not offer the page Connection without a source tab or when it is in the list", () => {
		const environments = [{ id: "env-test", name: "Contoso Test" }];
		expect(addableConnections([DEV], { pageAvailable: false, environments }).map((option) => option.key)).toEqual(["environment:env-test"]);
		expect(addableConnections([PAGE_CONNECTION], { pageAvailable: true, environments }).map((option) => option.key)).toEqual(["environment:env-test"]);
	});
});
