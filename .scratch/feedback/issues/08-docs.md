# 08 - Documentation

Status: resolved
Type: task
Blocked by: 06, 07

Two docs change.

`docs/agents/issue-tracker.md` gains an intake section: GitHub Issues is the front door, `.scratch/`
stays the work tracker, and the handoff between them is written down. Undocumented, it decays
inside a month, and then reports pile up unanswered, which is worse for the reporter than never
having offered the feature.

`docs/build-and-deploy.md` gains source-map archiving and a git tag in the release steps. There are
no tags today; releases are marked by a commit message only, so a report's version cannot be
matched to a build.

`PRIVACY.md`, `wxt.config.ts` permissions and `docs/store-submission.md` stay unchanged. That is
the point of the design, and it is worth saying so in the issue-tracker doc.

## Answer

`docs/agents/issue-tracker.md` gained an Intake from users section; `docs/build-and-deploy.md`
gained the source-map note and a git tag step. `PRIVACY.md`, the permissions in `wxt.config.ts` and
`docs/store-submission.md` are untouched, as designed.
