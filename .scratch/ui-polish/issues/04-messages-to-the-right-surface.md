# Validation to the field, failures to the banner

Status: ready-for-agent
Type: task

See `../spec.md`, decisions 10, 11 and 12, and the Messages table.

Of 99 toast call sites, 17 are validation guards raised through `toast.error` and 31 are real failures. Both are in the wrong place. A red toast 292px wide in the top right corner is not where the user is looking when a form field is empty, and a failure that needs an action should not vanish after 6 seconds.

- Move the 17 validation guards to the Fluent `Field validationMessage` of the control they are about. The heaviest files are `FormPresetsArea` (5), `TemplatesArea` (5), `EnvironmentsArea` (3) and `ServicePrincipalsArea` (3). Fluent sets `role="alert"` on the message itself.
- Add a banner store feeding the `AppShell` `banner` slot, which is already wired: one banner at a time, newest wins, a close button, cleared when the area changes.
- Fluent's `MessageBar` renders `role="group"`, not a live region, so put `role="alert"` on the banner wrapper. One line, and it makes the failure announce.
- Point `ToastBridge` at the banner instead of the toaster. Audit the five mutations carrying `meta: { silent: true }` and every call site with its own `onError` toast, so one failure produces exactly one message.
- A partial failure — "2 steps enabled, 1 failed", "5 of 20 failed" — opens the run's result view where one exists (`BulkRunResultView`, the Data Transporter run step). Where none exists it goes to the banner.
- The 8 plain notices ("Results truncated", "Run cancelled", "No users matched that search") stay as toasts.
- `LoadingOverlay` is defined, exported and never rendered anywhere. Either use it for the blocking cases or delete it; do not leave it.

Blocked by: 03
