# Usability Pass Docs

Status: resolved
Type: task

See `../spec.md`.

- Record the shared components in `README.md` so the next Area reaches for them: filter a long table with `TableFilter`, render an enum value with `ValueChip`, pick from a long list with `MultiSelectPicker`, and never ask for a logical name the environment can supply.
- Update `dev/harness/README.md` for the new fixtures.
- Update `CONTEXT.md` only if the pass introduces a term.

Blocked by: 01, 02, 03, 04, 05, 06, 07, 08, 09

## Comments

`README.md` now states the three shared components and the rule behind them — filtering never changes selection, one palette per value set, and never ask for something the environment knows. `dev/harness/README.md` describes the new fixtures. `CONTEXT.md` needed no new term: Record Set Navigator is the Area label for the existing `Record Set`.
