// Minimal Chrome DevTools Protocol driver for headless Edge.
// No dependencies: Node 24 has a global WebSocket and fetch.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch({ port = 9333 } = {}) {
	const profile = mkdtempSync(join(tmpdir(), "pt-shots-"));
	const child = spawn(
		EDGE,
		[
			"--headless=new",
			`--remote-debugging-port=${port}`,
			`--user-data-dir=${profile}`,
			"--no-first-run",
			"--no-default-browser-check",
			"--disable-extensions",
			"--disable-gpu",
			"--hide-scrollbars",
			"--force-color-profile=srgb",
			"--font-render-hinting=none",
			"--disable-lcd-text",
			"about:blank",
		],
		{ stdio: "ignore", detached: false }
	);

	let version = null;
	for (let i = 0; i < 100; i++) {
		try {
			version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
			break;
		} catch {
			await sleep(150);
		}
	}
	if (!version) {
		child.kill();
		throw new Error("Edge did not expose a debugging port");
	}

	const ws = new WebSocket(version.webSocketDebuggerUrl);
	await new Promise((res, rej) => {
		ws.onopen = res;
		ws.onerror = rej;
	});

	let next = 1;
	const pending = new Map();
	const eventHandlers = [];
	ws.onmessage = (ev) => {
		const msg = JSON.parse(ev.data);
		if (msg.id && pending.has(msg.id)) {
			const { resolve, reject } = pending.get(msg.id);
			pending.delete(msg.id);
			if (msg.error) {
				reject(new Error(`${msg.error.message} (${JSON.stringify(msg.error.data ?? "")})`));
			} else {
				resolve(msg.result);
			}
		} else if (msg.method) {
			eventHandlers.forEach((h) => h(msg));
		}
	};

	const send = (method, params = {}, sessionId) =>
		new Promise((resolve, reject) => {
			const id = next++;
			pending.set(id, { resolve, reject });
			ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
			setTimeout(() => {
				if (pending.has(id)) {
					pending.delete(id);
					reject(new Error(`timeout: ${method}`));
				}
			}, 60000);
		});

	const close = () => {
		try {
			ws.close();
		} catch {}
		child.kill();
		setTimeout(() => {
			try {
				rmSync(profile, { recursive: true, force: true });
			} catch {}
		}, 500);
	};

	return { send, close, on: (h) => eventHandlers.push(h) };
}

export async function newPage(browser, { width, height, deviceScaleFactor = 2 }) {
	const { targetId } = await browser.send("Target.createTarget", { url: "about:blank" });
	const { sessionId } = await browser.send("Target.attachToTarget", { targetId, flatten: true });
	const call = (method, params) => browser.send(method, params, sessionId);

	await call("Page.enable");
	await call("Runtime.enable");
	await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor, mobile: false });

	const evaluate = async (expression) => {
		const { result, exceptionDetails } = await call("Runtime.evaluate", {
			expression: `(async () => { ${expression} })()`,
			awaitPromise: true,
			returnByValue: true,
		});
		if (exceptionDetails) {
			throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
		}
		return result.value;
	};

	const goto = async (url, { waitMs = 0 } = {}) => {
		const loaded = new Promise((resolve) => {
			const handler = (msg) => {
				if (msg.sessionId === sessionId && msg.method === "Page.loadEventFired") {
					resolve();
				}
			};
			browser.on(handler);
		});
		await call("Page.navigate", { url });
		await Promise.race([loaded, sleep(20000)]);
		if (waitMs) {
			await sleep(waitMs);
		}
	};

	const screenshot = async () => {
		const { data } = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, optimizeForSpeed: false });
		return Buffer.from(data, "base64");
	};

	const resize = (w, h, dsf = deviceScaleFactor) =>
		call("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: dsf, mobile: false });

	return { call, evaluate, goto, screenshot, resize, targetId, sessionId };
}

export const HIDE_SCROLLBARS = `
  const s = document.createElement('style');
  s.textContent = \`
    ::-webkit-scrollbar { width: 0 !important; height: 0 !important; display: none !important; }
    * { scrollbar-width: none !important; -ms-overflow-style: none !important; }
  \`;
  document.head.appendChild(s);
  return 'ok';
`;
