// Composes each raw app capture onto a 1280x800 store canvas with its headline,
// and renders the two promotional tiles and the store logo.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { captions } from "./captions.mjs";
import { bracketBolt, bracketBoltSmall } from "./logos.mjs";
import { doc, render, renderClose, renderInit } from "./render.mjs";

const RAW = join(import.meta.dirname, "raw");
const OUT = join(import.meta.dirname, "out");

const dataUri = (path) => `data:image/png;base64,${readFileSync(path).toString("base64")}`;

const INK = "#131A2B";
const MUTED = "#55607A";
const FONT = `"Segoe UI", "Segoe UI Variable", system-ui, -apple-system, sans-serif`;

// Shared backdrop: a very light neutral with the brand's blue and violet bled into the corners.
const BACKDROP = `
  background:
    radial-gradient(900px 520px at 6% -8%, rgba(37,99,235,.16), transparent 62%),
    radial-gradient(820px 520px at 104% 110%, rgba(124,58,237,.17), transparent 60%),
    linear-gradient(140deg, #FBFCFF 0%, #F4F5FC 100%);`;

const mark = (size) => `<div class="mark" style="width:${size}px;height:${size}px">${bracketBolt({ radius: 22 })}</div>`;

const screenshot = ({ file, headline, sub }) => {
	const css = `
    body{width:1280px;height:800px;font-family:${FONT};${BACKDROP}
         display:flex;flex-direction:column;padding:42px 88px 32px}
    .top{display:flex;align-items:flex-start;gap:28px;margin-bottom:24px}
    .copy{flex:1 1 auto;min-width:0}
    h1{font-size:37px;line-height:1.16;font-weight:700;color:${INK};letter-spacing:-.6px}
    p{margin-top:11px;font-size:19.5px;line-height:1.42;color:${MUTED};max-width:1010px}
    .mark{flex:0 0 auto;margin-top:4px;border-radius:22px;
          box-shadow:0 8px 20px rgba(49,46,129,.26)}
    .mark svg{width:100%;height:100%;display:block;border-radius:22px}
    .shot{flex:1 1 auto;min-height:0;border-radius:15px;overflow:hidden;
          background:#fff;border:1px solid rgba(19,26,43,.11);
          box-shadow:0 26px 58px -22px rgba(19,26,43,.42), 0 5px 14px rgba(19,26,43,.07)}
    .shot img{width:100%;height:100%;object-fit:cover;object-position:top center;display:block}`;

	const body = `
    <div class="top">
      <div class="copy"><h1>${headline}</h1><p>${sub}</p></div>
      ${mark(58)}
    </div>
    <div class="shot"><img src="${dataUri(join(RAW, `${file}.png`))}"></div>`;

	return doc(body, css);
};

// Small promotional tile, 440x280. Seen small, so it carries the mark and the name only.
const smallTile = () => {
	const css = `
    body{width:440px;height:280px;font-family:${FONT};${BACKDROP}
         display:flex;flex-direction:column;align-items:center;justify-content:center;gap:17px;
         text-align:center;padding:0 30px}
    .mark{border-radius:20px;box-shadow:0 10px 24px rgba(49,46,129,.3)}
    .mark svg{width:100%;height:100%;display:block;border-radius:20px}
    h1{font-size:28px;line-height:1.14;font-weight:700;color:${INK};letter-spacing:-.4px}
    p{font-size:14.5px;line-height:1.35;color:${MUTED};font-weight:500}`;

	return doc(
		`${mark(78)}
     <h1>Power&nbsp;Tools</h1>
     <p>Developer &amp; admin tools for<br>Dynamics 365 and Power Platform</p>`,
		css
	);
};

// Large promotional tile, 1400x560. Mark and promise on the left, a real screen on the right.
const largeTile = () => {
	const css = `
    body{width:1400px;height:560px;font-family:${FONT};${BACKDROP}
         display:flex;align-items:center;gap:56px;padding:0 0 0 76px;overflow:hidden}
    .copy{flex:0 0 530px}
    .mark{border-radius:21px;box-shadow:0 11px 26px rgba(49,46,129,.3);margin-bottom:26px}
    .mark svg{width:100%;height:100%;display:block;border-radius:21px}
    h1{font-size:50px;line-height:1.08;font-weight:700;color:${INK};letter-spacing:-1.1px}
    h2{font-size:21px;line-height:1.4;font-weight:400;color:${MUTED};margin-top:16px}
    ul{margin-top:24px;display:flex;flex-wrap:wrap;gap:8px;list-style:none}
    li{font-size:14px;font-weight:600;color:#3A3F73;background:rgba(255,255,255,.82);
       border:1px solid rgba(49,46,129,.17);border-radius:999px;padding:7px 14px}
    .shot{flex:1 1 auto;align-self:stretch;margin:52px 0;border-radius:15px 0 0 15px;
          overflow:hidden;background:#fff;border:1px solid rgba(19,26,43,.11);border-right:0;
          box-shadow:0 28px 62px -24px rgba(19,26,43,.45)}
    .shot img{width:1180px;height:100%;object-fit:cover;object-position:top left;display:block}`;

	return doc(
		`<div class="copy">
       ${mark(84)}
       <h1>Power Tools</h1>
       <h2>Everything you keep opening another tab for, beside the app you are already in.</h2>
       <ul>
         <li>Table automation</li><li>Record columns</li><li>Fetch XML</li>
         <li>Code generation</li><li>Security roles</li><li>Plug-in traces</li>
       </ul>
     </div>
     <div class="shot"><img src="${dataUri(join(RAW, "02-table-automation.png"))}"></div>`,
		css
	);
};

await renderInit();
try {
	for (const entry of captions) {
		await render(screenshot(entry), { width: 1280, height: 800, out: join(OUT, "screenshots", `${entry.file}.png`), waitMs: 500 });
	}
	await render(smallTile(), { width: 440, height: 280, out: join(OUT, "promo", "small-tile-440x280.png"), waitMs: 450 });
	await render(largeTile(), { width: 1400, height: 560, out: join(OUT, "promo", "large-tile-1400x560.png"), waitMs: 500 });
	await render(doc(bracketBolt()), { width: 300, height: 300, out: join(OUT, "logo", "store-logo-300x300.png"), transparent: true });

	// The icons that ship inside the extension package. 16px uses the simplified mark:
	// at that size the brackets and the bolt are closer together than a pixel can resolve.
	for (const size of [16, 32, 48, 128]) {
		const css = `body{width:${size}px;height:${size}px}svg{width:100%;height:100%;display:block}`;
		const svg = size === 16 ? bracketBoltSmall : bracketBolt;
		await render(doc(svg({ radius: 66 }), css), {
			width: size,
			height: size,
			out: join(OUT, "logo", "icon", `${size}.png`),
			waitMs: 200,
			transparent: true,
		});
	}
	console.log("composed into", OUT);
} finally {
	await renderClose();
}
