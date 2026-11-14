# Area width tier

Status: ready-for-agent
Type: task

See `../spec.md`, decision 5, and `docs/adr/0003-area-width-and-workspace-launch.md`.

- Add `fit?: "panel" | "window" | "workspace"` to `AreaDefinition`, defaulting to `"panel"`. It sits beside `requires`.
- Add a `SurfaceFitGate` modelled on `PageRequirementGate`, applied by `AreaOutlet` the same way `PageRequirementGate` is applied today.
- `"panel"` renders anywhere, which is what ADR 0002 asked of every Area.
- `"window"` renders a card in the side panel offering to open the Area in a window, instead of a squeezed layout. The Area stays in the navigation tree and is never hidden from it — ADR 0002 rejected forking the registry and that still holds.
- `"workspace"` is issue 06's path.
- **No Area gets `"window"` in this issue.** The tier is set from an observed failure in the harness, which is issue 10's output, not from a guess while writing the Area.

Blocked by: 07
