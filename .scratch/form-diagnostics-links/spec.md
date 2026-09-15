# Form Diagnostics Links

Status: resolved
Decided: 2026-09-11

## Problem

Form Diagnostics lists the web resource libraries attached to the open form. It is a read-only list of names, so a maker who spots the library they want then has to go and find it in the maker portal by hand.

Deep linking it would close that loop. Two things are in the way. The library entries carry a name and a display order and nothing else, because they are parsed out of the form XML rather than queried, so there is no id to link to. And a web resource can sit in several solutions, so a link has to decide which one to open.

The environment id needed for a maker url is already available, and the url builders and the solution picker both already exist.

## Vocabulary

Terms from `CONTEXT.md`: Area, Table, Solution Layer, Page connection.

## Decisions

1. **The user picks the solution.** The same `useSelectDialog` and `global.getSolutions` flow the control editor Utility uses, with the same kind of setting to skip the prompt and use the default solution. Resolving which solutions actually contain the web resource would need a `solutioncomponent` query that does not exist yet, and a disambiguation interface when the answer is more than one; the picker sidesteps both and matches how the rest of the app already behaves.
2. **The id is looked up, not inferred.** The form XML `Library` element carries a `libraryUniqueId`, but it is undocumented and the parser does not read it. A single `webresourceset` query filtered by the library names is guaranteed correct, and the entity set and id attribute are already known to the codebase.
3. **The maker url shape is verified before this is called done.** The `entity` path used for control editing is pinned by tests; the web resource equivalent is not known and must be confirmed against a real org rather than guessed.

## Deep link

The libraries table gains a link action per row. It resolves the web resource id, asks for a solution unless the setting says to use the default, and opens the maker portal at that web resource. A library with no matching web resource row — possible for a library that was removed but left on the form — shows as unlinkable rather than opening a broken url.

## Verification

The url builder and the name-to-id matching are unit tested, including a library with no match. The harness covers the row action and the solution prompt from fixtures. The real maker url needs an org.

## Out of scope (v1)

Resolving the solutions that contain the web resource. Linking the other Form Diagnostics sections. Opening the web resource content in Power Tools. Editing web resources.

## Acceptance

- Each web resource library row offers a link to the maker portal.
- The solution is chosen through the same prompt the control editor uses, and the setting skips it.
- A library with no matching web resource is shown as unlinkable.
- The url opens the web resource in the maker portal, verified against a real environment.
