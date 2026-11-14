import { describe, expect, it } from "vitest";

import { buildSafeContext, describeBrowser, describePlatform, type SafeContextInput } from "./context";

const EDGE = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0";
const CHROME_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";

const INPUT: SafeContextInput = {
	version: "2.5.0",
	userAgent: EDGE,
	uaPlatform: null,
	language: "en-GB",
	surface: "sidepanel",
	areaId: "webapi.record-columns",
	pageContext: "model-driven-app",
	theme: "system",
};

describe("describeBrowser", () => {
	it("picks Edge over the Chrome token Edge also carries", () => {
		expect(describeBrowser(EDGE)).toBe("Edge 131");
	});

	it("reads Chrome", () => {
		expect(describeBrowser(CHROME_MAC)).toBe("Chrome 131");
	});

	it("says so rather than guessing", () => {
		expect(describeBrowser("Some other agent")).toBe("Unknown browser");
	});
});

describe("describePlatform", () => {
	it("prefers the browser's own answer over the agent string", () => {
		expect(describePlatform(EDGE, "macOS")).toBe("macOS");
	});

	it("falls back to the agent string", () => {
		expect(describePlatform(CHROME_MAC)).toBe("macOS");
		expect(describePlatform(EDGE)).toBe("Windows");
	});

	it("picks Android over the Linux token Android also carries", () => {
		expect(describePlatform(ANDROID)).toBe("Android");
	});
});

describe("buildSafeContext", () => {
	it("produces the safe list and nothing else", () => {
		expect(buildSafeContext(INPUT)).toEqual({
			version: "2.5.0",
			browser: "Edge 131",
			platform: "Windows",
			surface: "Side panel",
			areaId: "webapi.record-columns",
			pageContext: "Model-driven app",
			theme: "System",
			language: "en-GB",
		});
	});

	it("names the page as None rather than inventing one", () => {
		expect(buildSafeContext({ ...INPUT, pageContext: null }).pageContext).toBe("None");
	});

	it("spells out each Surface", () => {
		expect(buildSafeContext({ ...INPUT, surface: "popup" }).surface).toBe("Popup");
		expect(buildSafeContext({ ...INPUT, surface: "window" }).surface).toBe("Pinned window");
	});
});
