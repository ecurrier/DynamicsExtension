import { describe, expect, it, vi } from "vitest";

import { PAGE_CONNECTION } from "@/shared/connections";

import { createQueryBuilderStore } from "./store";

const GOOD = '<fetch><entity name="account"><attribute name="name" /></entity></fetch>';
const VIEW = '<fetch>\n  <entity name="contact" />\n</fetch>';

describe("loading a Query into the store", () => {
	it("starts with the origin it is given", () => {
		const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: GOOD, origin: { storedQueryId: null, loadedText: GOOD } });
		expect(store.getState().origin).toEqual({ storedQueryId: null, loadedText: GOOD });
		expect(createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: null }).getState().origin).toEqual({ storedQueryId: null, loadedText: null });
	});

	it("replaces the Query and its origin in one undoable step", () => {
		const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: GOOD });
		store.getState().loadQuery(VIEW, { storedQueryId: "stored", loadedText: VIEW });
		expect(store.getState()).toMatchObject({ text: VIEW, origin: { storedQueryId: "stored", loadedText: VIEW }, selectedPath: null });
		expect(store.getState().query?.root.name).toBe("fetch");
		store.getState().undo();
		expect(store.getState()).toMatchObject({ text: GOOD, origin: { storedQueryId: null, loadedText: null } });
		store.getState().redo();
		expect(store.getState()).toMatchObject({ text: VIEW, origin: { storedQueryId: "stored", loadedText: VIEW } });
	});

	it("undoes a load back to an empty Workspace", () => {
		const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: null });
		store.getState().loadQuery(VIEW, { storedQueryId: null, loadedText: VIEW });
		store.getState().undo();
		expect(store.getState().text).toBe("");
		expect(store.getState().query).toBeNull();
	});

	it("travels with the editor when its undo restores the text", () => {
		const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: GOOD });
		store.getState().loadQuery(VIEW, { storedQueryId: "stored", loadedText: VIEW });
		store.getState().setText(GOOD);
		expect(store.getState().origin.storedQueryId).toBeNull();
	});

	it("only changes the origin when the text is the same", () => {
		const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: GOOD });
		store.getState().loadQuery(GOOD, { storedQueryId: "stored", loadedText: GOOD });
		expect(store.getState().history.undo).toHaveLength(0);
		expect(store.getState().origin.storedQueryId).toBe("stored");
	});

	it("keeps the origin through tree edits and records the stored id after a save", () => {
		const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: GOOD, origin: { storedQueryId: null, loadedText: GOOD } });
		store.getState().setStoredQuery("saved");
		expect(store.getState().origin).toEqual({ storedQueryId: "saved", loadedText: GOOD });
	});

	it("remembers the text of the last Query Run", () => {
		const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: GOOD });
		expect(store.getState().lastRunText).toBeNull();
		store.getState().startRun();
		expect(store.getState().lastRunText).toBe(GOOD);
	});

	it("shows the Fetch XML editor before it takes focus", () => {
		vi.useFakeTimers();
		const store = createQueryBuilderStore({ connection: PAGE_CONNECTION, fetchXml: null });
		const focus = vi.fn();
		store.getState().attachEditor({ undo: () => false, redo: () => false, focus });
		store.getState().togglePane("xml");
		store.getState().setXmlTab("webapi");
		store.getState().focusXml();
		vi.runAllTimers();
		expect(store.getState().layout.collapsed.xml).toBe(false);
		expect(store.getState().layout.xmlTab).toBe("fetchxml");
		expect(focus).toHaveBeenCalled();
		vi.useRealTimers();
	});
});
