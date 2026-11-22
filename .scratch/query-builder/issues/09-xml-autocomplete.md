# XML pane autocomplete

Status: ready-for-agent
Type: task
Phase: 1
Blocked by: 02, 04

See `../spec.md`, decision 14.

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
