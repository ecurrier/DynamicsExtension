# Extension Surfaces

Status: resolved
Decided: 2026-09-11

## Problem

Power Tools has two surfaces today: the popup, which dies on blur, and the pinned window, which stays open but breaks. Users want a third — docked in the browser side panel — so the Utilities they run constantly are always to hand.

The pinned window is already broken in two ways, and a docked panel would inherit both. When its tab closes, `tabs.onRemoved` sets `bridgeStatus("unavailable")` and there is no way back. When the user navigates from one Record to another, nothing fires: the watcher listens for `tabs.onUpdated` with `status === "complete"`, and a model-driven app is a single-page app whose Record navigation never produces that event, so every cached answer keeps describing the Record the user has left.

Fixing the binding before adding the panel means the panel is built on a surface that recovers.

## Vocabulary

Terms from `CONTEXT.md`: Area, Utility, Workspace, Page Bridge, Page Context, Page Requirement, Record, Table. New term this spec introduces: Surface.

## Decisions

1. **The bug ships first.** A docked panel persists across navigation exactly like a pinned window, so it inherits the dead-tab dead end and the stale cache. Adding the panel first would move a known defect onto the surface we expect people to live in.
2. **Three surfaces, one app.** The panel hosts the full Module and Area tree laid out responsively, not a reduced navigation. `PopupMode` grows a third member rather than the app forking.
3. **The panel is global.** It is offered on every tab, not only on Dynamics hosts, and shows a "navigate to a Dynamics page" state elsewhere. Per-tab enablement was considered and rejected as extra wiring for a politeness nobody asked for.
4. **The toolbar icon keeps opening the popup.** Chrome's `openPanelOnActionClick` suppresses the popup entirely, so this is a fork, not an addition. A setting flips it, defaulting off, matching the existing `controlEditorUseDefaultSolution` and `makerPortalUseCurrentEnvironment` pattern.
5. **Pin is hidden in the panel.** Chrome has no API to close a side panel, so "close the original window when pinning" cannot work from there. The panel is already the persistent surface, so pinning from it is redundant; `onPin` is supplied conditionally today, so this is a condition change.
6. **Workspaces open in a tab from the panel.** A Workspace cannot render in place at panel width, so `canOpenInWindow` stays false there and the tab target is used.
7. **Detection is belt and braces.** `webNavigation.onHistoryStateUpdated` catches in-app Record navigation precisely; revalidating on surface focus is the cheap backstop. Focus alone was rejected because a docked panel is focused while the tab beside it navigates, which is the common case.
8. **No Utility registry.** The eighteen hand-written cards stay as they are; only `TaskGrid` learns to collapse to one column. The registry is worth doing once panel usage is real, not as a precondition for it.

## Tab binding recovery

`watchPinnedTab()` moves out of the window-mode-only branch so it runs for the pinned window and the panel. It gains a `webNavigation.onHistoryStateUpdated` listener filtered to the bound tab, which re-reads `utilities.getPageTarget` and invalidates `pageKeys.tab(tabId)` when the Table, Record, form or view identity differs. Surface focus does the same comparison.

`tabs.onRemoved` no longer ends in a terminal state. The session reports a recoverable condition, and the shell offers the tab it can see through `getActiveTab` plus a picker over the Dynamics tabs `describeTab` can name.

## Side panel surface

A `sidepanel` entrypoint reusing the popup React root, a `side_panel` manifest key, and the `sidePanel` permission. `PopupMode` becomes `"popup" | "window" | "sidepanel"`, `readPopupLaunch` recognises the new mode, and `popup.css` gains a panel-width layout. The panel follows the active tab while it is a Dynamics host and otherwise keeps its last binding behind the recovery affordance.

## Verification

Pure helpers — the navigation-identity comparison and the binding state reducer — are unit tested. The harness covers panel-width layout and the recovery states once `chrome.sidePanel` is shimmed. The real panel, `openPanelOnActionClick`, `onHistoryStateUpdated` firing on in-app navigation, and pin-closes-popup need an unpacked load in Chrome against a real org.

## Out of scope (v1)

A Utility registry. Per-tab panel enablement. Remembering a different Area per surface. Multiple panels bound to different tabs at once.

## Acceptance

- Navigating from one Record to another in the bound tab refreshes the open Area without the user touching anything.
- Closing the bound tab leaves the pinned window and the panel recoverable, with a way to pick another tab.
- Power Tools opens in the browser side panel and shows the full Module and Area tree.
- The Utilities Areas are usable at panel width.
- A Workspace launched from the panel opens in a tab.
- The toolbar icon still opens the popup until the setting is turned on.
- Clicking pin in the popup opens the window and closes the popup; the panel has no pin button.
