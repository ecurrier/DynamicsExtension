import { describe, expect, it } from "vitest";

import { rowKeyAction } from "./rowKeys";

describe("rowKeyAction", () => {
	it("opens the row on Enter, with or without selection", () => {
		expect(rowKeyAction("Enter", false)).toBe("open");
		expect(rowKeyAction("Enter", true)).toBe("open");
	});

	it("opens the row on Space when the table has no selection", () => {
		expect(rowKeyAction(" ", false)).toBe("open");
	});

	it("leaves Space alone when the table has selection, because Fluent toggles it", () => {
		expect(rowKeyAction(" ", true)).toBe("none");
	});

	it("ignores every other key", () => {
		expect(rowKeyAction("a", false)).toBe("none");
		expect(rowKeyAction("ArrowDown", false)).toBe("none");
	});
});
