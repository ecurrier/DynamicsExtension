import { describe, expect, it } from "vitest";

import { tidy } from "@/shared/lib/fetchxml";
import { parse } from "@/test/queryTree";

import { ancestorKeys, isRowPath, pathKey, pathMapping, remapKeys, remapPath, rowPathOf, samePath } from "./treePaths";

describe("path keys", () => {
	it("joins indexes and lists the ancestors of a path", () => {
		expect(pathKey([])).toBe("");
		expect(pathKey([0, 2, 1])).toBe("0.2.1");
		expect(ancestorKeys([0, 2, 1])).toEqual(["", "0", "0.2"]);
		expect(samePath([0, 1], [0, 1])).toBe(true);
		expect(samePath([0, 1], [0])).toBe(false);
		expect(samePath(null, null)).toBe(true);
	});
});

describe("rowPathOf", () => {
	const document = parse(
		'<fetch><entity name="account"><condition attribute="statecode" operator="in"><value>0</value><value>1</value></condition></entity></fetch>'
	);

	it("rolls a value element and its text up to the condition row", () => {
		expect(rowPathOf(document, [0, 0, 1])).toEqual([0, 0]);
		expect(rowPathOf(document, [0, 0, 1, 0])).toEqual([0, 0]);
		expect(rowPathOf(document, [0, 0])).toEqual([0, 0]);
		expect(isRowPath(document, [0, 0, 1])).toBe(false);
		expect(isRowPath(document, [0, 0])).toBe(true);
	});
});

describe("remapPath", () => {
	it("shifts later siblings and their descendants after an insert", () => {
		const shift = { kind: "insert", parent: [0], index: 1 } as const;
		expect(remapPath([0, 0], shift)).toEqual([0, 0]);
		expect(remapPath([0, 1], shift)).toEqual([0, 2]);
		expect(remapPath([0, 3, 2], shift)).toEqual([0, 4, 2]);
		expect(remapPath([0], shift)).toEqual([0]);
	});

	it("drops the removed node and everything under it", () => {
		const shift = { kind: "remove", path: [0, 1] } as const;
		expect(remapPath([0, 1], shift)).toBeNull();
		expect(remapPath([0, 1, 0], shift)).toBeNull();
		expect(remapPath([0, 2, 0], shift)).toEqual([0, 1, 0]);
		expect(remapPath([0, 0], shift)).toEqual([0, 0]);
	});

	it("follows a moved node and shifts the siblings it passed", () => {
		const down = { kind: "move", path: [0, 1], to: 2 } as const;
		expect(remapPath([0, 1, 3], down)).toEqual([0, 2, 3]);
		expect(remapPath([0, 2], down)).toEqual([0, 1]);
		expect(remapPath([0, 3], down)).toEqual([0, 3]);
		const up = { kind: "move", path: [0, 2], to: 1 } as const;
		expect(remapPath([0, 2], up)).toEqual([0, 1]);
		expect(remapPath([0, 1], up)).toEqual([0, 2]);
	});

	it("remaps a set of keys and forgets removed ones", () => {
		expect([...remapKeys(new Set(["0.1", "0.2", "0"]), { kind: "remove", path: [0, 1] })].sort()).toEqual(["0", "0.1"]);
	});
});

describe("pathMapping", () => {
	it("maps every node of an interleaved Query to where Tidy puts it", () => {
		const before = parse(
			'<fetch><entity name="account"><filter><condition attribute="name" operator="null" /><filter type="or"><condition attribute="a" operator="null" /></filter><condition attribute="b" operator="null" /></filter><attribute name="name" /></entity></fetch>'
		);
		const after = tidy(before);
		const mapping = pathMapping(before, after);
		expect(mapping.get("")).toEqual([]);
		expect(mapping.get("0.1")).toEqual([0, 0]);
		expect(mapping.get("0.0")).toEqual([0, 1]);
		expect(mapping.get("0.0.1")).toEqual([0, 1, 2]);
		expect(mapping.get("0.0.2")).toEqual([0, 1, 1]);
		expect(mapping.get("0.0.1.0")).toEqual([0, 1, 2, 0]);
	});
});
