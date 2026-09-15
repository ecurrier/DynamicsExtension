# Side Panel Surface

Status: resolved
Type: task

See `../spec.md`, "Side panel surface".

- Add `sidePanel` to `permissions` and a `side_panel: { default_path: "sidepanel.html" }` manifest key in `wxt.config.ts`.
- New entrypoint `src/entrypoints/sidepanel/{index.html,main.tsx}` mounting the same React root as `src/entrypoints/popup/main.tsx`, setting `document.documentElement.dataset.mode = "sidepanel"`.
- Extend `PopupMode` in `src/shared/extension/popupWindow.ts:5` to `"popup" | "window" | "sidepanel"`, and teach `readPopupLaunch()` to return the panel mode with `tabId: null` so the panel resolves the active tab like the popup does.
- Add a `html[data-mode="sidepanel"]` layout to `src/app/popup.css` sized `100%/100%` with no fixed width.
- Make `src/shared/components/TaskCard/TaskGrid.tsx` collapse to one column below a breakpoint.
- In `src/workspaces/useWorkspaceLauncher.ts:10`, keep `canOpenInWindow` false for the panel so `WorkspaceLaunchButton` offers the tab target only.
- In `src/app/App.tsx`, treat the panel like the pinned window for `HostAccessBanner` and the followed-tab indicator, and follow the active tab through `tabs.onActivated` when its url matches a Dynamics host, otherwise keep the last binding and show the recovery state from `01`.
- Harness: shim `chrome.sidePanel` (`setOptions`, `setPanelBehavior`, `open`) in `dev/harness/chrome-shim.js` and emit `harness-sidepanel.html`; document `?mode=sidepanel` in `dev/harness/README.md`.

Blocked by: 01

## Comments

`canOpenInWindow` needed no change: `src/workspaces/useWorkspaceLauncher.ts:10` already reads `mode === "window"`, so a `sidepanel` mode is false by construction and `WorkspaceLaunchButton` offers the tab target only. The pin button needed no change either, for the same reason — `onPin` in `src/app/App.tsx` is already gated on `mode === "popup"`.

Mode detection does not rely on a query string. `readPopupLaunch` accepts `?mode=sidepanel` but also recognises a document whose pathname contains `sidepanel`, so the manifest can keep a plain `default_path` and the harness page works under the clean URL `serve` redirects to. Both entrypoints now call a shared `mountApp` in `src/app/mount.tsx`, so the panel provably runs the same React root as the popup rather than a copy that can drift.

The initial-connect failure status is now `"lost"` for the window and the panel and stays `"unavailable"` only for the popup. A popup that opens on a non-Dynamics tab genuinely is a dead end — it cannot follow anything — whereas a window or panel should offer the picker. `TabRecoveryBanner` gained a `variant`: `"lost"` ("Power Tools lost its tab") for the window, which was opened from one specific tab, and `"unbound"` ("No Dynamics tab connected") for the panel, which follows whatever is active.

The responsive grid is a **container** query, not a media query. A media query was written first and was wrong: it keys off the viewport, so the popup collapsed to one column whenever the browser viewport was under the breakpoint even though the popup root is a fixed 700px. Verification caught this — the harness popup showed a single 653px column. `TaskGrid` now wraps its grid in a `container-type: inline-size` element and queries `@container (max-width: 560px)`, which measures the space the cards actually have. Confirmed two columns at popup width with a zero-width viewport, and one column at 400px.

Verified in the harness: the panel reports `mode: "sidepanel"` from the path alone, has no fixed width and no pin button, renders one column of 368px at 400px wide with no horizontal overflow, and the popup still renders two columns of 320.5px. Activating a Dynamics tab rebinds the panel to it and moves the bound-tab watcher with it; activating `make.powerapps.com` is ignored entirely and the binding survives. With no Dynamics tab open the panel shows "No Dynamics tab connected" with no picker and a "Check again" action.

Not reachable from the harness and still needing an unpacked load in Chrome: whether `side_panel.default_path` behaves as expected, and the real panel width. `03` covers the action-click behaviour that decides what the toolbar icon opens.

### Regression found and fixed after this issue was first marked resolved

Exporting `mount` from the `src/app` barrel made `popup.css` reachable from `@/app`, and all three Workspace entrypoints import `AppProviders` from there. Vite therefore bundled the popup stylesheet into the Data Transporter, Trace Viewer and Results Viewer pages, and its `width: 700px` on `html, body, #root` capped those full-window pages at popup width. The built HTML showed it plainly: every workspace page had picked up the shared `assets/app-*.css`, which is the file containing `700px`.

The fix is that an entrypoint owns its stylesheet, which is what `data-transporter/main.tsx` already did. `mountApp` no longer imports CSS; `popup/main.tsx` and `sidepanel/main.tsx` each import `@/app/popup.css` themselves. After the change the cap lives only in the popup bundle, loaded only by `popup.html` and `sidepanel.html`.

The general rule this cost: a module reachable from a barrel must not carry a CSS side-effect import, because every consumer of the barrel inherits it invisibly.

Re-verified at a 1200px viewport: Data Transporter, Trace Viewer and Results Viewer all fill the window; the popup is still capped at 700px with two columns; the panel is still 400px wide with one column and no horizontal overflow.
