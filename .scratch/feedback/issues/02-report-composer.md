# 02 - Report composer and GitHub URL

Status: resolved
Type: task
Blocked by: 01

Turn a draft plus its safe context into the markdown body of a GitHub issue, and build the
prefilled `issues/new` URL.

The body is what the user sees in the preview, so it is the thing that gets posted, verbatim. If
the user edits the preview, the edited text is what travels.

Hold the URL body under the practical limit (around 6,000 characters) and expose both the limit
and the current length, so the Area can show a counter and swap its primary action. Never truncate.

Title comes from the first line of the user's first answer, trimmed to something short, with a
`[Bug]` or `[Idea]` prefix so the templates and labels line up.

## Answer

`src/shared/lib/feedback/report.ts`. `composeReport` omits unanswered prompts, `composeTitle`
prefixes and trims, `buildIssueUrl` returns `{ url, withinLimit }` and never truncates. The limit
is 4,000 raw characters with an 8,000-character ceiling on the encoded URL, so a body that only
blows the budget once encoded is still caught. No `template` parameter: GitHub's precedence between
a named template and a prefilled body is not something to rely on.
