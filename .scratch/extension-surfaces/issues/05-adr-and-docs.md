# Surfaces ADR And Docs

Status: resolved
Type: task

See `../spec.md`, decisions 2 through 6.

- New `docs/adr/0002-extension-surfaces.md` in the existing ADR format (frontmatter `status: accepted`, H1 as a decision sentence, `## Considered options`, `## Consequences`): Power Tools has three Surfaces, the toolbar icon opens the popup unless the setting says otherwise, the panel hosts the full Area tree, and Workspaces open in a tab from the panel.
- Add `Surface` to `CONTEXT.md` under "Extension structure", defined as one of the three places the Areas render — popup, pinned window, side panel — with `_Avoid_: mode, view, host`. Note under `Workspace` that the panel uses the tab target.
- Update the `README.md` project layout for the new entrypoint and the "Adding a module" note about panel width.
- Update `dev/harness/README.md` with the `sidePanel` shim, `harness-sidepanel.html`, and the synthetic navigation and lost-tab controls from `01`.

Blocked by: 02, 03, 04

## Comments

`docs/adr/0002-extension-surfaces.md` records the decision as three Surfaces running one app, with the toolbar icon still opening the popup by default. Its Consequences section carries the two traps this tranche actually hit, because both are the kind of thing that gets re-learned the hard way: an Area now renders from about 400px to a full window, so Surface-adaptive layout must use a container query rather than a media query; and an entrypoint stylesheet imported from anywhere reachable through the `@/app` barrel is bundled into every Workspace page, which is how the popup's fixed 700px width ended up capping the Data Transporter.

`CONTEXT.md` gains `Surface` under "Extension structure", placed after `Area` so the vocabulary reads Module then Area then Surface, with `_Avoid_: Mode, host, view, container`. The `Workspace` entry gained a sentence saying it always opens in a tab from the side panel.

`README.md` names the side panel in the project layout, redescribes `app/` as the shell plus tab binding rather than the popup shell, and the "Adding a module" section now states the 400px floor, the container-query rule, and the entrypoint-stylesheet rule, pointing at the ADR.

`dev/harness/README.md` was updated as each issue landed rather than here: the `__harness` controls for navigation, reload, tab removal and tab activation, the `harness-sidepanel` page and its `closedTab` variant, and the note that the side panel toggle only writes the setting because the background service worker does not run in the harness.
