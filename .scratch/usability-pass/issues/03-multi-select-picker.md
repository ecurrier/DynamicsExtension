# Multi Select Picker

Status: resolved
Type: task

See `../spec.md`, decision 3.

- New `src/shared/components/MultiSelectPicker/MultiSelectPicker.tsx`: a searchable, multi-select combo box over `{ value, label, description? }` options, showing the chosen values as removable `Tag`s above the input and filtering the list as the user types, built on Fluent `Combobox` with `multiselect`.
- Props: `label`, `options`, `selected`, `onChange`, `placeholder`, `disabled`, `hint`.
- Reuse `matchesFilter` from `01` so searching behaves the same as a table filter.
- Tests for the pure part (`filterOptions`): matching on label and description, already-selected options still listed, empty query returns everything.
- Export from `src/shared/components/index.ts`.

Blocked by: 01

## Comments

Selected values render as dismissible `Tag`s above the input, so a long set stays visible while the search box is showing something else. `filterOptions` matches label, description and the underlying value, which means a developer can type a logical name and a user can type a concept.
