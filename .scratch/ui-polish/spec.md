# UI Polish

Status: ready-for-agent
Decided: 2026-11-14 (grilling session)

## Problem

Daily use of the extension surfaced five complaints. They are not five bugs; three of them share one cause.

1. **The Areas do not look like one product.** Toolbars sit in different places, search is offered in three different shapes, and there is no rule about which utilities an Area provides. Cross-Table Columns explains itself with a numbered 1-2-3 display; nothing else does.
2. **The popup and the side panel look squeezed.** Badge labels do not fit inside their row. Search fields are too small and their placeholder text is cut off, while the container around them has room to spare.
3. **A Workspace takes two selections to open.** The user picks the tool in the drawer, lands on a screen that only describes it, and picks it again. In Schema Tools and Security Tools, the Workspace then offers the same two tools a third time in its tab bar.
4. **Some Areas throw too much at the user at once.** The Trace Viewer is the worst: eleven controls and two different search boxes stand between the user and the first row, and the detail pane holds two fifths of the width while it is empty.
5. **Toasts cover the tool.** They appear 16px from the top right corner, over the title, toolbar and search box the user has just used, and there is no way to dismiss one with a mouse.

Findings behind these, all confirmed in the code:

- No badge anywhere has a `className`. Fluent's `Badge` root sets `height` and `min-width` and nothing else — no `white-space`, no `overflow`, no `text-overflow`, no `max-width`, no `flex-shrink`. Adjacent text truncates (24 sites) and `flex-shrink: 0` is used 12 times, never on a badge. The badge is the one element in the row that cannot give way.
- There are about 20 search controls in three shapes: `TableFilter` (shared, `size="small"`, 7 uses), a hand-rolled `Input` with a search icon (12 instances), and Fluent `SearchBox` (once, in the nav drawer).
- Of 30 Areas, exactly one outside the Schema Tools Workspace sets a container query. ADR 0002 asked every Area to work from about 400px and that was never carried out.
- Six Areas exist only to launch a Workspace. `WorkspaceLaunchButton` shows a split button in the pinned window and degrades to a plain "open a tab" button in the popup and the panel.
- There are 99 toast call sites across 33 files: 43 success, 31 error, 17 validation guards raised as errors, 8 info. No toast has a close button; Fluent's `ToastContainer` has no click-to-dismiss and no swipe, so a mouse user can only wait. The stack has no limit. Meanwhile `MessageBar` already appears in 27 files, `AppShell` already has a wired `banner` slot, and Fluent `Field validationMessage` is used in only 7 files.

## Vocabulary

Terms from `CONTEXT.md`: Module, Area, Surface, Utility, Workspace, Page Requirement, Table, Column, Record. New in this spec: **Area shell** (the shared chrome every Area renders inside), **width tier** (an Area's declared `fit`), **step explainer** (the shared 1-2-3 display).

Decisions that change ADR 0002 are recorded in `docs/adr/0003-area-width-and-workspace-launch.md`.

## Decisions

1. **One shell, no exemptions.** Every Area renders inside an `AreaShell` that owns the toolbar row. An Area cannot place its toolbar elsewhere, because the shell gives it no other slot. The eight Areas with nothing to put in the row show no row and lose no height. The four Areas that use a tab bar put their tabs in the content below the row, where they read as navigation rather than as a toolbar.

2. **Layout C.** The breadcrumb row the `AppShell` already draws grows to hold the search field and the actions: breadcrumb, then search filling the remaining width, then a Filters button carrying a count of active filters, then secondary icon buttons, then at most one primary action. The standard therefore costs no vertical space. Below about 560px of container width the search field drops to its own line, and the environment name is dropped before the search field is.

3. **One search control.** A shared `SearchField` replaces all three shapes. It is Fluent `size="medium"` (32px), it fills its row (`flex: 1; min-width: 0`), the result count sits beside it rather than inside it, and Escape clears it. Its placeholder names what is being searched ("Search variables"), never the bare word "Filter". `TableFilter` keeps its counting behaviour and is rebuilt on top of it.

4. **Badges give way.** A badge truncates with an ellipsis and carries its full text in a `title`. Where badges already sit in a group that wraps, they keep wrapping instead. The impersonation badge in the app header keeps the word "Impersonating" readable, truncates the name, and carries the full name in both the tooltip and the accessible name. An icon-only badge is not an acceptable fallback: a screen reader does not read it reliably and a hover tooltip does not exist on touch.

5. **Width tier.** `AreaDefinition` gains `fit?: "panel" | "window" | "workspace"`, defaulting to `"panel"`. A gate modelled on `PageRequirementGate` enforces it. See ADR 0003.

6. **Workspace Areas open directly.** The six launcher Areas go. Selecting one in the drawer opens the Workspace: in place in the pinned window, in a browser tab from the popup and the side panel. The nav item carries a mark showing that it opens a full page. "Open in a new tab" moves into the Workspace's own header, beside the back control. See ADR 0003.

7. **Trace logging becomes a Utility.** The Trace logging level dropdown moves from the Plug-in Traces launcher to a Utilities Area card, because it is a one-shot action on the open page. The Trace Viewer keeps its own copy in its header.

8. **The step explainer becomes shared.** `HowItWorks` moves from `src/schema-tools/ColumnSearch.tsx` into `src/shared/components/`, and its grid follows the length of the step list instead of hard-coding three columns. Any Area that shows nothing until the user picks something gets one. It renders full size on arrival and collapses to a "How it works" button after the user's first action, which is the behaviour Cross-Table Columns already has. There is no stored preference and no migration: the state follows the work, so the explainer returns by itself when the user comes back to an empty screen months later.

9. **Toasts are for successes and notices.** A toast gets a close button, moves to the bottom right, keeps its 3 second life, and the stack is capped at three. The bottom right is the emptiest region of every Area, and every Area's chrome is at the top.

10. **Validation goes to the field.** The 17 guards currently raised as red error toasts move to the Fluent `Field validationMessage` of the control they are about. "Enter a preset name" belongs at the preset name box.

11. **Failures go to a banner.** Real errors move into the `AppShell` banner slot, which is already wired. One banner at a time, newest wins, with a close button, and it clears when the user leaves the Area. A banner that follows the user to another screen is only a slower toast. `ToastBridge` stops raising toasts and feeds the banner instead; audit the five `meta.silent` mutations and any call site that also raises its own error, so a single failure is reported once.

12. **A partial failure opens the result.** "5 of 20 failed" with no way to see which five wastes the user's time. Where the run already builds a result view, a partial failure opens it. Where it does not, it goes to the banner. Plain notices ("Results truncated", "Run cancelled") stay as toasts.

13. **Keyboard baseline, no formal standard.** The extension is built for its author and his colleagues, so there is no WCAG target. The bar is: Tab reaches every control, the focused control is always visible, Escape closes any panel, popover or dialog, and Enter runs a form's main action. Arrow-key navigation inside tables and lists is out of scope; the nav drawer keeps the arrow keys it already has.

    An audit against that bar found the codebase largely clean — all 29 icon-only buttons have an accessible name, there is no `tabIndex` abuse, no `outline: none`, and Fluent traps and restores focus in every dialog and in the nav drawer. Three faults fail the bar and are issue 12: every `DataTable` row with an `onRowClick` is mouse-only, because Fluent's row handler answers Space only for selection and never calls the consumer; `InfoTip` hangs its tooltip on a non-focusable svg at 10 call sites, so its help text does not exist for a keyboard user; and the Ctrl+K handler calls `preventDefault` without checking whether focus is in a text field, so it hijacks the shortcut while the user types.

14. **The Trace Viewer's first screen is rows.** The eight filter controls move into a panel behind a Filters button carrying a count. What remains above the table is the quick filter, the Top dropdown, the refresh and auto-refresh controls, and the delete action. The detail pane renders only once a row is selected, instead of holding `minmax(360px, 2fr)` while empty.

15. **Trace log columns are the user's.** Six show by default: Created On, Type Name, Message, Entity, Duration, Exception. Mode, Depth, Correlation and Step come off, because the Summary tab already shows all four for the selected row. A Columns button on the toolbar hides and shows columns and offers "Reset to default"; the choice is remembered. It does not reorder — the user can already resize a column with the mouse, and reorder is a lot of work for something set once.

16. **Shared parts first, then a list.** The badge rule and the search field are shared, so fixing them repairs most Areas at once. Only after they land does anyone check all 30 Areas in the harness at 400px and 700px, and the output of that check is a list for the user to triage. This spec does not commit to fixing 30 Areas.

## The Area shell

`AreaShell` sits between `AppShell` and the Area component and takes named slots: `search`, `filters`, `actions`, `primaryAction`, `children`. It renders them into the existing breadcrumb row in the order given by decision 2, applies the container query that moves the search field to its own line, and renders nothing where a slot is empty.

`AppShell` is not the home for this contract: it is shared with the five Workspaces, which need a different top bar, and a toolbar contract there would force the wrong shape on them.

`AreaToolbar`, `FormRow` and the six bespoke toolbars are removed as Areas move onto the shell. An Area that still needs an inline row of form controls keeps `FormRow` inside its content; that is a form, not a toolbar.

## Messages

After decisions 9 to 12 the four surfaces have clear jobs:

| Surface | Carries | Lifetime |
| --- | --- | --- |
| Field validation message | "this control is wrong" | until the control is fixed |
| `AppShell` banner | a failure the user must act on | until dismissed or the Area is left |
| Result view | a partial failure, with the rows that failed | until the user closes it |
| Toast, bottom right | a success, or a plain notice | 3 seconds, or the close button |

## Order of work

Decided with the user, by what he feels soonest:

1. The shared fixes — badge rule, search field, toast changes, messages moved (issues 01-04). Touches every screen for the least work.
2. The launcher removal (issues 05-06). Small, and removes a click he resents daily.
3. The shell and the width tiers (issues 07-11). The largest piece, and it changes nothing visible until Areas move onto it.
4. The Trace Viewer (issues 13-14). A redesign, and it must not block the rest.

Issue 12, the keyboard baseline, follows the shell migration.

## Out of scope

A custom Fluent theme or any token override. A component playground or render tests (the Vitest glob is `src/**/*.test.ts`, so `.tsx` is excluded by design and the harness remains the way to look at a layout). Arrow-key navigation in tables. A WCAG conformance pass. Reordering trace log columns. Changing the Module and Area structure of the navigation itself. Rewriting the six bespoke Workspace headers beyond what the launcher change requires.

## Known gaps, recorded and not fixed

Found while scoping this work, accepted as out of scope, written down so nobody rediscovers them as news.

- `schema` and `impersonation` both declare `order: 8`, so their position in the drawer is not stable.
- The popup is `700px × 600px` with `overflow: hidden` on `html`, `body` and `#root`. At 200% browser zoom roughly 300px of width and height are clipped with no scrollbar and cannot be reached. The other six entry documents use `height: 100%` and reflow correctly.
- `AppShell`'s `@container (max-width: 480px)` rules never fire in the popup, because the popup's container is a fixed 700px. They only help the pinned window and the side panel.
- There is no `main`, no heading landmark and no skip link anywhere outside `src/schema-tools/`, which holds every `h1`–`h3` and every `section`/`aside` in the product. Fluent's `Title3` renders a `span`, so the three Workspace titles are not headings.
- `MessageBar` renders `role="group"`, so all 35 `EmptyState` instances and the 100 direct `MessageBar` instances appear silently to a screen reader. Issue 04 fixes only the banner.
- `LoadingBar` and `BulkRunProgressView` announce nothing: neither `ProgressBar` has an accessible name, and the bulk-run caption is deliberately not a live region.
- 53 `title`-only tooltips carry information that has no visible equivalent — full GUIDs, full type names, full before-and-after values. Decision 4 adds more of them deliberately, which is an accepted trade for a mouse-driven desktop extension with no formal standard.
- The role staging table tints rows green for "will be added" and red for "will be removed"; the words live in a separate panel.
- 43 `Badge size="small"` instances render at 16px, below the 24px target-size floor. All are non-interactive, so this is noted rather than fixed.

## Acceptance

- Every Area's toolbar row sits in the same place, and no Area renders a toolbar outside the shell.
- One `SearchField` component backs every search and filter box in the extension; the hand-rolled instances are gone.
- At 400px in the harness side panel, no badge label spills out of its row or is cut without an ellipsis, and every search field fills its container with its placeholder fully readable.
- Selecting Cross-Table Columns in the drawer opens the Cross-Table Columns Workspace: in place in the pinned window, in a tab from the popup and the side panel. No launcher screen appears.
- The Trace logging level can be set from a Utilities card without opening a Workspace.
- Submitting the preset form with no name shows the message at the name field, with no toast.
- A failing save shows one banner, not a banner and two toasts.
- A toast can be dismissed with the mouse, sits at the bottom right, and never stacks more than three deep.
- The Trace Viewer opens showing rows, with its filters behind a counted button and no detail pane until a row is selected; it shows six columns and the Columns button restores the rest.
- Tab reaches every control on every Area with a visible focus ring, Escape closes every panel and dialog, and Enter submits every form.

## Review notes

Two-axis review after the work landed, on `f207d2c...HEAD`. What the reviewers found and what came of it.

**Fixed**

- The step explainer only half worked: six of the eight Areas rendered it full size and then deleted it, instead of collapsing to the "How it works" button that decision 8 asks for. Record Access, Column Usage, Row Counts, the Privilege Editor, the Data Transporter and Polymorphic Lookups now collapse to the button.
- The environment name and the search field left at the same 560px, so there was no width where decision 2's "the environment name is dropped before the search field is" was true. The name now goes at 760px.
- Only the Areas with a toolbar rendered inside an `AreaShell`, which made decision 1 opt-in. `AreaOutlet` now wraps every Area in one; an Area with a row renders its own inside it and fills the slots from there.
- `SurfaceFitGate` sat in `shared/components` and imported `@/workspaces`, which imports `shared/components` back: a barrel cycle. It moved to `src/app`, beside the other gate composition.
- Eight mutations each carried `meta: { silent: true }` with an `onError` that raised a banner, only to give the failure a better title. A mutation now states `meta: { failureTitle }` and the bridge reads it; the eight handlers are gone.
- The Columns picker restated all ten column labels that `traceColumns.tsx` already held. There is one `TRACE_COLUMN_LABELS` map, and the table reads it too.
- The sort control sat behind the Filters button, although sort is not a filter and is not in its count. It moved to the toolbar row.
- Smaller: an empty `if` block in the Data Transporter run, a dead `caption` style in Record Access, an unused `TraceColumnId`, a `raise` that returned a value no call site used, and "entity" in a new accessible name where `CONTEXT.md` says to say table.

**Checked and left alone**

- `InfoTip` is now a button, and ten of them sit inside a Fluent `Field` label. Measured in the harness: clicking the tip does not activate the labelled control, and the control's accessible name is unchanged, because the icon button contributes no text. The old bare svg carried the same `aria-label`, so nothing regressed; the tip simply became reachable, which is what issue 12 asked for.
- Four of the six toolbars issue 08 named belong to Workspaces (`TraceViewer`, `ResultsViewer`, `SchemaTools` `.bar`, `ColumnSearchBar`), not Areas. The spec says `AppShell` is not the home for this contract because the Workspaces need a different top bar, and ADR 0003 keeps the Workspace tab bars. An `AreaShell` has nothing to render into on a Workspace page, so those stay.
- The `ConnectionPicker` + `PageRequirementGate` block repeated in five Areas is older than this work and is left for its own change.
