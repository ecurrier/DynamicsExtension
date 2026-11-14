# Move all 30 Areas onto AreaShell

Status: ready-for-agent
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
