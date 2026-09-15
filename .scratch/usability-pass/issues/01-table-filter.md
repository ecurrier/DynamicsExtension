# Table Filter

Status: resolved
Type: task

See `../spec.md`, "Shared components" and decision 2.

- New `src/shared/components/DataTable/useTableFilter.ts` exporting `useTableFilter(items, fields)`, returning `{ query, setQuery, filtered, total }`, where `fields` maps an item to the strings a search should look at.
- Pure helper `matchesFilter(haystacks, query)` in `src/shared/lib/` with tests: case-insensitive, trims, every whitespace-separated term must match somewhere, an empty query matches everything.
- New `src/shared/components/DataTable/TableFilter.tsx`: a small `Input` with a search icon and a count such as "12 of 340", sized to sit above a table in a `FormRow`.
- The filter never touches selection. Callers keep selection in their own state, so document and test that filtering a multi-select table leaves the selected set untouched.
- Export from `src/shared/components/index.ts`.

Blocked by: none

## Comments

`matchesFilter` requires every whitespace-separated term to match somewhere across the supplied fields, so "contoso account" finds a row whose name and table each match one term. Filtering is done by the caller over its own array, and selection is held separately, which is what makes decision 2 hold without any special handling.
