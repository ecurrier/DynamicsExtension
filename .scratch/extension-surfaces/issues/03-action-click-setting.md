# Action Click Setting

Status: resolved
Type: task

See `../spec.md`, decision 4.

- Add `openSidePanelOnActionClick` to the extension settings schema in `src/shared/storage/`, defaulting to `false`.
- Call `browser.sidePanel.setPanelBehavior({ openPanelOnActionClick })` from `src/entrypoints/background.ts` on install and whenever the setting changes.
- Add the toggle to the Extension settings Area with help text saying the toolbar icon will open the panel instead of the popup, and that the popup stays reachable from the panel.
- Harness: seed the setting in both states and confirm the Extension settings Area renders the toggle.

Blocked by: 02

## Comments

No storage migration was needed. `settingsItem` carries `fallback: DEFAULT_SETTINGS` and `useExtensionSettings` reads `{ ...DEFAULT_SETTINGS, ...stored }`, so a settings object saved before this key existed resolves the new key to its default on read. A version bump would have changed nothing. The background does the same merge through `sidePanelBehavior`, which is the unit-tested seam: a stored object missing the key, an absent object, and both explicit values.

The settings UI needed only a `SETTING_DEFINITIONS` entry — `SETTING_SECTIONS` and the Extension settings Area are already driven off that list, so no Area code changed.

Beyond the issue, at the owner's request: an "Open in the side panel" toolbar button next to the pin, in `src/shared/components/AppShell/AppShell.tsx` and wired in `src/app/App.tsx`. Without it the only way to reach the panel before flipping the setting is Chrome's own side-panel dropdown, which is hard to find. It is shown whenever the surface is not already the panel, a tab is bound, and `chrome.sidePanel` exists. `openSidePanel` calls `browser.sidePanel.open({ tabId })` with no `await` before it, because `sidePanel.open` requires a user gesture and any prior await would break the gesture chain; passing `tabId` rather than `windowId` also avoids a `windows.getCurrent` round trip and works from the pinned window, whose own window cannot host a panel.

Verified in the harness: the Extension settings section renders "Open In Side Panel" under "Open Last Visited Page", and the toolbar button calls `sidePanel.open({ tabId: 1 })` and is absent inside the panel itself. `setPanelBehavior` actually changing what the toolbar icon does runs in the background service worker, which the harness does not execute, so that half is covered by the unit test and still needs an unpacked load in Chrome.
