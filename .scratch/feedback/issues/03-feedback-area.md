# 03 - Feedback Area

Status: resolved
Type: task
Blocked by: 01, 02

A fourth Settings Area, `settings.feedback`, holding the form, the preview, and the About block.

Bug / Idea toggle changes the fields. Bug asks what you were doing (required), what happened, what
you expected. Idea asks what you are trying to accomplish (required) and what would help.

Preview always visible and editable below the fields.

Primary **Continue on GitHub**, secondary **Copy report**, plus a line that a GitHub account is
needed to post. Past the length limit the primary swaps to Copy with the reason stated.

After opening GitHub: a neutral "Opened on GitHub" state, report intact, offering **Clear** and
**Open again**. Never claim the report was submitted.

About block carries the version, a link to the repo, and a link to the privacy policy.

No step explainer. A form is its own instruction.

## Answer

`src/modules/settings/areas/feedback/`. Toggle, prompts, editable preview, counter, the three
actions and the About block. Toggling the type clears a hand-edited preview, since it is a
different document; editing a field does not, and a "Use the generated report" button appears
instead. The Opened-on-GitHub state says only that the tab was opened, because that is all the
extension knows.
