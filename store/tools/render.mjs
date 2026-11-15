// Renders an HTML document in headless Edge at an exact pixel size and writes a PNG.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { launch, newPage } from "./cdp.mjs";

let browser = null;
let page = null;

export async function renderInit() {
	browser = await launch({ port: 9334 });
	page = await newPage(browser, { width: 400, height: 400, deviceScaleFactor: 1 });
}

export async function renderClose() {
	browser?.close();
	browser = null;
	page = null;
}

/**
 * html is a full document. Captured at exactly width x height device pixels.
 *
 * `transparent` is required for anything with rounded corners that is shown against a
 * surface we do not control — the logo and the toolbar icons. Without it the capture is
 * composited onto the browser's own white page and the PNG comes out with no alpha
 * channel at all, so the corners are opaque white squares. The tiles and screenshots are
 * full-bleed rectangles and want the opaque default.
 */
export async function render(html, { width, height, out, deviceScaleFactor = 1, waitMs = 350, transparent = false }) {
	await page.resize(width, height, deviceScaleFactor);
	const url = "data:text/html;charset=utf-8," + encodeURIComponent(html);
	await page.goto(url, { waitMs });
	// Set after navigating: a navigation drops the override.
	await page.call("Emulation.setDefaultBackgroundColorOverride", transparent ? { color: { r: 0, g: 0, b: 0, a: 0 } } : {});
	const png = await page.screenshot();
	mkdirSync(dirname(out), { recursive: true });
	writeFileSync(out, png);
	return png.length;
}

export const doc = (body, css = "") => `<!doctype html><html><head><meta charset="utf-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden}
  ::-webkit-scrollbar{display:none}
  ${css}
</style></head><body>${body}</body></html>`;
