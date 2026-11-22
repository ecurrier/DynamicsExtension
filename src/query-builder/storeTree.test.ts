import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PAGE_CONNECTION } from "@/shared/connections";
import { LOADED, PENDING } from "@/test/queryTree";

import { addChild, moveRow, removeRow, tidyQuery, toggleRow } from "./lib";
import { createQueryBuilderStore, PARSE_DELAY_MS } from "./store";

const HAND_WRITTEN = '<fetch><entity name="account"><filter><condition attribute="name" operator="null"/></filter><attribute name="name"/></entity></fetch>';

const storeWith = (text = HAND_WRITTEN) => createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: text });

describe("tree edits in the Query Builder store", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("regenerates the XML in standard formatting and re-parses it at once", () => {
		const store = storeWith();
		store.getState().edit((query) => addChild(query, [0], "attribute", LOADED));
		const state = store.getState();
		expect(state.text).toBe(
			[
				"<fetch>",
				'  <entity name="account">',
				"    <filter>",
				'      <condition attribute="name" operator="null" />',
				"    </filter>",
				'    <attribute name="name" />',
				'    <attribute name="accountid" />',
				"  </entity>",
				"</fetch>",
			].join("\n")
		);
		expect(state.parsedText).toBe(state.text);
		expect(state.query?.root.children[0]).toMatchObject({ range: expect.anything() });
		expect(state.selectedPath).toEqual([0, 2]);
		expect(state.selectionOrigin).toBe("tree");
	});

	it("refuses a tree edit while the XML does not parse", () => {
		const store = storeWith();
		store.getState().setText("<fetch><entity>");
		expect(store.getState().edit((query) => removeRow(query, [0, 0]))).toEqual({ ok: false, reason: "The Fetch XML does not parse" });
		expect(store.getState().text).toBe("<fetch><entity>");
	});

	it("undoes and redoes tree edits from its own history when no editor is attached", () => {
		const store = storeWith();
		store.getState().select([0, 1]);
		store.getState().edit((query) => removeRow(query, [0, 1]));
		const removed = store.getState().text;
		expect(store.getState().selectedPath).toEqual([0, 0]);
		store.getState().undo();
		expect(store.getState().text).toBe(HAND_WRITTEN);
		expect(store.getState().selectedPath).toEqual([0, 1]);
		store.getState().redo();
		expect(store.getState().text).toBe(removed);
		store.getState().undo();
		store.getState().setText(`${HAND_WRITTEN} `);
		store.getState().redo();
		expect(store.getState().text).toBe(`${HAND_WRITTEN} `);
	});

	it("follows the editor's own undo and redo of a tree edit", () => {
		const store = storeWith();
		const editor = { undo: vi.fn(() => true), redo: vi.fn(() => true) };
		const detach = store.getState().attachEditor(editor);
		store.getState().edit((query) => toggleRow(query, [0, 1]));
		const off = store.getState().text;
		store.getState().undo();
		expect(editor.undo).toHaveBeenCalledOnce();
		store.getState().setText(HAND_WRITTEN);
		expect(store.getState().parsedText).toBe(HAND_WRITTEN);
		expect(store.getState().history.redo).toHaveLength(1);
		store.getState().setText(off);
		expect(store.getState().history.undo).toHaveLength(1);
		editor.undo.mockReturnValueOnce(false);
		store.getState().undo();
		expect(editor.undo).toHaveBeenCalledTimes(2);
		expect(store.getState().text).toBe(HAND_WRITTEN);
		store.getState().redo();
		detach();
		store.getState().undo();
		expect(editor.undo).toHaveBeenCalledTimes(2);
		expect(store.getState().text).toBe(HAND_WRITTEN);
	});

	it("keeps the selection and expansion on the same nodes through Tidy", () => {
		const store = storeWith();
		store.getState().setExpanded([0, 0], false);
		store.getState().select([0, 1]);
		store.getState().edit(tidyQuery);
		expect(store.getState().selectedPath).toEqual([0, 0]);
		expect([...store.getState().collapsed]).toEqual(["0.1"]);
		store.getState().undo();
		expect([...store.getState().collapsed]).toEqual(["0.0"]);
	});

	it("moves expansion with a row that moves", () => {
		const store = storeWith();
		store.getState().setExpanded([0, 0], false);
		store.getState().edit((query) => moveRow(query, [0, 0], 1));
		expect([...store.getState().collapsed]).toEqual(["0.1"]);
		expect(store.getState().selectedPath).toEqual([0, 1]);
	});

	it("selects the row under the editor's cursor and opens its ancestors", () => {
		const store = storeWith();
		store.getState().setExpanded([0, 0], false);
		store.getState().selectAtOffset(HAND_WRITTEN.indexOf("operator"));
		expect(store.getState().selectedPath).toEqual([0, 0, 0]);
		expect(store.getState().selectionOrigin).toBe("editor");
		expect(store.getState().collapsed.size).toBe(0);
	});

	it("waits for the parse before selecting from a cursor in changed text", () => {
		const store = storeWith();
		const changed = HAND_WRITTEN.replace('<attribute name="name"/>', '<attribute name="name"/><order attribute="name"/>');
		store.getState().setText(changed);
		store.getState().selectAtOffset(changed.indexOf("<order"));
		expect(store.getState().selectedPath).toBeNull();
		vi.advanceTimersByTime(PARSE_DELAY_MS);
		expect(store.getState().selectedPath).toEqual([0, 2]);
	});

	it("keeps the last valid Query, the selection and the expansion while the XML is broken", () => {
		const store = storeWith();
		store.getState().select([0, 0, 0]);
		store.getState().setExpanded([0, 0], false);
		const query = store.getState().query;
		store.getState().setText(HAND_WRITTEN.replace("</filter>", "</filte>"));
		vi.advanceTimersByTime(PARSE_DELAY_MS);
		expect(store.getState().errors.length).toBeGreaterThan(0);
		expect(store.getState().query).toBe(query);
		store.getState().setText(HAND_WRITTEN);
		vi.advanceTimersByTime(PARSE_DELAY_MS);
		expect(store.getState().errors).toEqual([]);
		expect(store.getState().selectedPath).toEqual([0, 0, 0]);
		expect([...store.getState().collapsed]).toEqual(["0.0"]);
	});

	it("swaps which name leads", () => {
		const store = storeWith();
		expect(store.getState().namesLead).toBe("logical");
		store.getState().setNamesLead("display");
		expect(store.getState().namesLead).toBe("display");
		expect(store.getState().edit((query) => addChild(query, [0], "order", PENDING)).ok).toBe(true);
	});
});
