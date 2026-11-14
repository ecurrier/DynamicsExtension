# Check all 30 Areas at panel and popup width

Status: resolved
Type: task

See `../spec.md`, decision 16.

The shared fixes land first because the badge and the search field are shared, and repairing those repairs most Areas at once. This issue finds what is left over, and produces a list rather than a set of changes.

- Build and serve the harness (`npm run build`, `npm run harness`, then serve `.output/chrome-mv3`). Check every one of the 30 Areas at 400px in `harness-sidepanel` with the browser narrowed, and at 700px in `harness.html`.
- For each Area record: does anything overflow horizontally; is any label cut without an ellipsis; does the toolbar row wrap sensibly; is any control narrower than its own content.
- Expect findings. Only one Area outside the Schema Tools Workspace sets a container query today. Schema Tools is the reference for what good looks like, with breakpoints at 720, 760, 880 and 900px.
- Output is a triage list appended to this file under a `## Findings` heading, one line per Area. The user decides what gets fixed and what gets `fit: "window"`.
- **Change no Area in this issue.**

Blocked by: 01, 02, 08

## Findings

Checked on 2026-11-14 with `npm run build && npm run harness`, served at port 5173. Every Area was opened through nav search in `harness-sidepanel.html` at a 400px viewport and in `harness.html` at the popup's fixed 700px. The check is automatic: it reports page-level sideways scroll, and every element whose content is wider than its box without an ellipsis to show for it. A Fluent `Combobox` expand icon reports a 10px overflow everywhere and is a false positive; it is excluded.

**At 700px (popup): all 24 Areas are clean.**

At 400px (side panel), one line per Area. "clean" means nothing overflows and nothing is cut without an ellipsis.

| Area                  | At 400px                                                                                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin                 | clean                                                                                                                                                     |
| Developer             | clean                                                                                                                                                     |
| Record Set Navigator  | clean                                                                                                                                                     |
| Table Automation      | clean                                                                                                                                                     |
| Record Access         | **`UserPicker` overflows by 122px.** The username field, its Search button and the user dropdown sit in one `FormRow` that never wraps below its content. |
| Record History        | clean                                                                                                                                                     |
| Column Usage          | **The column picker row overflows by 209px.** The table combobox, the column combobox and the Scan flows switch are one row.                              |
| Row Counts            | clean                                                                                                                                                     |
| Form Diagnostics      | clean                                                                                                                                                     |
| Pre-populate Forms    | clean                                                                                                                                                     |
| Record Columns        | clean                                                                                                                                                     |
| Retrieve Records      | clean                                                                                                                                                     |
| Generate              | **The template row overflows by 94px.** The Template dropdown and its buttons are one row.                                                                |
| Templates             | clean                                                                                                                                                     |
| Form XML              | clean                                                                                                                                                     |
| Single User           | **`UserPicker` overflows by 122px**, the same row as Record Access. The business unit selector is fine.                                                   |
| Bulk Users            | **Two tables side by side overflow by 174px and 190px.** The users table and the roles table are a two-column grid that does not stack.                   |
| Impersonate User      | **`UserPicker` overflows by 122px**, the same row again.                                                                                                  |
| Steps                 | clean                                                                                                                                                     |
| Packages              | **`PackageRow` overflows by 160px to 255px.** Its four-column grid (package, version, modified, by) has fixed widths.                                     |
| Environment Variables | clean                                                                                                                                                     |
| Environments          | clean                                                                                                                                                     |
| Service Principals    | clean                                                                                                                                                     |
| Extension Settings    | clean                                                                                                                                                     |

### What that says

Three of the six are one shared component: `UserPicker`'s row. Repairing that row repairs Record Access, Single User and Impersonate User at once, and it is the smallest fix on this list.

The other three are each one Area: `PackageRow`'s grid, `BulkUsersArea`'s two-column layout, and the `ColumnUsageArea` picker row. `GenerateArea`'s template row is the mildest at 94px.

None of the six is unusable at 700px, so none needs `fit: "window"` on the popup's account. The tier question is only about the side panel, and only for Bulk Users and Packages, where the content is genuinely two-dimensional.

**For the user to triage.** Nothing on this list is changed by this issue.

## Fixed

The user asked for all of them, so the triage list was worked through. Re-checked the same way afterwards: **all 24 Areas are clean at 400px and at 700px.**

Seven Areas were on the list, from five causes.

| Cause                                            | Areas                                        | What changed                                                                                                                                                                                                                             |
| ------------------------------------------------ | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The `UserPicker` row never wrapped               | Record Access, Single User, Impersonate User | The username field and its Search button are one block with a 260px basis, and the user dropdown has its own 200px basis, so the two halves take their own lines in the side panel. A `Grow` with a zero basis cannot wrap; a basis can. |
| The Column Usage picker row                      | Column Usage                                 | The column combobox has a 240px basis, so the Scan flows switch and the Find usage button take the next line.                                                                                                                            |
| The Generate template row                        | Generate                                     | The Template dropdown has a 240px basis, and each template setting has a 200px one.                                                                                                                                                      |
| `PackageRow`'s four fixed columns needed 486px   | Packages                                     | Below 560px of its own container width the four columns pair up into two. The list is the container, so it reads its own width and not the viewport's.                                                                                   |
| The role table and the pending list shared 400px | Bulk Users, Single User                      | `DataTable` gains `min-width: 0`, so a wide table no longer sets the min-content width of whatever holds it; and the Single User body stacks its two columns below 560px.                                                                |

Two further things came out of the re-check, both in the shared row rather than in an Area:

- `AreaShell`'s actions block had `flex-shrink: 0`, so a wide action squeezed the search field to nothing. It gives way first now.
- The slot block had no floor, so the breadcrumb kept its full width while the search field shrank to 58px in the popup. The block now holds 320px, which puts the pressure on the breadcrumb, where there is an ellipsis to absorb it.

Record Columns is the busiest row in the popup: breadcrumb, search, Filters, sort, reload, the environment name and three shell buttons. Its sort control became an icon menu rather than a 150px select, which is what let the row stay one line. Its search field is 85px there, with the placeholder shortened. At 400px, where the acceptance applies, the slot block takes its own line and the placeholder is fully readable.
