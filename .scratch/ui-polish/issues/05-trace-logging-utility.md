# Trace logging becomes a Utility card

Status: resolved
Type: task

See `../spec.md`, decision 7, and `docs/adr/0003-area-width-and-workspace-launch.md`.

`PluginTracesArea` is deleted by issue 06, and it carries the only way to change the trace logging level without opening a Workspace. Setting that level is a one-shot action on the open page, which `CONTEXT.md` calls a Utility, so it belongs on a Utilities card rather than on a launcher screen.

- Add a Utility card on the Utilities Developer Area showing the current level and a control to set it Off, Exception or All.
- It reuses the page command the launcher already calls. No gateway work.
- The Trace Viewer keeps its own copy in its header. Both read and write the same value, so changing one must be visible in the other after a refetch.
- Give the card `keywords` so nav search finds it under "trace", "logging" and "plugin".
- The launcher's `ensureHostAccess` call is not part of this card; issue 06 moves that responsibility.

## Answer

- `TraceLoggingCard` sits on the Utilities Developer Area and holds the level dropdown and the hint that used to live on the launcher screen. It calls the same `traces.getSetting` and `traces.setSetting` page commands, so no gateway work was needed.
- The `traceLogging` entry in `DEVELOPER_UTILITIES` carries the keywords "trace", "logging", "plugin", "logs" and "exceptions", so nav search finds it.
- `TaskCard`'s `onAction` is now optional. The card's own control is the action, so there is no second button to press.
- Both copies read the same value through the same query key, so the Trace Viewer header shows a change made on the card after a refetch, and the other way round.
