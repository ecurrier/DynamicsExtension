import { describe, expect, it } from "vitest";

import { isTypingTarget } from "./navShortcut";

const element = (tag: string, attributes: Record<string, string> = {}) => {
	const node = { tagName: tag.toUpperCase(), isContentEditable: false, getAttribute: (name: string) => attributes[name] ?? null, ...attributes };
	return node as unknown as EventTarget;
};

describe("isTypingTarget", () => {
	it("knows a text field", () => {
		expect(isTypingTarget(element("input"))).toBe(true);
		expect(isTypingTarget(element("textarea"))).toBe(true);
	});

	it("knows a contenteditable element, which is how the code editor takes typing", () => {
		expect(isTypingTarget(element("div", { isContentEditable: true } as never))).toBe(true);
	});

	it("leaves every other target alone, so the shortcut still works there", () => {
		expect(isTypingTarget(element("button"))).toBe(false);
		expect(isTypingTarget(element("div"))).toBe(false);
		expect(isTypingTarget(null)).toBe(false);
	});
});
