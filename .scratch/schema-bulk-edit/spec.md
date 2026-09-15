# Schema Bulk Edit

Status: resolved
Decided: 2026-09-11

## Problem

Two requests ask Power Tools to change schema rather than data.

The first is cross-Table Column editing. A Column with the same logical name often exists on many Tables, and when it does, its label, requirement level and description usually ought to agree. Today fixing a wording change means opening the maker portal once per Table. The request came with its own safeguard attached: a search will find more matches than the user wants, so the user must confirm which ones to change.

The second is a polymorphic lookup manager matching the XrmToolBox tool, including choosing which solution the work lands in.

Both are firsts for this codebase. Every `EntityDefinitions` call today is a read, nothing sends a solution header, and publishing exists only as a page-bound call. Those three gaps are filled in `bulk-mutations` so this feature can assume them.

## Vocabulary

Terms from `CONTEXT.md`: Workspace, Table, Column, Solution Layer, Gateway, Page connection, Environment connection.

## Decisions

1. **Matching is by exact logical name and identical type.** A logical name can be searched across every Table in one `EntityDefinitions` request by filtering the expanded attribute collection, so the whole environment is reachable without pulling all metadata. Matching on display name would be broader and much noisier; it can be a later search mode.
2. **Confirmation is the feature, not a dialog on top of it.** Matches arrive unchecked-able individually with their current values shown, so the user sees exactly what each Table says now before agreeing to change it. This is what the request asked for.
3. **Managed Columns are shown, not hidden.** Customising a managed Column is legitimate and creates an unmanaged layer. Rows are editable where `IsCustomizable` is true and disabled with a stated reason where it is false. Hiding every managed Column would silently drop rows administrators routinely edit.
4. **Writes go through the Bulk Run engine, then publish once.** One plan item per Column, so a partial failure names the Tables that did not take, followed by a single publish covering the Tables that changed.
5. **Polymorphic management covers existing lookups, not only new ones.** The XrmToolBox tool does this, so v1 does too. Adding a target is expected to create an additional relationship onto the existing lookup Column and removing one to delete that relationship; the exact request shape is confirmed during implementation.
6. **Both are Workspaces on one page.** A Table-by-property matrix and a target list both need width, and neither belongs in the side panel.
7. **Solution scope is always chosen.** Both tools take a solution through the shared picker, so the work lands where the user expects rather than in the environment default.

## Column search

Type a logical name, optionally narrow to a solution or to custom Tables, and get one row per Table carrying that Column: the Table, the current label, requirement level and description, the attribute type, whether it is managed, and whether it is customisable. Rows whose type differs from the majority are flagged rather than hidden, since a type mismatch is itself worth seeing.

## Column edit

Choose which of label, requirement level and description to change and to what, leaving the others untouched. Preview, confirm, run, publish.

## Polymorphic lookups

Create a polymorphic lookup on a Table with a chosen set of target Tables, and manage an existing one by adding or removing targets. Solution-scoped.

## Verification

Pure helpers are unit tested: the match filter, the type-mismatch flag, the customisable gate, the edit plan, and the set of Tables needing a publish. The harness needs metadata fixtures with one Column on five Tables, one of them managed and not customisable and one with a different type. Every write, and the exact polymorphic requests, need a real org.

## Out of scope (v1)

Display name matching. Creating or deleting Columns. Changing a Column type, length or precision. Choice option edits. Renaming schema names. Bulk edits across environments in one run.

## Acceptance

- Searching a logical name lists every Table in the environment that has it, with current values.
- Matches start unselected and nothing is changed until the user selects and confirms.
- A Column that is not customisable is visible, disabled, and says why.
- A Column whose type differs from the rest is flagged.
- A run reports per Table and publishes once for the Tables that changed.
- A polymorphic lookup can be created, and targets added to and removed from an existing one.
- Both tools write into a solution the user chose.
