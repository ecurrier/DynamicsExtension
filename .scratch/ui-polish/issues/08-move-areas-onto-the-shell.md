# Move all 30 Areas onto AreaShell

Status: resolved
Type: task

See `../spec.md`, decisions 1 and 2.

- Move each of the 30 Areas onto `AreaShell`, passing its search, filters, actions and primary action as slots.
- Delete `AreaToolbar` and the six bespoke toolbars: `RecordColumnsArea` `.controls` and `.searchRow`, `ImpersonationArea` `.actions`, `TraceViewer` `.header` and `.toolbar`, `ResultsViewer`, `SchemaTools` `.bar`, and `ColumnSearchBar`.
- `FormRow` stays, but only inside an Area's content, for rows of form controls. It is not a toolbar. Add `flexWrap` to it while you are there.
- The four tab-bar Areas — `GenerateArea`, `DataTransporter`, `SchemaTools`, `SecurityTools` — put their tabs in the content, below the shell row.
- The eight Areas with no toolbar pass no slots and must lose no height.
- Each Area's filters collapse behind the Filters button with its active count. `RecordColumnsArea`'s five `ToggleButton` chips are the clearest case; `EnvironmentVariablesArea`'s type dropdown is the simplest.
- Check each Area at 400px and 700px in the harness as you move it. Record anything still broken for issue 10 rather than fixing it here, so the migration stays reviewable.

Blocked by: 07

## Answer

- All 13 Areas that had a toolbar now pass slots: the 11 `AreaToolbar` users plus `RecordColumnsArea` and `ImpersonationArea`. `AreaToolbar` is deleted, with its style.
- The eight Areas with no toolbar pass no slots and lose no height, so they are untouched.
- Where an Area's row held a selector dropdown (preset, template, environment, service principal, form, business unit), the selector stays in the content inside a `FormRow` — it is a form control, not a toolbar — and the Actions menu moves to `primaryAction`.
- Filters behind the `FilterPanel` button with a count: `RecordColumnsArea`'s five chips and its sort, `PluginStepsArea`'s state dropdown, `EnvironmentVariablesArea`'s type dropdown.
- `RecordColumnsArea`'s `.controls`, `.searchRow` and `.search` styles are gone, and so is `ImpersonationArea`'s `.actions`.
- `ImpersonationArea`'s start and stop buttons were a right-aligned row at the foot of the form. They are the Area's primary action and now sit in the row.
- Kept, with reason: the `TraceViewer` header is issue 13's work, and `ResultsViewer`, `SchemaTools` `.bar` and `ColumnSearchBar` belong to Workspaces, not Areas. The spec says `AppShell` is shared with the five Workspaces, which need a different top bar, and ADR 0003 keeps the Workspace tab bars. An `AreaShell` has nothing to portal into on a Workspace page.
- The four tab-bar Areas were already rendering their tabs in the content, below the row.
- Checked at 400px and 700px as each Area moved. One migration defect was found and fixed here: the Record Set Navigator put Previous, Next, Load more and Choose a view in the row, which overflowed the popup by 94px. Previous and Next are now icon buttons, and Load more sits beside the caption in the content. Everything else found is recorded in issue 10.
