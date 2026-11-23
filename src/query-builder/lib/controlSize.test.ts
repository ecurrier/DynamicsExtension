import { describe, expect, it } from "vitest";

import { CONTROL_CHROME, CONTROL_SIZES, fitControl, maxControlWidth } from "./controlSize";

describe("fitControl", () => {
	it("grows with the text between the kind's minimum and maximum, plus the control's chrome", () => {
		const { min, max } = CONTROL_SIZES.number;
		const chrome = CONTROL_CHROME.number;
		expect(fitControl("number", 0, "number")).toEqual({ width: min + chrome, clipped: false });
		expect(fitControl("number", 49.2, "number")).toEqual({ width: 50 + chrome, clipped: false });
		expect(fitControl("number", max, "number")).toEqual({ width: max + chrome, clipped: false });
		expect(fitControl("value", 66, "picker").width).toBe(66 + CONTROL_CHROME.picker);
	});

	it("clips past the maximum and says so", () => {
		expect(fitControl("column", 1000, "picker")).toEqual({ width: maxControlWidth("column", "picker"), clipped: true });
	});

	it("gives a seven-digit number room to be read whole", () => {
		const sevenDigits = 7 * 6.6;
		const fitted = fitControl("value", sevenDigits, "number");
		expect(fitted.clipped).toBe(false);
		expect(fitted.width).toBeGreaterThanOrEqual(Math.ceil(sevenDigits) + CONTROL_CHROME.number);
	});
});
