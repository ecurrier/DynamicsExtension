# Tree: row editors and the details pane

Status: ready-for-agent
Type: task
Phase: 1
Blocked by: 06

See `../spec.md`, decisions 9, 10, 12, 13, 27. The prototype's variant D shows the intended feel.

Each tree row becomes its own editor with compact controls, so the common edits never leave the row, and a details pane beside the tree shows every attribute of the selected row. Row and pane share the same editor components and edit the same Query. All labels are Fetch XML's own words (decision 27).

- **One searchable picker** (decision 28), a shared component used for every single-select list in the row and the details pane: Table, Column, relationship, operator, link type, alias, aggregate, and single Choice or yes/no value.
  - Closed, it shows the current value. On focus or click the list opens and the input empties, with the current value shown as its placeholder, so the first keystroke starts a fresh search; typing filters the list. Do not rely on selecting the existing text on focus: the prototype tried that and a click often left the caret at the end, so typing appended to the old value and matched nothing. After a pick, typing again without leaving the control starts another fresh search.
  - Fluent `Combobox` quirks the prototype ran into, to save rediscovering them: typing makes Fluent clear the selection through `onOptionSelect` with an undefined value, so ignore that and control `selectedOptions`; Tab picks the active option by default, which must be ignored; its built-in matching only tests option-text prefixes, so do the filtering yourself and make sure the first filtered option is the active one; clicking the input toggles the popup, so `open` has to be controlled or the click that follows the focus closes it again.
  - Each option has a main text, optional secondary text, and optional extra search keys. Matching is a case-insensitive substring over all three. Options whose main text starts with the query rank first, then other main-text matches, then matches in secondary text or keys, keeping the original order within each rank. The matched part of the main text is highlighted.
  - Table and Column options lead with the logical or display name according to the names toggle and carry the other as secondary text, so typing either finds them. Operator options lead with the literal operator and carry its plain-English meaning. Relationship options are also findable by the other Table's name and the joining Column. Choice values are findable by label or number.
  - Keyboard: Down and Up move, Enter picks the active option (the first match is active as soon as the user types), Escape closes and restores the current value. Tabbing or clicking away without picking also restores it; a half-typed query is never written to the Query.
  - No match shows a single disabled "No matches" row. At most 50 options are rendered, followed by a disabled "N more, keep typing" row.
  - The filtering and ranking is a pure function with tests. Put the component in `src/shared/components/` only if an existing picker there can adopt it in this issue without risk; otherwise keep it in the Workspace.
  - Inside the tree, the popup must not toggle the branch or pull focus to the row (the two root handlers from issue 06 cover clicks; check the popup's portal is covered too), and typing in it must not trigger tree type-ahead.
- **condition**: Column picker, operator picker, value editor.
  - The Column picker lists the Columns of the enclosing Table (the nearest `entity` or `link-entity`, or the one named by `entityname`), searchable by logical and display name.
  - The operator picker lists the operators that apply to that Column's type, from issue 02's catalogue. Changing the Column keeps the operator when it still applies and otherwise resets it to the first that does; a value that no longer fits is cleared.
  - The value editor follows the Column type and the operator's value count: none; Choice dropdown (multi-select for list operators, written as `<value>` children); yes/no; date; number; a Record lookup using the shared `RecordLookup`, writing `value`, `uiname` and `uitype`; text. Two-value operators show two inputs. List operators on non-Choice Columns take one value per line or comma-separated and write `<value>` children.
  - A switch on the value turns it into "compare to a Column", writing `valueof` with a picker of the Columns reachable in the Query (own Table, or `alias.column`).
- **attribute**: Column picker; alias shown on the row once set. In an aggregate Query the row also shows the aggregate function or "group by", and the alias is required.
- **order**: Column picker (or alias picker in an aggregate Query) and an `ascending` / `descending` toggle.
- **filter**: an `AND` / `OR` toggle.
- **link-entity**: a relationship picker listing the parent Table's relationships in both directions, searchable, each showing the other Table and the Column that joins them; choosing one sets `name`, `from` and `to` together. Then link type and alias. A link-entity whose `name`/`from`/`to` match no relationship shows as "custom join" with the three values editable in the details pane.
- **entity**: Table picker. Changing the root Table asks first, then keeps only what still applies.
- **fetch**: `top` and `distinct` on the row.
- Operator pickers show the literal operator (`eq`, `like`, `last-x-days`) as the main text with its plain-English meaning as secondary text. Choice and yes/no values show label and stored value together (`Active · 0`).
- **The details pane**: sits between the tree and the XML pane, resizable by its divider and collapsible to a thin strip, the whole of which is the button that reopens it (not only an icon on it); a "details" action on each row selects the row and opens the pane if it is collapsed. Its header shows the element (`<condition>`) and the row's summary. Its body lists every attribute the catalogue defines for the element, those on the row included, generated from the catalogue: the label is the attribute's literal name, the hint is the catalogue's description, and the control follows the value kind (an enumeration is a dropdown, a boolean a switch, a number a number input, a Column or Table or alias reference the matching picker, anything else text). Attributes present in the XML but unknown to the catalogue are listed read-only as "left as written". With nothing selected it shows a one-line hint.
- Pickers use metadata for the first Connection, loaded per Table and cached for the session; a row whose Table is still loading shows its current values as text and becomes editable when the metadata arrives.
- Every edit goes through issue 01's edit operations, regenerates the XML, and joins the undo history from issue 06.
- Widths: inline controls size to their content between a minimum and a maximum per kind of control, re-measuring as the value changes, so a value such as `1000021` or a long Column name is shown whole on the row whenever the row has room; only past the maximum does a control clip, and then the full value is in its tooltip and in the details pane. In the prototype a seven-digit number was cut off on the row; that must not happen. Controls must fit one line per row at a 700px-wide tree for ordinary values; below that the row scrolls sideways. The tree has a minimum width of 360px and the details pane of 240px; when the Workspace is too narrow for tree, details and XML together, the details pane collapses first, and it reopens at its last width when there is room or when the user asks for it.

Acceptance:

- In the harness, building this from Blank using only the tree produces valid XML that runs: accounts where status equals Active and (industry is one of two options or name like `%Contoso%`), linked outer to the primary contact with two Columns, sorted by name descending.
- Changing a condition's Column from a text Column to a Choice Column resets `like` to `eq` and replaces the text input with a dropdown.
- Setting `dategrouping` on an attribute through the details pane writes it to the XML; an unknown attribute typed in the XML shows in the pane as left as written. Changing a condition's operator on the row changes it in the pane and the reverse.
- Typing in a row's text input does not move tree focus or trigger tree type-ahead.
- A condition value of `1000021` is fully visible on its row; typing more digits widens the input up to its maximum. Clicking anywhere on the collapsed details strip reopens the pane.
- Unit tests for the picker's filtering and ranking. In the harness, on a Table with at least 60 Columns: typing three letters of a display name while logical names lead finds the Column; typing "equals" finds `eq`; Escape and clicking away both leave the Query unchanged.
- `npm run typecheck`, `npm run lint` and `npm test` pass. Verify in the harness and include a screenshot.
