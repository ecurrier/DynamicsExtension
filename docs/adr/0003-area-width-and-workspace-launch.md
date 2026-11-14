---
status: accepted
---

# An Area declares the width it needs, and the shell takes the user to where it fits

ADR 0002 put every Area in all three Surfaces and said width would be handled by Areas laying out responsively. Daily use has shown that the rule was stated and never carried through: outside the Schema Tools Workspace, exactly one Area ever got a container query, and the badges and search fields inside every Area were never given a way to give way. A badge is a rigid box with no `white-space`, no `max-width` and no `flex-shrink`, sitting beside text that truncates, so the badge is what breaks the row. The popup and the panel therefore look squeezed rather than adapted. The responsive rule was right. It was never done, and for a few Areas it cannot be done.

Two things change. An `AreaDefinition` gains a `fit` of `"panel"`, `"window"` or `"workspace"`, beside `requires` and enforced by a gate the way `PageRequirementGate` enforces a `PageRequirement`. And the Areas whose only job is to launch a Workspace stop existing: the drawer takes the user into the Workspace itself.

`fit: "panel"` is the default and means what ADR 0002 asked for — the Area works from about 400px up. `fit: "window"` means the Area needs the pinned window or a tab; in the side panel the gate shows a card offering to open it in a window, and the Area stays in the navigation tree where the user can still find it. `fit: "workspace"` means the Area is a Workspace: selecting it in the drawer opens that Workspace directly, in place when the Surface is the pinned window and in a tab otherwise, and the nav item carries a mark saying so.

## Considered options

- **A minimum width in pixels on each Area**: rejected, thirty numbers is thirty judgements no reviewer can check, and the useful question is which Surface the Area fits, not the pixel at which it breaks.
- **Keeping ADR 0002's rule and fixing only the shared parts**: rejected as the whole answer, although it is most of it. Repairing badge overflow and the search field fixes the great majority of Areas, and the tier exists only for the few that stay unreadable afterwards. The tier is deliberately awkward to reach: `"panel"` is the default, and an Area must earn its way out of it by failing in the harness at 400px.
- **Hiding a too-narrow Area from the panel's navigation**: rejected again, for the reason ADR 0002 gave. The answer to "where is that Area" must not depend on the Surface.
- **Keeping the launcher Areas and putting the step explainer on them**: rejected, it pays for a screen the user does not want with content they do not need twice. The explainer belongs on the Workspace's own empty state.
- **Making the launch target a flag separate from the width tier**: rejected, two declarations that must agree will drift.

## Consequences

Six Areas lose components of their own: Cross-Table Columns, Polymorphic Lookups, Role Compare, Privilege Editor, Plug-in Traces and Data Transporter. Their registry entries stay, carry `fit: "workspace"`, and name the Workspace and the tool within it. The Results Viewer is not among them, because it is launched from a results footer rather than from navigation, and it keeps its button.

The Plug-in Traces launcher carried the Trace logging dropdown. That is a one-shot action on the open page and therefore a Utility, so it moves to a Utilities Area card rather than dying with the launcher. The Trace Viewer keeps its own copy in its header.

`WorkspaceLaunchButton`'s split button loses its reason to exist on the drawer path. "Open in a new tab" moves into the Workspace's own header, beside the back control, so the pinned window keeps the choice without the extra selection.

A `fit: "window"` Area renders nothing in the side panel, so any Area given that tier must be one the user can wait to open. The tier is set from an observed failure in the harness, not from a guess while writing the Area.

The tab bars inside Schema Tools and Security Tools stay. With the launcher gone they no longer repeat a choice the user has just made; they become the way to move between two related tools without a trip back to the drawer.
