# Tree: structure and two-way sync

Status: ready-for-agent
Type: task
Phase: 1
Blocked by: 02, 04

See `../spec.md`, decisions 7, 8, 9, 11, 12, 27. The prototype's variant D in `src/query-builder-prototype/` (or on the `prototype/query-builder-tree` branch if it has been removed) shows the intended feel; it is throwaway code written without tests, so use it as a picture, not as a source to copy.

The left pane becomes the tree. This issue covers showing the Query, keeping it in step with the XML, and changing its structure. Editing a row's values is issue 07; in this issue each row shows a read-only one-line summary.

- Render the last valid Query as a tree in document order: `fetch`, its `entity`, and everything beneath, with branches that expand and collapse. Expansion is keyed by node path and everything starts expanded.
- Each row shows an icon for its kind and a summary in Fetch XML's own words (decision 27): for example `name like %Contoso%`, `contact · link-type outer · alias pc`, `AND`. Icons follow the prototype's variant D set; do not use a function ("fx") icon for conditions. A comment is a muted comment row. An element the catalogue does not know is a plain row showing its tag, marked "edit in XML". The names toggle in the header swaps logical and display names (decision 12), using metadata from `getTable`, loaded per Table as rows need it.
- Selection sync: selecting a row selects its range in the XML pane and scrolls it into view; moving the cursor in the XML pane selects the row whose range contains it. Neither direction steals focus from the pane the user is working in.
- Structure edits, from row actions shown on hover and focus and always on the selected row, and from the keyboard: add a child (a menu of the kinds the catalogue permits under this row, each created with sensible defaults: a condition on the Table's primary name with `eq`, a filter of the opposite type to its parent, a link-entity on the first relationship with a generated unique alias), delete, move up, move down, and switch off and on. `fetch` and `entity` cannot be deleted, moved or switched off. A row with switched-off rows beneath it has its switch disabled with a tooltip saying why. Keyboard: Delete removes, Alt+Up and Alt+Down move, Ctrl+/ switches off and on.
- Every structure edit goes through issue 01's edit operations and then regenerates the XML text in standard formatting (decision 8). An undo of the last tree edit must be possible with Ctrl+Z in either pane: keep a small history of XML texts in the store.
- A switched-off row and everything under it renders dimmed with an "off" marker.
- While the XML does not parse, the tree shows the last valid Query greyed out and inert, under the same banner as the XML pane.
- Keyboard: the tree is navigable with the arrow keys per the ARIA tree pattern. Use Fluent `Tree` with the two root handlers described in spec decision 9, so that a click inside a row never toggles its branch; issue 07 puts editors in the rows and depends on this.

Acceptance:

- In the harness: pasting the fixture Query shows the matching tree; clicking a row highlights its XML and placing the cursor in a condition's XML selects its row; add, delete, move and switch-off each change the XML as expected and Ctrl+Z undoes them; breaking the XML greys the tree and fixing it restores the same expansion and selection.
- An unknown element and a free-text comment both show as rows and survive a tree edit elsewhere.
- `npm run typecheck`, `npm run lint` and `npm test` pass. Verify in the harness and include a screenshot.
