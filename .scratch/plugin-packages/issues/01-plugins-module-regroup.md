# Plug-ins Module regroup

Status: resolved
Type: task

See `../spec.md`, decision 1.

- Move `src/modules/pluginsteps` and `src/modules/plugintraces` into `src/modules/plugins` with `areas/steps`, `areas/packages` (stub until 03), and `areas/traces`.
- `pluginsModule` (`id: "plugins"`, label "Plug-ins", order 9) with Areas `plugins.steps`, `plugins.packages`, `plugins.traces`; Data Transporter and Settings shift to 11 and 12.
- Rename `usePluginStepsStore` to `usePluginsStore`; update the Table Automation handoff (`navigate("plugins.steps")`) and its link title.
- Settings section "Plugin Steps" becomes "Plug-ins" (storage key unchanged); trace viewer copy and page title use the "Plug-in" spelling.
- `resolveArea` maps the two legacy area ids to the new ones so a remembered last Area still lands.
- Harness: nav drawer shows Plug-ins with three sub-items; no fixture changes.

Blocked by: none
