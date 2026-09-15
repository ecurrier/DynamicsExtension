---
status: accepted
---

# Power Tools renders its Areas in three Surfaces, and the toolbar icon opens the popup unless the user says otherwise

The extension started with one Surface, the popup, and later grew a second, a pinned window opened from it. Users asked for a third: docked in the browser side panel, so the Utilities they run constantly stay to hand while they move between records. The side panel is not an extra window, because Chrome will open either the popup or the panel from the toolbar icon and never both: `sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` suppresses the popup entirely.

We chose three Surfaces running one app. `PopupMode` names them, the Areas and Modules render in all three, and a Surface is a layout and lifecycle difference rather than a different navigation tree. The toolbar icon keeps opening the popup; an extension setting, `openSidePanelOnActionClick`, flips it to the panel, and a toolbar button docks the panel without changing the setting. The panel is offered on every tab rather than only on Dynamics hosts, and it binds to the active tab whenever that tab is a Dynamics host, keeping its last binding otherwise.

## Considered options

- **A reduced navigation in the panel, showing only the one-shot Utilities**: rejected, it forks the registry and the answer to "where is that Area" becomes "it depends which Surface you are in". Width is handled instead by Areas laying out responsively, and by Workspaces opening in a tab from the panel.
- **Making the toolbar icon open the panel for everyone**: rejected, it silently removes the popup from every existing user. The setting makes it their choice.
- **Enabling the panel only on Dynamics hosts, per tab**: rejected, extra wiring for a politeness nobody asked for, and a panel that vanishes when you click a non-Dynamics tab is worse than one that keeps its binding.
- **A fourth Surface for the heavier tools**: rejected, Workspace already covers the full-window case.

## Consequences

An Area may now render anywhere from about 400px to a full window, so layout that adapts to the Surface must use a container query rather than a media query: the popup has a fixed 700px root inside a viewport of any size, and a media query would read the viewport and get it wrong. `TaskGrid` sets the pattern.

A Surface that persists across page navigation inherits the bound-tab lifecycle, so the tab binding has to recover rather than dead-end. The panel and the pinned window share the recovery banner and the tab picker, and only the popup treats a missing tab as terminal, because the popup alone cannot follow anything.

Chrome has no API to close a side panel, so "close the surface you came from" works only from the popup. The pin button is therefore popup-only, which is also correct on its own terms: the panel is already persistent, so pinning from it would be redundant.

Entrypoint stylesheets stay in entrypoints. The popup and the panel share `popup.css`, and importing it from a module reachable through the `@/app` barrel silently bundles the popup's fixed width into every Workspace page that imports anything from that barrel.
