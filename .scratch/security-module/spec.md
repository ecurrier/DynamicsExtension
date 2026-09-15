# Security Module

Status: resolved
Decided: 2026-09-11

## Problem

The `security` Module exists with one Area, "Security Management", which assigns and removes Security Roles for one user at a time. Because it is the Module's only Area, the navigation drawer collapses it to a flat item, so it reads as a single tool rather than a place where security work happens.

Three requests want to live there. Bulk user work: pick a set of users, choose add or remove, choose roles, execute. A bulk permissions editor for rewriting privilege depth across a mix of roles and Tables, which is how an administrator moves a set of organization-scoped privileges down to business unit scope. And a comparison tool for seeing how two or more roles actually differ.

All three read the same substrate, and none of it is read today. There is no `roleprivileges` query anywhere in the codebase; the only privilege read is `RetrieveUserPrivileges`, which answers a different question.

One platform fact shapes all three. Security Roles are replicated per business unit, and `getSecurityRoles` filters only `componentstate eq 0` — it neither dedupes nor scopes by business unit. In a multi-business-unit organization the role list already shows many near-identical copies of every role. Comparing two copies of one role produces a diff of nothing, and a bulk depth change applied to one copy silently misses the rest.

## Vocabulary

Terms from `CONTEXT.md`: Module, Area, Workspace, Security Role, Gateway, Page connection, Environment connection, Table, Impersonation.

## Decisions

1. **The Module gains Areas rather than being rebuilt.** `security.roles` is re-homed as "Single User"; it already does connection selection, business unit selection, user search, staging and optional removal confirmation. The drawer expands into a category on its own once siblings exist.
2. **Roles are deduped to logical roles.** Copies are grouped by `parentrootroleid`, the root copy is the one operated on, and the user interface states that changes propagate to inherited copies. Listing every copy was rejected: a twelve-business-unit organization yields a role picker with hundreds of rows that all look the same.
3. **Privilege writes use `AddPrivilegesRole`.** It upserts per privilege, so a depth change is expressible without touching anything else. `ReplacePrivilegesRole` replaces a role's entire privilege set, which is how a bulk tool destroys privileges nobody asked it to touch.
4. **Bulk user selection is search and multiselect.** The existing `searchSystemUsers` gains a business unit filter and select-all-results. This caps the practical batch size at what search returns, which is an accepted limitation for v1.
5. **Comparison is N-way and shows differences by default.** Rows are Table and privilege, columns are roles, cells are depth; rows where every role agrees are hidden behind a toggle. The stated purpose is finding how roles differ, so differences are the default view.
6. **Bulk users is an Area, the other two are Workspaces.** Role assignment is a narrow list and works at panel width. A roles-by-Tables-by-depth matrix does not, so comparison and the privilege editor open full width and share one Workspace page.
7. **Both Connections.** Every read and write goes through `securityOperations(http)` so the Gateway serves the open tab and a saved Environment alike. Impersonation is untouched.

## Single user

The existing Area, relabelled, reading deduped roles.

## Role privileges data

`securityOperations` gains a `roleprivileges` read returning, per logical role, the privilege name, the Table it applies to, and the depth. Privilege-to-Table resolution follows the name-suffix matching already used by `recordAccess.ts`. Deduping by `parentrootroleid` happens once, in a pure helper, and every Area consumes the deduped list.

## Bulk users

Search with a business unit filter, multiselect with select-all-results, then add or remove, then pick roles, then run through the Bulk Run engine. Each item is one user and one role, so a partial failure names exactly which pairs did not apply.

## Role compare

N-way matrix, differences only by default, with a toggle for the full matrix and a copy action.

## Privilege editor

Pick roles, pick Tables, optionally filter by current depth, then set a new depth for the selected cells and run through the engine.

## Verification

Pure helpers are unit tested: the `parentrootroleid` dedupe, the privilege-to-Table resolution, the comparison matrix and its differences-only filter, and the plan each bulk action produces. The harness needs role privilege fixtures including business unit copies. `AddPrivilegesRole` needs a real org.

## Out of scope (v1)

Paste-a-list user selection. Filtering users by team or by existing role membership. Team and business unit writes. Creating or cloning roles. Miscellaneous non-Table privileges in the editor. Exporting a comparison.

## Acceptance

- The Security Module shows four Areas and the drawer renders it as a category.
- The role lists show one row per logical role, not one per business unit copy.
- Bulk user work selects several users, adds or removes several roles, and reports a result per user and role pair.
- Comparing three roles shows only the rows where they differ, with a toggle for everything.
- A depth change across several roles and Tables previews before it runs and reports per item.
- Every Area works over the Page connection and over a saved Environment.
