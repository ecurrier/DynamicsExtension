# Navigate To Record

Status: resolved
Type: task

See `../spec.md`, "Navigation" and decision 4.

- Add `"utilities.navigateToRecord": { args: { entityLogicalName: string; recordId: string }; result: void; kind: "mutation" }` to `CommandMap` in `src/messaging/contract/commands.ts`.
- Implement in `src/page/handlers/utilities/recordUrls.ts` (or a sibling) calling `getXrm().Navigation.navigateTo({ pageType: "entityrecord", entityName, entityId }, { target: 1 })`, guarded by `requireModelDrivenApp()`, so the bound tab moves in place without reloading the app.
- Add a `COMMAND_TIMEOUTS` entry in `src/messaging/tab/invoke.ts` only if the default thirty seconds proves wrong; navigation resolves quickly.
- Register the handler in `src/page/handlers/index.ts`; the exhaustive `HandlerMap` will not compile until it exists.
- Harness: the shim logs the call and records the requested Record so the Area can assert the highlight moved.

Blocked by: none

## Comments

`utilities.navigateToRecord` calls `Xrm.Navigation.navigateTo` with `target: 1`, which moves the bound tab in place and keeps the single-page app session rather than reloading the whole app on every step.

The default thirty second timeout was left alone; navigation resolves immediately and a bespoke timeout would be noise.
