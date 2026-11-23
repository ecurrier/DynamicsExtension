# XML pane autocomplete

Status: resolved
Type: task
Phase: 1
Blocked by: 02, 04

See `../spec.md`, decision 14.

Before starting, read the `## Comments` sections of issues 01 and 02: they document the Query core's API and the decisions made while building it.

A CodeMirror completion source for the XML pane, in `src/query-builder/editor/`, with the context detection as a pure, tested function (given the text and a cursor offset, what is being completed and inside which elements). It has to work while the XML is mid-edit and does not parse, which is the normal state while typing; the error-tolerant `@lezer/xml` tree gives this.

Completions:

- After `<`: the elements valid under the current parent, from the catalogue. Accepting one inserts the tag with its required attributes as empty placeholders and puts the cursor in the first.
- Inside a tag, at an attribute name: the element's attributes not already present, common ones first, each with its description.
- Inside an attribute value:
  - Enumerations and booleans from the catalogue (`link-type`, `type`, `aggregate`, `dategrouping`, `descending`, and so on).
  - `entity name`, `link-entity name`: Table logical names, with display names as detail.
  - `attribute name`, `condition attribute`, `order attribute`, `link-entity to`: Columns of the enclosing Table; `link-entity from`: Columns of the link-entity's own Table. `condition entityname` and `valueof`: the aliases defined in the Query.
  - `condition operator`: operators that apply to the Column named by the same condition's `attribute`, or all operators when it cannot be resolved.
  - `condition value` on a Choice or yes/no Column: the options, inserting the number with the label as detail.
- Metadata comes from the same TanStack queries the tree uses. If a Table's metadata is not loaded, request it and offer the completions when it arrives; never block typing.
- Closing tags: `</` completes the open element's name. Keep CodeMirror's existing bracket and tag behaviour.

Acceptance:

- Unit tests for context detection: each position above, in valid XML and in XML broken ahead of and behind the cursor, nested link-entities resolving to the right Table, and a condition inside a link-entity's filter.
- In the harness: typing `<condition attribute="` inside the account entity's filter offers account Columns, and inside the contact link-entity's filter offers contact Columns; `operator="` after a Choice Column offers the list operators and not `like`.
- `npm run typecheck`, `npm run lint` and `npm test` pass. Verify in the harness and include a screenshot.

## Comments

2026-11-22: the pure-logic half is done (Opus worker, reviewed; 85 tests). What remains is the CodeMirror adapter and attaching it to the XML pane.

In `src/query-builder/editor/` (barrel `index.ts`, no CodeMirror imports):

- `completionContextAt(text, offset)` returns a `CompletionContext`: `element-name`, `closing-tag`, `attribute-name`, `attribute-value` (with a resolved `scope`: owning Table, links, aliases, `valueof` targets, the condition's Column), `value-text` (the body of a `<value>`), or `none`. Every kind but `none` carries `from`, `to` and `typed`. It reads the error-tolerant Lezer tree, after two small repairs to unterminated values and tags, so it works on XML that does not parse.
- `completionsFor(context, metadata, { names, tables })` returns `{ from, to, typed, items, pendingTables }`. An item is `{ label, value, detail?, description?, kind, rank, apply?: { insert, cursorOffset } }`, already sorted, lower rank first.

What the adapter has to do:

1. Call both with the document text and cursor position; return null when there are no items.
2. Request the Tables in `pendingTables` through the shared Table metadata loader, and call `startCompletion` again when they arrive.
3. Map each item to `{ label, detail, info: description, type: kind, boost: -rank }`.
4. `apply` is `item.value`, or, when the item has `apply`, a function that dispatches `{ changes: { from, to, insert }, selection: { anchor: from + cursorOffset } }`.
5. CodeMirror filters on `label` only. To match on display names and operator meanings too (spec decision 28), filter in the source on `label`, `detail` and `value` and return the result with `filter: false`.

Decide in the adapter step: accepting `<condition` inserts only `operator=""`, because the catalogue marks only `operator` as required. It should insert `attribute="" operator=""` with the cursor in `attribute`; special-case it in `completions.ts`.

Known limits: the scope rules here are a second copy of those in `@/shared/lib/fetchxml` `metadata.ts` (they have to run on text that does not parse), so a change to one must be made in both. The cursor just before an opening quote, or after `<` followed by a space, completes nothing. An unclosed `<condition>` swallows what follows it, so only `value` is offered there until it is closed.

2026-11-22: the adapter is done and the issue is resolved (Opus worker, reviewed and verified; in the harness, typing `<attribute name="acc` on a new line offered the account Table's Columns matching by logical and display name while the XML did not parse).

- `editor/completionSource.ts` is the CodeMirror source, `editor/completionFilter.ts` filters across label, detail and value and reuses `rankPickerOptions` from `lib/pickerSearch`, `editor/editorTheme.ts` styles the popup from Fluent tokens. `@codemirror/autocomplete` is pinned at 6.20.3.
- `fetchXmlCompletion` keeps its metadata and settings in editor state, refreshed by `updateXmlCompletionServices`. The popup is fixed-position, so no ancestor of the editor may use `transform` or `filter`.
- Accepting `<condition` inserts `attribute="" operator=""` with the cursor in `attribute`. After a completion that leaves the cursor inside empty quotes, the list opens again.

Not verified: a real org; metadata loading for a Table named only in text that does not parse yet.
