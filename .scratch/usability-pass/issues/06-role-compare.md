# Role Compare Polish

Status: resolved
Type: task

See `../spec.md`, "Role Compare and Privilege Editor".

- Filter the role list with `TableFilter` from `01`; a prefix search is the stated use, so matching on the role name is enough.
- Remove the "Business units" column. Nothing on this screen acts on a business unit, and the count only raises a question it does not answer. Replace it with one line of text above the table saying roles are shown once and compared at the root business unit.
- Relabel the toggle. "Show privileges they agree on" reads as a mystery; it becomes an explicit control labelled "Differences only", defaulting on, with a hint saying how many rows it is hiding.
- Render the depth cells with `ValueChip` from `02` so agreement and disagreement are visible at a glance.
- Filter the comparison table too, matching on table name and privilege name.
- Harness: verify with roles that differ on a few privileges so the differences-only default is visibly smaller than the full matrix.

Blocked by: 01, 02

## Comments

The toggle is now `Differences only`, on by default, and the caption says how many identical rows it is hiding, which is what the old label failed to convey.

The business unit column is gone. It reported a fact nothing on the screen acted on; the field hint now states once that each role is listed once and compared at its root business unit.

Depth and access type render as `ValueChip`, so agreement reads as a block of one colour and a difference stands out without reading the words.

Verified in the harness: filtering the role list to "basic" gives "1 of 5", selecting across two different filters keeps both selections, and the comparison reports "26 of 32 privileges differ across 2 roles, 6 identical rows hidden" with six distinct chip colours in the matrix.
