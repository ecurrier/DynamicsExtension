# Microsoft Edge Add-ons listing copy

Everything below is ready to paste into Partner Center. Text inside fenced blocks is plain
text, not Markdown — paste it as-is; the store preserves line breaks and does not render
Markdown, so the bullets are literal `•` characters.

Listing URL: https://microsoftedge.microsoft.com/addons/detail/power-tools-for-power-pla/aililodjcpnijklhcngnhhddepjkcpnk

---

## Short description

128 characters, under the 132 limit.

```
Developer and admin tools for Dynamics 365 and Power Platform. Inspect automation, query Dataverse, generate code, manage roles.
```

---

## Description

```
Power Tools puts the things you keep opening another tab for — or writing a one-off query for — into one panel beside the app you are already in.

It opens in the toolbar popup, in a pinned window, or in the Edge sidebar, and every tool runs against the environment in your current tab. Tools that need to reach somewhere else can run against environments you save instead.


DO THINGS

• Admin shortcuts — turn on admin mode, toggle logical names, show the solution layers behind the current form, build record links and Web API URLs, refresh the command bar, and open the maker portal, form editor or admin centre for the environment you are in.

• Record Columns — every column on the open record with its logical name, type and value, including the ones that never made it onto the form. Edit several and save them together through the Web API.

• Retrieve Records — write Fetch XML, run it against the environment, and read the results in a full-page viewer.

• Code Generation — generate early-bound C# classes, TypeScript interfaces, enums and JavaScript objects for any table or choice. The templates are yours to write, so the output matches the codebase you already have rather than someone else's house style.

• Form Presets — save the values on a form and apply them to the next new record.

• Security — review and change one user's roles, add or remove roles across a set of users in one run, compare two or more roles side by side, and bulk-edit privilege depth across roles and tables.

• Plug-ins — enable and disable steps grouped by assembly and plug-in type, and update a package from a freshly built nupkg.

• Environment Variables — review every definition and set or clear its current value.

• Schema — change a column's label, description or requirement level across every table that has it, and list or create lookups that point at more than one table.

• Data Transporter — copy or sync records between two environments by primary key, with a plan you approve before anything is written.

• Impersonation — run the tab as another user.

• Record Set Navigator — load a view and step through its records without going back to the list.


UNDERSTAND THINGS

Read-only tools that answer why the platform is behaving the way it is.

• Table Automation — every plug-in step, workflow, business rule and cloud flow registered against a table, in the order they execute, with the stage, mode and filtering columns of each.

• Record Access — what a specific user can actually do with a specific record, and which role, team or share is granting it.

• Column Usage — every form, view, chart, business rule, plug-in step and cloud flow that depends on a column, so you know what you are about to break before you change it.

• Record History — the audit timeline for a record, together with the auditing configuration that explains the gaps in it.

• Form Diagnostics — the scripts, event handlers, business rules and control state in play on the open form.

• Row Counts — row counts per table, so you can see what is actually big before you scope the work.

• Plug-in Traces — a full-page trace log viewer with filtering, search, selectable columns and auto-refresh.


WHERE IT RUNS

Model-driven apps on commercial and US government clouds. Power Pages is recognised too, for the tools that apply to it.


CONNECTIONS

By default every tool rides the Dataverse session in the tab you already have open, so it acts as you and sees exactly what you are allowed to see. Tools that need to reach another environment can connect to one you have saved, signed in with a service principal you control.


PRIVACY

No analytics, no telemetry, and nothing is ever sent to the developer. Everything the extension stores — your saved environments, templates, presets and preferences — stays in your browser on your device.

The source is public: https://github.com/ecurrier/DynamicsExtension
```

---

## Search terms

Seven terms, 20 words in total (limit 21), each well under 30 characters.

| #   | Term                          | Chars | Words |
| --- | ----------------------------- | ----- | ----- |
| 1   | `Dynamics 365 CRM`            | 16    | 3     |
| 2   | `Power Platform tools`        | 20    | 3     |
| 3   | `Dataverse metadata`          | 18    | 2     |
| 4   | `model driven apps`           | 17    | 3     |
| 5   | `FetchXML query builder`      | 22    | 3     |
| 6   | `plugin trace logs`           | 17    | 3     |
| 7   | `security role impersonation` | 27    | 3     |

The product name, "Power Tools", is deliberately absent — the store already indexes the
title, so spending words there would buy nothing.

---

## Screenshots

1280 x 800. Upload in this order; the first is the one the store shows beside the listing.

| File                                  | Caption to paste                                                                                                                                                             |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `screenshots/01-utilities-admin.png`  | One-click admin utilities — admin mode, logical names, solution layers, record links and the maker portal — without leaving the record you are on.                           |
| `screenshots/02-table-automation.png` | Every plug-in step, workflow, business rule and cloud flow registered against a table, listed in execution order with its stage, mode and filtering columns.                 |
| `screenshots/03-record-columns.png`   | View every column on the open record with its logical name, type and value, filter to the ones that are not on the form, and update several at once through the Web API.     |
| `screenshots/04-codegen-generate.png` | Generate early-bound C# classes, TypeScript interfaces and enums for any table or choice from templates you write yourself, so the output matches the code you already have. |
| `screenshots/05-role-compare.png`     | Compare two or more security roles side by side — one row per table privilege, one column per role, showing the depth each grants, with matching rows hidden by default.     |
| `screenshots/06-plugin-traces.png`    | A full-page plug-in trace log viewer with filtering, search, selectable columns and auto-refresh — exceptions and slow runs are flagged as you scroll.                       |

Every screenshot is the real UI, captured from the project's own dev harness against its
sample Dataverse fixtures. No mock-ups, and no org data.

---

## Store assets

| Asset                  | Size       | File                            |
| ---------------------- | ---------- | ------------------------------- |
| Store logo             | 300 x 300  | `logo/store-logo-300x300.png`   |
| Small promotional tile | 440 x 280  | `promo/small-tile-440x280.png`  |
| Large promotional tile | 1400 x 560 | `promo/large-tile-1400x560.png` |

`logo/icon/` holds the same mark at 16, 32, 48 and 128 px for `public/icon/`, so the
toolbar button stops being the old pixel-art image. Those are **not** uploaded to Partner
Center — they ship inside the package, so they only take effect on the next release.

The 16 px icon drops the brackets and keeps the bolt alone. At that size the three white
shapes sit closer together than a pixel can resolve and the mark turns to mush; the bolt
on its own stays sharp, and the tile and gradient are identical, so the set still reads as
one family. 32 px and up keep the full mark.

The logo and all four icons are RGBA with fully transparent corners, so the rounded tile
sits on a light or dark toolbar without a white square behind it. The screenshots and the
promotional tiles are deliberately opaque, being full-bleed rectangles. `compose.mjs`
passes `transparent: true` for exactly the five files that need it — without it the capture
is composited onto the browser's own white page and the PNG carries no alpha channel at
all. Check with the colour type byte: `6` is RGBA, `2` is RGB with no alpha.
