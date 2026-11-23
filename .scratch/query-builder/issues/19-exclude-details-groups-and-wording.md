# Exclude wording, details pane groups, and a wording pass

Status: ready-for-agent
Type: task
Phase: 1
Blocked by: 07, 08, 09

See `../spec.md`, decisions 9, 10, 11, 27, 30, 31. `CONTEXT.md`: Exclude.

Before starting, read the `## Comments` sections of issues 01, 02, 06, 07, 08 and 09.

This comes from the user trying the Workspace after issue 07. Four things, in their words and then as work.

## 1. "Switch off" becomes Exclude

> "switch on/off" feels like the wrong terminology ... this feature is for troubleshooting. You wouldn't ever logically leave a commented out piece of fetchxml from production-ready code ... The purpose of this feature is to allow quick switches on small, targeted pieces of the fetchxml in order to test a query one with and one without.

The feature is a test aid: leave a row out of the Query, run it, put it back. The word is now **Exclude** and its opposite **Include** (spec decision 11, `CONTEXT.md`).

- UI text: every label, tooltip, badge, reason and message that says "switch off", "switched off", "switch on" or "off" for this feature says Exclude, Excluded or Include. The gutter control's accessible name is "Exclude from the Query" or "Include in the Query". An Excluded row carries an "excluded" marker. Reasons a row cannot be Excluded are rewritten in the same terms.
- Code: rename to match, so the code and the glossary agree: `switchedOff` to `excluded`, `switchOff` and `switchOn` to `exclude` and `include`, `acceptSwitchedOff` and any other identifier, test name and file name that uses the old words, in the Query core, the Workspace and their tests. A mechanical rename with no behaviour change; every existing test still passes.
- **Excluded rows are visible at a glance.** When a Query has Excluded rows, the tree's toolbar shows a count ("2 excluded") that opens a menu with **Include all** and **Delete excluded**. Each is one undoable edit. Delete excluded removes the Excluded rows; it never touches ordinary comments.
- **Copies leave test scaffolding out.** In the Query core's serialiser, the minified form and the JavaScript and C# string forms leave Excluded rows out (an option on `serializeFetchXml`, on by default for those forms and off for the standard form). The standard formatted form is the XML as it is. Ordinary comments are kept in every form. Tests for both.

## 2. Details pane: three groups

> Details pane layout needs to be updated to clearly separate what is "expected" for an element and what is considered "additional details" or "legacy settings". I'm seeing a lot of properties for elements like `<fetch>` and there is seemingly nothing to distinguish what is actually important and what is auxiliary information, besides the order in which the inputs appear.

Replace the catalogue's `common` flag with a `group` on every attribute, one of three, and lay the details pane out by it (spec decision 30).

- **Main**: what a person normally sets on this element. Always shown, at the top, with no heading. Everything on the tree row is in this group.
- **More options**: documented attributes that are used now and then. Under a heading, collapsed until asked for.
- **Legacy and view settings**: attributes the reference marks as legacy or does not document because only saved views write them (`documented: false`), and any attribute present in the XML that the catalogue does not know ("left as written", read-only). Under its own heading, collapsed until asked for.

Rules:

- A collapsed group's heading shows how many of its attributes are set ("More options · 2 set"). A group with a set attribute opens by itself when the row is selected; a group with nothing in it for this element is not shown.
- Whether each group is open is remembered for the session per group, not per row, so opening "More options" once keeps it open while moving between rows.
- An attribute moves to Main when the Query makes it necessary: `aggregate`, `groupby` and `alias` on an `attribute`, and `alias` on an `order`, when `fetch` has `aggregate="true"`; `dategrouping` when the attribute is grouped and its Column is a date. This is a pure function of the element, the Query and the metadata, with tests.
- Starting classification (the reference's own "legacy" marks win where they differ; record any change in this issue's comments):
  - `fetch`. Main: `top`, `distinct`, `aggregate`, `returntotalrecordcount`. More: `count`, `page`, `paging-cookie`, `aggregatelimit`, `datasource`, `latematerialize`, `options`, `useraworderby`. Legacy and view: `version`, `mapping`, `no-lock`.
  - `entity`. Main: `name`.
  - `attribute`. Main: `name`, `alias`. More: `aggregate`, `groupby`, `distinct`, `dategrouping`, `usertimezone`, `rowaggregate`.
  - `order`. Main: `attribute`, `descending`. More: `alias`, `entityname`.
  - `filter`. Main: `type`. More: `hint`. Legacy and view: the three quick-find attributes.
  - `condition`. Main: `attribute`, `operator`, `value` (with its compare-to-Column switch, which writes `valueof`). More: `entityname`. Legacy and view: `uiname`, `uitype`.
  - `link-entity`. Main: the relationship picker, `name`, `from`, `to`, `link-type`, `alias`. More: `intersect`. Legacy and view: `visible`.
- The validation message for an attribute (issue 08) shows under its field in whichever group it is in, and a group that holds a problem opens by itself.

## 3. "(optional)" on fields that are not required

> It may also help if we label certain inputs as "[Label] (optional)" for inputs that are not required for well-formed valid xml, like the alias input for example.

- In the Main group, a field whose attribute is not required for a valid Query shows "(optional)" after its label, in a quieter weight: `alias (optional)`. Required fields show nothing extra. Use the catalogue's `required`, plus the same Query-dependent rule as above (an `alias` in an aggregate Query is required, so it loses the mark).
- The other two groups hold only optional attributes, so their fields carry no mark; the group heading says it once ("More options", not "More options (optional)" on every field).
- On a tree row, an empty optional inline input shows `optional` as its placeholder (the `alias` on a `link-entity` row).

## 4. Fewer descriptions, and those that stay in Simplified Technical English

> Let's clean up a lot of the labelling/descriptions for static content we've used so far, like the descriptions for the inputs within the details pane. Only use descriptions where necessary, and if you are going to use them, use ASD-STE100 writing style.

Applies to every piece of static text the Query Builder shows (spec decision 31): the catalogue's attribute descriptions and operator meanings, details pane hints, tooltips, placeholders, empty states, banners, status lines, dialog text, the validation messages in `validate.ts`, the warnings in `webApi.ts`, the reasons the Query core gives for refusing an edit, and the harness README is out of scope.

**Only where necessary.** A description stays only when the name alone does not tell a developer who knows Fetch XML what the thing does or what to type. Make the catalogue's attribute description optional and delete it where the name is enough: `name`, `alias`, `top`, `distinct`, `descending`, `type`, `attribute`, `operator`, `value`, `count`, `page`, `from`, `to`, `link-type` and the like get no hint. Keep one for attributes whose effect is not obvious from the name (`latematerialize`, `useraworderby`, `options`, `datasource`, `aggregatelimit`, `intersect`, `hint`, `usertimezone`, `rowaggregate`, `entityname`, `returntotalrecordcount`, the quick-find attributes, and similar). Operators keep a meaning, because it is what the picker searches and the literal name is often terse; make each as short as it can be. Remove any tooltip or helper line that repeats its own label.

**Simplified Technical English (ASD-STE100) for what stays.** The rules that matter here:

- One sentence, one idea. Descriptions are 25 words or fewer; instructions are 20 words or fewer.
- Active voice. Simple present tense for descriptions ("Returns only the first matching row."). Imperative for instructions ("Select a row.").
- One instruction in each sentence. Put a condition first: "If the Query has `top`, the server returns one page."
- Use a word for one meaning only, and one word for one thing: always Table, Column, Record, Query, Connection, row (a line in the tree), Exclude, Include. Fetch XML's own names stay as written and in code style.
- Use short, common words. No idioms, no "e.g.", no "etc.", no "via", no contractions. Write "cannot", "do not".
- Use articles ("the", "a"). Do not drop words to make a sentence shorter.
- Do not use an "-ing" word as a noun or to join clauses. "Sorts by this Column", not "Sorting by this Column".
- Do not use "should" or "may" for what the system does. Say what it does. Use "must" only for what the user is required to do, and "can" for what is possible.
- No more than three nouns in a row.
- State a fact, then stop. No "Note that", "Please", "simply", "just".
- An error or validation message says what is wrong, names the thing, and where it helps says what to do, each as its own short sentence.

Do the pass as one sweep so the voice is consistent, and list in this issue's comments how many strings were removed and how many rewritten. Tests that assert message text change with it; tests that only need to know a diagnostic's rule should assert the `rule`, not the text.

## Acceptance

- No user-visible text in the Query Builder says "switch off", "switched off" or "switch on"; `grep -ri "switch.\{0,3\}off\|switchedOff\|switchOn" src/query-builder src/shared/lib/fetchxml` finds nothing.
- With two rows Excluded, the tree's toolbar shows "2 excluded"; Include all restores both in one undo step; Delete excluded removes both and leaves an ordinary comment in place.
- Copy as minified, JavaScript string and C# string leave Excluded rows out and keep ordinary comments; the formatted copy is unchanged.
- Selecting `fetch` on a pasted view Query shows four fields under no heading, "More options" collapsed with a count when something in it is set, and "Legacy and view settings" collapsed holding `version` and `mapping`. Setting `aggregate` to true moves `aggregate`, `groupby` and `alias` into Main on an `attribute` row and removes "(optional)" from `alias`.
- `alias (optional)` shows on a link-entity's details; `name` shows no mark.
- `name`, `alias`, `top` and `type` show no hint; `latematerialize` and `intersect` show one sentence each.
- Unit tests: the group of each attribute for each element including the Query-dependent moves; the serialiser option; Include all and Delete excluded.
- `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` pass. Verify in the harness and include screenshots of the details pane for `fetch`, `condition` and `link-entity`.
