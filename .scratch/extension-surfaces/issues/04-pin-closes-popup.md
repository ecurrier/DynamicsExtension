# Pin Closes The Popup

Status: resolved
Type: task

See `../spec.md`, decision 5.

- In `src/app/App.tsx:100`, call `window.close()` after `openPinnedWindow(tabId)` resolves so the popup does not linger behind the new window.
- Keep `onPin` supplied only when `launch.mode === "popup"`, so the side panel renders no pin button; Chrome exposes no way to close a side panel, and the panel is already persistent.
- Leave the "go to the tab this window follows" control in `src/shared/components/AppShell/AppShell.tsx:102-106` wired for the pinned window and the panel.
- Harness: `chrome.windows.create` already logs, so assert the popup close happens after the window opens rather than before.

Blocked by: 02

## Comments

The focus-tab bullet said to leave that control wired for the pinned window and the panel, but it was window-only, so wiring it for the panel was a change rather than a no-op. It earns its place there: the panel keeps its binding when the user moves to a non-Dynamics tab, and in that state no banner is shown, so this button is the only way back to the tab Power Tools is reading. The `describeTab` effect and `readConnectedTab` in `src/app/App.tsx` were also gated on window mode, so they were relaxed from `mode !== "window"` to `mode === "popup"`; without that the panel would have shown the button with no tab label and no disabled state.

That made the tooltip copy wrong, since it said "the tab this window follows" and the panel is not a window. `tabTooltip` and the `AppShell` default are now surface-neutral — "Go to the tab Power Tools is reading" — and `tabLabel.test.ts` was updated to pin the new strings. The toast title and the closed-tab error message changed with it, the latter now pointing at the recovery banner rather than telling the user to reopen the extension, which is no longer the only option.

Verified in the harness: clicking pin records `windows.create called`, `windows.create resolved`, `window.close` in that order, so the popup goes away only once the window exists. Toolbars are correct per Surface — the popup has the side panel and pin buttons and no return-to-tab, the pinned window has return-to-tab and the side panel button and no pin, and the panel has return-to-tab only, with the bound tab named in its label. Note the harness `windows.create` calls `window.open`, which replaces the current in-app browser tab, so observing the ordering needs `chrome.windows.create` stubbed rather than wrapped.
