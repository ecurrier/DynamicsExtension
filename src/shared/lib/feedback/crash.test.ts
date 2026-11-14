import { describe, expect, it } from "vitest";

import { stackFrames, toCrashNote } from "./crash";

const STACK = [
	"TypeError: Cannot read properties of undefined (reading 'contoso_accountnumber')",
	"    at RecordColumns (chrome-extension://abc/chunks/record-columns.js:12:34)",
	"    at renderWithHooks (chrome-extension://abc/chunks/react.js:1:2)",
].join("\n");

describe("stackFrames", () => {
	it("drops the message line, so deleting the message actually deletes it", () => {
		const frames = stackFrames(STACK);
		expect(frames).not.toContain("contoso_accountnumber");
		expect(frames).not.toContain("TypeError");
		expect(frames.split("\n")).toHaveLength(2);
		expect(frames.startsWith("at RecordColumns")).toBe(true);
	});

	it("caps a deep stack and says how much it left out", () => {
		const deep = ["Error: boom", ...Array.from({ length: 40 }, (_, index) => `    at frame${index} (file.js:1:1)`)].join("\n");
		const lines = stackFrames(deep).split("\n");
		expect(lines).toHaveLength(26);
		expect(lines[25]).toBe("... 15 more frames");
	});

	it("copes with no stack at all", () => {
		expect(stackFrames("")).toBe("");
	});
});

describe("toCrashNote", () => {
	it("splits the part the user reviews from the part that is safe to attach", () => {
		const error = new TypeError("Cannot read properties of undefined (reading 'contoso_accountnumber')");
		error.stack = STACK;
		const note = toCrashNote(error);

		expect(note.detail).toBe("TypeError: Cannot read properties of undefined (reading 'contoso_accountnumber')");
		// The whole point: the message lives in one field only, so clearing that field is enough.
		expect(note.stack).not.toContain("contoso_accountnumber");
	});

	it("handles a thrown non-error", () => {
		expect(toCrashNote("just a string")).toEqual({ detail: "just a string", stack: "" });
	});
});
