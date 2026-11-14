# Toasts get a close button and move out of the way

Status: resolved
Type: task

See `../spec.md`, decision 9.

The single `Toaster` sits at `position="top-end"`, which Fluent renders 16px from the top right corner — directly over the title, toolbar and search box of every Area. No toast has a close button: `useAppToast` renders only `ToastTitle` and `ToastBody`, and Fluent's `ToastContainer` offers no click-to-dismiss and no swipe, so a mouse user can only wait. The stack has no limit.

- Move the `Toaster` in `AppProviders` to `position="bottom-end"` and set `limit={3}`.
- Render a `ToastTrigger` close button in `useAppToast`, on every intent.
- Keep `pauseOnHover` and the 3 second life for success and info. The 6 second error life goes away with issue 04, which takes errors off the toaster.
- `RecordColumnsArea` pins a save bar to the bottom of the Area. Check in the harness that a bottom-right toast does not cover it; offset the toaster or move the save bar's own actions if it does.
- Verify in the harness popup at 700px and the side panel at 400px.

## Answer

- The `Toaster` in `AppProviders` is now `position="bottom-end"` with `limit={3}`, and keeps `pauseOnHover`.
- `useAppToast` renders a `ToastTrigger` close button in the `ToastTitle` action slot on every intent, so a mouse user can dismiss a toast.
- The 6 second error life is gone. Errors leave the toaster altogether in issue 04.
- The `RecordColumnsArea` save bar overlap is checked with the harness in issue 10.
