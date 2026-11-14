# 06 - Error boundaries and crash fallback

Status: resolved
Type: task
Blocked by: 03

Today a render crash white-screens the whole extension with nothing captured.

Put a boundary around each Area, inside the Area outlet, so a crashing Area does not take the
shell, the nav, or the route to the feedback screen with it. Put one at the app root as a backstop.

The fallback shows a short message and **Report this**, which opens the feedback Area with Bug
preselected and the crash attached.

Attach the stack automatically: it is a walk through the extension's own public bundle, not the
user's data. Show the error name and message as editable text the user can keep or delete, because
the message is the one field that can carry interpolated tenant data.

Ship source maps, since the source is already public and withholding them only costs readability.

## Answer

`src/shared/components/ErrorBoundary/`, wired into `AreaOutlet` per Area and `AppProviders` at the
root. Source maps ship via `build.sourcemap` in `wxt.config.ts`.

One thing this turned up that the spec had not: V8 puts the error message on the first line of
`stack`, so attaching the raw stack would have smuggled the message back in after the user deleted
it. `stackFrames` keeps only the `at ...` lines. Verified end to end in the harness: clearing the
error field leaves no trace of it anywhere in the report.
