# Shared step explainer

Status: ready-for-agent
Type: task

See `../spec.md`, decision 8.

`HowItWorks` lives in `src/schema-tools/ColumnSearch.tsx` and is used twice, both inside that one file: full width on the Cross-Table Columns start screen, and `stacked` inside a 300px popover behind a "How it works" button once a search has run. That two-state behaviour is exactly what is wanted everywhere, and it needs no stored preference — the state follows the work, so the explainer returns by itself when the user comes back to an empty screen months later.

- Move it to `src/shared/components/StepExplainer`. Keep the `HowItWorks` name inside if you prefer; the shared component is the point, not the name.
- Its grid hard-codes `repeat(3, minmax(0, 1fr))` regardless of `STEPS.length`. Make the column count follow the list.
- Keep both renderings: full size on an empty screen, `stacked` in a popover behind a subtle "How it works" button after the user's first action.
- The steps themselves stay beside the Area that owns them. Only the rendering is shared.
- Give one to every Area that shows nothing until the user picks something. Start with Polymorphic Lookups, whose empty state is two prose paragraphs today, then the Data Transporter, Role Compare, the Privilege Editor, Record Access, Column Usage and Row Counts.
- "Niche" is not the rule and must not become it. The rule is "this Area is empty on arrival", because a reviewer can check that and cannot check niche.

Blocked by: 07
