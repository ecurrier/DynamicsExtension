import { describe, expect, it } from "vitest";

import { clampPaneSize, dragResize, keyboardResize, paneBounds } from "./paneSize";

const bounds = { min: 100, max: 500 };

describe("clampPaneSize", () => {
	it("keeps a size inside its bounds", () => {
		expect(clampPaneSize(50, bounds)).toBe(100);
		expect(clampPaneSize(900, bounds)).toBe(500);
		expect(clampPaneSize(250.4, bounds)).toBe(250);
	});

	it("prefers the minimum when the container is too small for both panes", () => {
		expect(clampPaneSize(300, { min: 200, max: 120 })).toBe(200);
	});
});

describe("paneBounds", () => {
	it("leaves room for the other pane and the divider", () => {
		expect(paneBounds(1000, 200, 300, 8)).toEqual({ min: 200, max: 692 });
		expect(paneBounds(300, 200, 300, 8)).toEqual({ min: 200, max: 200 });
	});
});

describe("dragResize", () => {
	it("grows the pane before the divider as the pointer moves forward", () => {
		expect(dragResize({ startSize: 200, startPointer: 50, pointer: 90, reverse: false, bounds })).toBe(240);
	});

	it("grows the pane after the divider as the pointer moves back", () => {
		expect(dragResize({ startSize: 200, startPointer: 400, pointer: 340, reverse: true, bounds })).toBe(260);
	});

	it("stops at the bounds", () => {
		expect(dragResize({ startSize: 200, startPointer: 0, pointer: 1000, reverse: false, bounds })).toBe(500);
	});
});

describe("keyboardResize", () => {
	const base = { shiftKey: false, size: 200, bounds, step: 16 };

	it("moves a vertical divider with the left and right arrows", () => {
		expect(keyboardResize({ ...base, key: "ArrowRight", orientation: "vertical", reverse: false })).toBe(216);
		expect(keyboardResize({ ...base, key: "ArrowLeft", orientation: "vertical", reverse: false })).toBe(184);
	});

	it("grows a pane below a horizontal divider with the up arrow", () => {
		expect(keyboardResize({ ...base, key: "ArrowUp", orientation: "horizontal", reverse: true })).toBe(216);
		expect(keyboardResize({ ...base, key: "ArrowDown", orientation: "horizontal", reverse: true })).toBe(184);
	});

	it("takes bigger steps with Shift", () => {
		expect(keyboardResize({ ...base, shiftKey: true, key: "ArrowRight", orientation: "vertical", reverse: false })).toBe(264);
	});

	it("jumps to the bounds with Home and End", () => {
		expect(keyboardResize({ ...base, key: "Home", orientation: "vertical", reverse: false })).toBe(100);
		expect(keyboardResize({ ...base, key: "End", orientation: "vertical", reverse: false })).toBe(500);
	});

	it("ignores other keys and arrows across the divider", () => {
		expect(keyboardResize({ ...base, key: "a", orientation: "vertical", reverse: false })).toBeNull();
		expect(keyboardResize({ ...base, key: "ArrowUp", orientation: "vertical", reverse: false })).toBeNull();
	});
});
