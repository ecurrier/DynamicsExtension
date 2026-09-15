# Tab Binding Recovery

Status: resolved
Type: task

See `../spec.md`, "Tab binding recovery".

- Add `webNavigation` to `permissions` in `wxt.config.ts`.
- Move `watchPinnedTab()` in `src/app/useSessionBootstrap.ts` out of the `launch.mode === "window"` branch so it installs for the pinned window and the side panel, taking the bound tab id rather than reading `launch.tabId`.
- Add a `browser.webNavigation.onHistoryStateUpdated` listener filtered to the bound tab: re-read `utilities.getPageTarget`, and when the `entityLogicalName`, `recordId`, `formId` or `viewId` differs from the last seen target, `setTab` and invalidate `pageKeys.tab(tabId)`.
- Revalidate the same way on surface focus.
- Replace the terminal `setBridgeStatus("unavailable")` on `tabs.onRemoved` with a recoverable `bridgeStatus` member, and surface a "Power Tools lost its tab" state in `src/shared/components/PageRequirementGate/PageRequirementGate.tsx` offering the tab from `getActiveTab` plus a picker over `describeTab` results for the `host_permissions` patterns.
- Pure helpers with tests in `src/app/lib/tabBinding.ts`: `pageTargetChanged` (compares two `PageTarget` values, ignoring `kind` churn), `bindingState` (reduces tab events to `bound | navigating | lost`).
- Harness: shim `browser.webNavigation.onHistoryStateUpdated` in `dev/harness/chrome-shim.js`, and add a control that fires a synthetic Record change plus one that removes the bound tab so the recovery state renders.

Blocked by: none

## Comments

Two deviations from the bullets above, both decided while implementing.

The focus poll this issue said to replace lives in `src/app/App.tsx:48-67`, not in `useSessionBootstrap.ts`, and it serves a different purpose: it reads `describeTab` to label the "go to the tab this window follows" button and to disable it when the tab is gone. Folding query revalidation into it would conflate the toolbar button with cache freshness, so it was left alone and a separate `window.addEventListener("focus", revalidate)` was added inside the watcher.

`bindingState` was not written. It would have reduced tab events to `bound | navigating | lost`, which is what `bridgeStatus` in `src/shared/stores/sessionStore.ts` already holds; a second source of truth for the same thing invites them to disagree. `bridgeStatus` gained a `"lost"` member instead. The second pure helper is `tabChoices`, which turns the `listOrgTabs` result into the picker options and falls back from title to host to tab id.

Also worth recording: the watcher is now keyed on the bound tab id rather than on the launch mode, so it installs in popup mode too. That is harmless there (the popup is destroyed on blur) and is what lets `02` inherit it for the side panel without touching this file.

Verified in the harness: a synthetic record navigation reads `utilities.getPageTarget` and invalidates `pageKeys.tab`, refetching the active queries; firing the same record id reads the target and invalidates nothing; a reload always invalidates; closing the bound tab renders the recovery banner; picking another tab rebinds and moves the watcher onto it, after which events for the old tab are ignored. `webNavigation.onHistoryStateUpdated` firing on a real model-driven app still needs an org.
