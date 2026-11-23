import { describe, expect, it } from "vitest";

import { parseFetchXml } from "@/shared/lib/fetchxml";

import { describeParseError, positionAt } from "./textPosition";

describe("positionAt", () => {
	it("counts lines and columns from one", () => {
		expect(positionAt("abc", 0)).toEqual({ line: 1, column: 1 });
		expect(positionAt("abc\ndef", 5)).toEqual({ line: 2, column: 2 });
	});

	it("puts an offset just after a newline at the start of the next line", () => {
		expect(positionAt("a\n\nb", 3)).toEqual({ line: 3, column: 1 });
	});

	it("clamps an offset outside the text", () => {
		expect(positionAt("ab\ncd", 99)).toEqual({ line: 2, column: 3 });
		expect(positionAt("ab", -4)).toEqual({ line: 1, column: 1 });
	});
});

describe("describeParseError", () => {
	it("names the message with the line and column of the start of its range", () => {
		expect(describeParseError("<fetch>\n  <entity>", { message: "Missing closing tag", range: { from: 10, to: 18 } })).toBe(
			"Missing closing tag (line 2, column 3)"
		);
	});

	it("describes a real parse failure", () => {
		const text = '<fetch>\n  <entity name="account">\n</fetch>';
		const result = parseFetchXml(text);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(describeParseError(text, result.errors[0]!)).toMatch(/\(line \d+, column \d+\)$/);
		}
	});
});
