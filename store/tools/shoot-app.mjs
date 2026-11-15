// Captures the six Power Tools screens from the dev harness at 2x for the store listing.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { HIDE_SCROLLBARS, launch, newPage } from "./cdp.mjs";

const OUT = join(import.meta.dirname, "raw");
mkdirSync(OUT, { recursive: true });

const BASE = "http://localhost:5173";
const POPUP = `${BASE}/harness?mode=window&tabId=1&granted=1`;

// Width/height the app itself is laid out at. 1.75 ratio to sit in the composed 1280x800 frame.
const W = 1200;
const H = 686;

// Installed into the page once, then used by each recipe.
const HELPERS = `
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const waitFor = async (fn, ms = 8000) => {
    const t0 = Date.now();
    for (;;) { const v = fn(); if (v) return v; if (Date.now() - t0 > ms) return null; await sleep(100); }
  };
  window.__sleep = sleep;
  window.__waitFor = waitFor;
  window.__byLabel = (label) => [...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === label);
  window.__byText = (text) => [...document.querySelectorAll('button')].find(b => (b.textContent || '').trim() === text);
  window.__nav = async (moduleLabel, areaLabel) => {
    let drawer = document.querySelector('.fui-OverlayDrawer');
    if (!drawer) {
      document.querySelector('button[aria-label^="Navigation"]').click();
      drawer = await waitFor(() => document.querySelector('.fui-OverlayDrawer'));
      if (!drawer) throw new Error('drawer never opened');
      await sleep(400);
    }
    const pick = (t) => [...drawer.querySelectorAll('button')].find(b => (b.textContent || '').trim() === t);
    const target = areaLabel || moduleLabel;
    if (!pick(target)) { pick(moduleLabel)?.click(); await sleep(550); }
    const el = pick(target);
    if (!el) throw new Error('area not found: ' + target);
    el.click();
    await sleep(1600);
  };
  return 'helpers ready';
`;

const shots = [
	{
		name: "01-utilities-admin",
		url: POPUP,
		setup: `
      await window.__sleep(1800);
      await window.__nav('Utilities', 'Admin');
      await window.__sleep(1200);
      return document.body.innerText.slice(0, 80);
    `,
	},
	{
		name: "02-table-automation",
		url: POPUP,
		setup: `
      await window.__sleep(1800);
      await window.__nav('Investigate', 'Table Automation');
      await window.__sleep(900);
      window.__byLabel('Use the table from the current page').click();
      await window.__waitFor(() => document.body.innerText.includes('registrations'));
      await window.__sleep(900);
      // Open the cloud flow triggers section so the Area shows its full depth.
      const flows = window.__byText('Cloud flow trigger registrations (1)')
        || [...document.querySelectorAll('button')].find(b => b.textContent.includes('Cloud flow trigger registrations'));
      if (flows) { flows.click(); await window.__sleep(1000); }
      // Move the pointer off the button so its tooltip is not in the shot.
      document.body.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 500, bubbles: true }));
      await window.__sleep(600);
      return document.body.innerText.slice(0, 80);
    `,
	},
	{
		name: "03-record-columns",
		url: POPUP,
		setup: `
      await window.__sleep(1800);
      await window.__nav('Web API', 'Record Columns');
      await window.__waitFor(() => document.body.innerText.includes('Account Name'));
      await window.__sleep(1200);
      return document.body.innerText.slice(0, 80);
    `,
	},
	{
		name: "04-codegen-generate",
		url: POPUP,
		setup: `
      await window.__sleep(1800);
      await window.__nav('Code Generation', 'Generate');
      await window.__waitFor(() => document.body.innerText.includes('namespace'));
      await window.__sleep(1400);
      return document.body.innerText.slice(0, 80);
    `,
	},
	{
		name: "05-role-compare",
		url: `${BASE}/harness-security?granted=1`,
		setup: `
      await window.__waitFor(() => document.body.innerText.includes('Basic User'), 12000);
      await window.__sleep(800);
      const rowOf = (cb) => cb.closest('tr, [role="row"], li') || cb.parentElement?.parentElement;
      for (const want of ['Basic User', 'Sales Manager', 'System Customizer']) {
        const hit = [...document.querySelectorAll('input[type="checkbox"]')]
          .find(cb => (rowOf(cb)?.innerText || '').trim().startsWith(want));
        if (!hit) throw new Error('role row not found: ' + want);
        hit.click();
        await window.__sleep(500);
      }
      await window.__waitFor(() => document.body.innerText.includes('privileges differ'), 12000);
      await window.__sleep(1400);
      // The matrix is the payoff, so run the page down to give it the frame. The matrix has a
      // scroller of its own; leave that at the top, or its first row is clipped by the header.
      document.scrollingElement.scrollTop = document.scrollingElement.scrollHeight;
      for (const el of document.querySelectorAll('*')) {
        const o = getComputedStyle(el).overflowY;
        if ((o === 'auto' || o === 'scroll') && el.scrollHeight > el.clientHeight + 40) { el.scrollTop = 0; }
      }
      await window.__sleep(900);
      return document.body.innerText.slice(0, 80);
    `,
	},
	{
		name: "06-plugin-traces",
		url: `${BASE}/harness-traces?granted=1`,
		setup: `
      await window.__waitFor(() => document.body.innerText.includes('loaded'), 12000);
      await window.__sleep(1800);
      return document.body.innerText.slice(0, 80);
    `,
	},
];

const browser = await launch({ port: 9333 });
try {
	const page = await newPage(browser, { width: W, height: H, deviceScaleFactor: 2 });
	const only = process.env.ONLY;
	for (const shot of shots.filter((s) => !only || s.name.startsWith(only))) {
		await page.goto(shot.url, { waitMs: 1200 });
		await page.evaluate(HIDE_SCROLLBARS);
		await page.evaluate(HELPERS);
		const note = await page.evaluate(shot.setup);
		const png = await page.screenshot();
		writeFileSync(join(OUT, `${shot.name}.png`), png);
		console.log(`${shot.name}  ${(png.length / 1024).toFixed(0)} KB  ${String(note).replace(/\s+/g, " ").slice(0, 60)}`);
	}
} finally {
	browser.close();
}
