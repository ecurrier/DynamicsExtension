# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`, never a single combined tickets file
- Triage state is recorded as a `Status:` line near the top of each issue file (see `triage-labels.md` for the role strings)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` (the Notes / Decisions-so-far / Fog body).
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.

## Intake from users

GitHub Issues is the front door; `.scratch/` stays the work tracker. They are separate systems and
the handoff between them is manual, so it is written down here rather than remembered.

Power Tools' Send Feedback Area composes a report in the browser and opens a prefilled GitHub issue
that the user submits themselves. The extension transmits nothing, which is why `PRIVACY.md`, the
`host_permissions` in `wxt.config.ts` and `docs/store-submission.md` are untouched by that feature.
A change that adds an outbound request is not a tweak to it. See `.scratch/feedback/spec.md`.

A report arrives as a GitHub issue titled `[Bug] ...` or `[Idea] ...`.

- Triage it on GitHub. Label it there, and ask the reporter for anything missing there, where they
  can actually answer.
- If it becomes work, create the `.scratch/<feature-slug>/issues/<NN>-<slug>.md` file as usual and
  put a `Reported by: <github issue url>` line next to the `Status:` line.
- When the work ships, close the GitHub issue with a pointer to the version. The reporter is
  subscribed to their own issue, so that close notification is the only reply they ever get. Make
  it say something.

Do not copy a report into `.scratch/` and close the GitHub issue straight away. That issue is the
reporter's only window onto what happened to their report.
