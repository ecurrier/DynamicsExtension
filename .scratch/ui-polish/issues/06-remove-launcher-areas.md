# Remove the six launcher Areas

Status: ready-for-agent
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
