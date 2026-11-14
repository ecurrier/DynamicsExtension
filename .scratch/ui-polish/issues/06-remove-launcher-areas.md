# Remove the six launcher Areas

Status: resolved
Type: task

See `../spec.md`, decision 6, and `docs/adr/0003-area-width-and-workspace-launch.md`.

Six Areas exist only to describe a Workspace and launch it: Cross-Table Columns and Polymorphic Lookups (`SchemaToolLaunch`), Role Compare and Privilege Editor (`SecurityToolLaunch`), Plug-in Traces (`PluginTracesArea`) and Data Transporter (`TransporterArea`). Selecting one costs two selections, and in Schema Tools and Security Tools the Workspace then offers the same two tools a third time in its tab bar.

- Give those six registry entries `fit: "workspace"` plus the Workspace id and the tool within it, and delete their components.
- Selecting one navigates straight to the Workspace: in place when the Surface is the pinned window (the existing `openWorkspace` then `fitWindowToWorkspace` path), in a browser tab from the popup and the side panel.
- The nav item carries a mark showing that it opens a full page, so a browser tab is never a surprise. The mark shows in the drawer tree and in nav search results.
- `ensureHostAccess`, which `PluginTracesArea` called before launching, moves into the Workspace page's own bootstrap. A direct launch must not skip it.
- "Open in a new tab" moves into each Workspace's header, beside the back control. `WorkspaceLaunchButton`'s split button is no longer reachable from the drawer path; keep the component only if the Results Viewer footer still needs it.
- The Results Viewer is not part of this. It launches from the Retrieve Records results footer rather than from navigation, and keeps its button.
- The tab bars inside `SchemaTools` and `SecurityTools` stay, seeded from `launch.tool` as they already are. With the launcher gone they are navigation within the Workspace, not a repeated choice.
- Verify all three Surfaces in the harness: pinned window (`harness?mode=window&tabId=1`), popup (`harness.html`), and `harness-sidepanel`.

Blocked by: 05

## Answer

- `AreaDefinition` gains `fit` and `workspace`, and `component` is now optional. A registry test holds the invariant: an Area has either a component or a Workspace, never both and never neither.
- The six entries carry `fit: "workspace"` with the Workspace id and the tool. `SchemaToolLaunch`, `SecurityToolLaunch`, `PluginTracesArea` and `TransporterArea` are deleted.
- `areaWorkspaceLaunch` (unit tested) builds the launch from the Area's target plus the session. It refuses a Trace Viewer launch with no tab or no org, and refuses the Results Viewer, which is not reachable from navigation.
- `useAreaLauncher` opens it: in place in the pinned window, in a browser tab from the popup and the side panel. `App.goToArea` wraps `navigate`, so the drawer, nav search and the breadcrumb area list all open the Workspace directly.
- `rememberArea` records the Area in the recent list without making it the last visited one, because a Workspace Area has no component to come back to.
- `SurfaceFitGate` renders a card for a `fit: "workspace"` Area, so a remembered session that lands on one still offers to open it. It is not in the normal path.
- The nav item carries an `Open16Regular` mark in the tree, in the recent list and in nav search (`fullPage` on the hit, unit tested).
- "Open in a new tab" is now an `AppShell` toolbar button beside the back control, shown while a Workspace fills the window. It serves all five Workspaces at once.
- `ensureHostAccess` runs on the launch path first, so the click still counts as the gesture Chrome wants for a permission prompt, and the Trace Viewer itself renders a `HostAccessBanner`. A direct launch cannot skip it.
- `WorkspaceLaunchButton` stays: the Retrieve Records results footer still uses it.
