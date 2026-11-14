# 04 - Draft persistence

Status: resolved
Type: task
Blocked by: 03

The draft must survive the popup closing and follow the user to another Surface.

An extension popup closes the moment it loses focus, and a bug report is written about something on
the Dynamics page, so the user will click back to the page mid-sentence. Losing the text there
means they never write a second report.

Store the draft through the existing storage layer so it syncs across Surfaces. Clearing is
explicit: the Clear button, and nothing else.

## Answer

`feedbackDraftItem` on `local:`, read and written by `useFeedbackDraft`. Every change is written
through with no debounce: the popup closes on blur, so there is no safe window to batch into.
Verified in the harness by leaving the Area and coming back.
