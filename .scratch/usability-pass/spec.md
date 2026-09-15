# Usability Pass

Status: resolved
Decided: 2026-09-11

## Problem

The ten feedback features work, but they were built to be correct rather than to be used. The owner walked the modules and found the same faults repeatedly: tables that cannot be searched when they hold hundreds of rows, enum values rendered as bare text when colour would let the eye do the comparing, free-text inputs where the environment already knows the valid answers, and screens that never say what they are for. A tool nobody can find their way around is not finished.

Two of the findings are not polish. The Bulk Users selection model is wrong: it assumes one search produces the set, when the real task is assembling ten people through several searches. And Polymorphic Lookups shipped create-only on the grounds that managing targets could not be confirmed, which the owner has now disproved by naming the tool that does it.

## Vocabulary

Terms from `CONTEXT.md`: Module, Area, Workspace, Table, Column, Security Role, Privilege Depth, Bulk Run, Solution, Record Set.

## Decisions

1. **Build the three shared pieces first.** A filter on a table, a coloured chip for an enum value, and a searchable multi-select of things the environment already knows. Each is wanted by three or more Areas; writing them per-Area is how the six copies of `describeError` happened.
2. **Selection survives filtering.** A filter narrows what is shown, never what is selected. This is the whole of the Bulk Users complaint and it applies to every multi-select table.
3. **Never ask for a logical name that can be picked.** Table names, publisher prefixes and solutions are all knowable from the environment, and a typed logical name is a typo waiting to happen.
4. **Every Workspace says what it is for.** Cross-Table Columns and Record Set Navigator in particular are meaningless names until you have used them once. A short statement of what the screen does and when it helps, on the screen, not in a tooltip.
5. **Derive the columns from the data.** The Record Set Navigator shows whatever the chosen view shows, with display names, because a view the user picked already encodes which columns matter.
6. **Managed state is a fact, not advice.** Report managed or unmanaged and let the user judge; "Managed, editable" was the tool editorialising.

## Shared components

A filter input bound to a `DataTable` that narrows rows without touching selection. A `ValueChip` that colours a value from a fixed set consistently wherever it appears. A `MultiSelectPicker` combo box that searches a long list and holds several choices.

## Record Set Navigator

Renamed from Records. Default the view picker to the first entry, take the columns and their display names from the chosen view, and open with a short statement of what the screen does and the two steps to use it.

## Bulk Users

Load every user up front. A filter pares the table down; ticking survives the filter changing, so a set is assembled over several searches. A running count of who is selected, and a way to clear.

## Role Compare and Privilege Editor

Filters on both the role list and the result table. Privilege depth and access type rendered as coloured chips. Business unit copies either explained or removed from the role list. The differences-only toggle relabelled so it says what it does.

## Cross-Table Columns

An explanation of what the tool is for. Managed state reported plainly. A taller table. And the metadata properties the owner wants beyond label, description and requirement level: string maximum length, numeric minimum and maximum, and decimal precision, with the controls shown only for the types they apply to.

## Polymorphic Lookups

Reopened on the evidence that XrmToolBox manages targets. Table and solution pickers instead of typed names, publisher prefix and schema name entered once each with the resulting name shown read-only, and target tables chosen from a searchable multi-select.

## Verification

The shared components are unit tested for the behaviour that matters: filtering does not clear selection, a chip maps every value in its set, the picker searches and multi-selects. Each Area is checked in the harness at panel width and Workspace width.

## Out of scope

Saved filters. Column chooser on the Record Set Navigator beyond what the view defines. Editing choice options or renaming schema names in Cross-Table Columns.

## Acceptance

- No table of more than about twenty rows lacks a filter.
- Filtering a multi-select table never changes what is selected.
- Privilege depth reads as a coloured chip everywhere it appears.
- No screen asks the user to type a table logical name, a solution, or a publisher prefix.
- Record Set Navigator shows the columns of the view that was chosen, under their display names.
- Cross-Table Columns can set string length, numeric range and decimal precision, showing only the controls that apply.
- Polymorphic Lookups can add and remove targets, or states precisely why it cannot.
