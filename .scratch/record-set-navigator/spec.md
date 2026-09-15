# Record Set Navigator

Status: resolved
Decided: 2026-09-11

## Problem

The newest model-driven app experience removed the record set navigator, the control that let a user open a view and then step through its Records one at a time without going back to the list. Users who worked that way now return to the grid after every Record.

Power Tools can restore it, and it is the one requested feature that genuinely needs the side panel: the list has to stay visible beside the Record it is stepping through. In a Workspace tab it would be the grid all over again.

Most of this already exists. `utilities.generateFetchXml` enumerates the grids and views on the open page and returns each as a named query, including the applied filters and sort the user can see, so the grid picker is already built. `webapi.executeFetchXml` runs a query. `DataTable` renders rows with dynamic columns. What is missing is the list itself, a way to move the tab to a Record, and two small defects in the parts being reused.

## Vocabulary

Terms from `CONTEXT.md`: Area, Record, Table, Page Bridge, Page connection, Page Requirement.

## Decisions

1. **An Area, not a Workspace.** The value is the list sitting beside the Record, which a Workspace tab cannot do. This makes the navigator the reason the side panel exists.
2. **Rows come from re-running the grid query, not from the grid control.** Nothing in the codebase reads grid rows, and the established pattern is to take the query and run it. The applied-view and subgrid queries already carry the filters and sort the user applied, so re-running reproduces what they are looking at.
3. **Capped at two hundred and fifty rows with a load-more.** This is a navigator, not an export; `webapi.retrieve-records` already covers export-shaped work, and an uncapped view can be very large.
4. **Moving the tab uses `Xrm.Navigation.navigateTo`.** It keeps the single-page app session, so stepping is fast. Rewriting the tab url would reload the whole app on every Record.
5. **Prev and next are included.** They were not asked for, but stepping is what the removed feature was for, and a list that only opens Records is the grid with extra steps.
6. **Page connection only.** The navigator is about the page the user is on, so an Environment connection is meaningless here.

## Grid selection

The picker lists what `utilities.generateFetchXml` returns for the current page. On a view page that is the applied views plus the saved queries for the Table; on a form it is the subgrids. Two defects in that command are fixed first: it throws when a view page has no saved queries, discarding applied-view results it had already computed, and the record url builder it sits beside is duplicated verbatim in the page handler and in the Utilities lib.

## Navigation

A page command that moves the bound tab to a Record, and prev and next in the Area that step through the loaded rows. The row matching the tab current Record is highlighted, and the highlight follows the tab when the user navigates in the app themselves, since tab binding recovery already reports that.

## Verification

Pure helpers are unit tested: the row-to-column derivation, the position and step arithmetic, and the matching of the tab current Record to a row. The harness covers grid selection, the list at panel width, and prev and next against fixture rows. `Xrm.Navigation.navigateTo` needs a real org.

## Out of scope (v1)

Editing Records in the list. Selecting Records for a bulk action. Sorting or filtering beyond what the chosen query already carries. Exporting. Remembering the set between sessions. Stepping past the loaded page without a load-more.

## Acceptance

- On a view page, the navigator offers the views and grids on that page.
- Choosing one loads its Records into a list in the side panel, capped with a load-more.
- Clicking a row opens that Record in the bound tab without reloading the app.
- Prev and next step through the list and move the tab with them.
- The row for the Record the tab is showing is highlighted, including after the user navigates in the app.
- A Table with no saved queries does not error when applied views are available.
