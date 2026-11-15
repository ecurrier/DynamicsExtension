// Renders each logo candidate at 300x300 plus a contact sheet showing them at store
// size and at 16/32/48 px, so the small-size legibility is visible before choosing.
import { join } from "node:path";

import { boltTile, bracketBolt, socketBolt } from "./logos.mjs";
import { doc, render, renderClose, renderInit } from "./render.mjs";

const OUT = join(import.meta.dirname, "logo");

const candidates = [
	["A", "Bolt", boltTile],
	["B", "Socket", socketBolt],
	["C", "Brackets", bracketBolt],
];

await renderInit();
try {
	for (const [key, , svg] of candidates) {
		await render(doc(svg()), { width: 300, height: 300, out: join(OUT, `logo-${key}.png`) });
	}

	// Contact sheet: each candidate large, then shrunk to the sizes that actually decide it.
	const cell = ([key, name, svg]) => `
    <div class="cell">
      <div class="big">${svg()}</div>
      <div class="name">${key} &middot; ${name}</div>
      <div class="row">
        <div class="s"><div style="width:48px;height:48px">${svg()}</div><span>48</span></div>
        <div class="s"><div style="width:32px;height:32px">${svg()}</div><span>32</span></div>
        <div class="s"><div style="width:16px;height:16px">${svg()}</div><span>16</span></div>
      </div>
    </div>`;

	const css = `
    body{background:#F3F4F6;font:400 13px/1.4 "Segoe UI",system-ui,sans-serif;color:#1F2937;
         display:flex;align-items:center;justify-content:center;gap:42px;padding:34px}
    .cell{display:flex;flex-direction:column;align-items:center;gap:14px}
    .big{width:180px;height:180px}
    .big svg{width:100%;height:100%;display:block}
    .name{font-weight:600;font-size:15px}
    .row{display:flex;align-items:flex-end;gap:18px;background:#fff;border:1px solid #E5E7EB;
         border-radius:10px;padding:12px 18px}
    .s{display:flex;flex-direction:column;align-items:center;gap:6px}
    .s svg{width:100%;height:100%;display:block}
    .s span{font-size:11px;color:#6B7280}`;

	await render(doc(candidates.map(cell).join(""), css), { width: 900, height: 390, out: join(OUT, "contact-sheet.png"), deviceScaleFactor: 2 });
	console.log("logos written to", OUT);
} finally {
	await renderClose();
}
