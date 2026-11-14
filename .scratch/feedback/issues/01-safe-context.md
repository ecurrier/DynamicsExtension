# 01 - Safe context collector

Status: resolved
Type: task

Build the module that gathers the automatic context a report carries, and nothing else.

Collect only: extension version (`__APP_VERSION__`), browser name and major version, OS platform,
Surface, Area id, Page Context kind, theme preference, UI language.

Never collect: org URL, user name or id, roles, teams, record GUIDs, table or column names,
Dataverse error bodies.

Keep the formatting pure and testable: read the globals in one thin function, and pass the values
into the formatter so a test can drive it without a browser. The collector lives in
`src/shared/lib/`, not `src/shared/components/`, so the page and background bundles could use it
without pulling React in.

An Idea carries the version only.

## Answer

`src/shared/lib/feedback/context.ts`. `buildSafeContext` takes plain values and returns the eight
safe fields; `describeBrowser` and `describePlatform` are pure and tested. The module imports
nothing from `@/shared`, so it can never drag React, Fluent or an extension API into the page or
background bundle. Verified in the harness: the Area block names the Area the user came from, not
the feedback screen.
