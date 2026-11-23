# Compare tab: navigation and Record links

Status: resolved
Type: task
Phase: 2
Blocked by: 17

See `../spec.md`, decisions 26, 31. `CONTEXT.md`: Comparison, Match Key, Query Run, Record, Connection.

Before starting, read the `## Comments` of issues 05, 15, 16 and 17, and part 4 of issue 19 (the writing rules).

## Why

The user tried the Compare tab and said:

> I'm a little concerned the UI is hard to navigate. I particularly don't like that when I'm on Differing columns view there's no way to open those records in their respective environment like there is in the Pairs tab.

A review of the tab at 1440x860 found what makes it hard to navigate:

1. **Seven rows of controls sit above the list.** The results header, the summary strip, the Connection tabs, the setup row, a hint line, the row of counts, the "Matched on" line, and then the Pairs / Differing Columns tabs. At the results pane's normal height, two Records are visible beneath them.
2. **Three levels of tabs.** Connection tabs, then the counts that act as a filter, then Pairs / Differing Columns. The counts do not look like a control: they are plain text and the selected one is barely marked.
3. **Two views of the same thing with different abilities.** Pairs has Record links, but only after a pair is opened, and shows values one pair at a time: seeing 22 differences takes 22 clicks. Differing Columns shows every value at once, which is the more useful view, but has no Record links at all.
4. **Record links are in a different place in every list.** In an "only in" list the link is the id cell. In Pairs it is the Connection name inside an opened pair. In Differing Columns there is none.
5. **With a primary-key Match Key the first column is a full GUID**, which pushes the readable name and the values to the right.
6. **The summary strip repeats what the Connection tabs already show**, and on the Compare tab it is not about the Comparison.

## What to build

### One list for each bucket, and one place for Record links

- **Every list in the Compare tab starts with the same leading columns: one "open" column for each of the two Connections, headed by that Connection's name.** A cell holds a link, "Open", that opens that Record in that Connection's Environment in a new browser tab, when the Record exists there and its primary key is known; otherwise the cell is empty. In an "only in" bucket there is one such column. This is the single rule for Record links in the Compare tab: same place, same label, every bucket. Lookup values elsewhere in a row remain links as they are in the results grid.
- **Different is one grid, not two views.** Remove the Pairs / Differing Columns tabs. Each row is a pair: the two open columns, then the Match Key (see below), then "Differs" (the number of differing Columns), then one column for each Column that differs anywhere in the bucket, headed by its name and how many pairs differ in it ("revenue (14)"). A cell shows `first → second` using friendly values, and is empty when that Column is the same in both. The line that explains the arrow ("Each cell shows Contoso Dev → Contoso Test.") stays, once, above the grid.
- **A row opens to show detail.** A chevron on the row, or Enter on it, opens the existing side-by-side detail for that pair beneath it: each differing Column with both values, friendly value first and the raw value beneath when it adds something. Opening rows is for the raw values; nobody should have to open rows to see what differs.
- **Filter Different by Column.** Clicking a differing Column's header, or picking from a small "Column" filter beside the explanation line, narrows the grid to pairs that differ in that Column; clicking again or choosing "All" clears it. The count in the bucket's tab does not change; the caption says how many pairs are shown ("Pairs 1-14 of 14. Filter: revenue.").
- **Same** uses the same grid shape: the two open columns, the Match Key, then the compared Columns' values (one value, since they are equal).
- **Ambiguous and No key** keep their one-sentence reason and list their Records with the open column for the Connection each Record came from.

### The Match Key column

- When the Match Key is the primary key, do not lead with the GUID. Show the Record's primary name (or the first text Column the Query returns) as the row's label, and put the GUID in a narrower column after it, truncated in the middle with the full value in its tooltip and a copy button on hover.
- When the Match Key is chosen Columns, show those Columns' values as the label, as now.

### Fewer rows above the list

Target: at the results pane's normal height in a 1440x860 window, at least six rows of the list are visible. From top to bottom the Compare tab has:

1. **The setup row**, as now: the two Connections, the swap button, the Match Key, Columns compared, Compare. The hint about choosing Columns moves into the Match Key control's own description or tooltip; it does not take a line of its own.
2. **One row for the buckets**, as a real Fluent `TabList` with each count shown as a badge, the selected bucket clearly marked, and an empty bucket shown as disabled. Order: Different, Only in the first Connection, Only in the second, Same, Ambiguous, No key. On the same row, right-aligned, the "Matched on ..." sentence in a quiet style; when the row is too narrow it becomes an info icon with the sentence in its tooltip (container query).
3. **The list**, with its explanation line only where one is needed (Different, Ambiguous, No key).

- **Hide the summary strip while the Compare tab is selected.** It belongs to the Connection tabs. The Connection tabs themselves already show each count.
- The Partial and Out of date banners stay, each as one line, above the bucket row.
- The setup row and the bucket row stay in place while the list scrolls. In the grid, the open columns and the label column stay in view while it scrolls sideways if the shared `DataTable` can pin columns; if it cannot, say so and keep them as the first columns.

### Keyboard

- Arrow keys move between rows; Enter opens or closes the row's detail; the open links are reachable with Tab within a row. Left and Right on the bucket tabs move between buckets (Fluent `TabList` gives this).

### Words

- Bucket names name the Connections: "Only in Contoso Dev", not "Only in the first".
- Every string follows the Simplified Technical English rules in issue 19, part 4. The caption for the Different grid says "Pairs", not "Records".

## Out of scope

Changing how Records are matched or compared (issue 16), exporting a Comparison, comparing more than two Connections at once, and anything outside the Compare tab except hiding the summary strip while it is selected.

## Acceptance

- In the harness, current page against Contoso Test by primary key: the Different bucket is one grid showing every differing value without opening a row; each row has "Open" under "Current page" and under "Contoso Test", and each opens the right Environment (check the link's host); opening a row shows the raw values.
- The same two "Open" columns are present in Same, and one in each "only in" bucket, and Ambiguous and No key rows have theirs.
- Clicking the `revenue` header narrows Different to the pairs that differ in `revenue`, and the caption says so; clicking again restores all pairs.
- With the primary-key Match Key, a row leads with the account's name, and the GUID is truncated with its full value in a tooltip.
- There is no Pairs / Differing Columns tab. The buckets are a tab list with badges, an empty bucket is disabled, and the selected one is clearly marked.
- At 1440x860 with the results pane at its normal height, at least six rows of the Different grid are visible. The summary strip is not shown on the Compare tab and is shown on the Connection tabs.
- Partial and Out of date still show as before, and "Compare again" works.
- Unit tests for: the columns of each bucket's grid including the open columns and which cells have a link; the label and key columns for each kind of Match Key; the Column filter and its caption. Existing Comparison tests still pass.
- `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` pass. Verify in the harness and include screenshots of the Different bucket at normal height and maximised, and of an "only in" bucket.

## Comments

Resolved 2026-11-22. Built by an Opus worker in two passes, reviewed and verified (typecheck, lint, 1,602 tests, build; in the harness the Different grid showed 22 pairs with 44 "Open" links, the first row's going to `org12345.crm.dynamics.com` and `contoso-test.crm.dynamics.com`, and seven rows visible at the normal pane height).

- `lib/compareGrid.ts` (tested) decides each bucket's columns, which cells carry an "Open" link, the label and GUID columns, the Column filter and the caption.
- The shared `DataTable` can neither pin columns nor open a row, so the Compare lists use their own small table, `compare/CompareTable.tsx`, which pins the chevron, open and label columns and handles Up, Down, Home, End, Enter and Tab. `DataTable` is unchanged.
- Different is one grid of pairs; `PairList`, `ComparisonSummary`, `DifferencesBucket`, `SetAsideBucket` and the old differing-Columns helpers are deleted. `useBucketView.ts` holds paging and the Column filter; `BucketList.tsx` renders any bucket.
- Rows above the list: the setup row, then one row with the bucket tabs and, right-aligned, an info icon (the "Matched on" sentence, plus the arrow explanation on Different), the Column filter and the caption with the pager. Below 1240px the caption drops; below 1080px the filter becomes an icon button. The summary strip is hidden on the Compare tab.
- **The results pane's default height is now 340px, up from 300px, for the whole Workspace.** The first pass showed four rows of the Different grid at 300px; with one more row of controls removed and 340px, seven show. The editors row keeps its 160px minimum and the results pane gives way in a short window.

Decisions made here: Ambiguous and No key are one list each with both open columns. With a chosen-Columns Match Key, Different and Same show no GUID column, because each side has its own id.

Left open: the Match Key hint tooltip partly overlaps the Columns list when that list opens upward. Not verified: a real org.
