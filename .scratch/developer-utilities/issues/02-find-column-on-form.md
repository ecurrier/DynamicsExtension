# Find Column on Form Utility

Status: resolved
Type: task

See `../spec.md`, "Find Column on Form".

- Page commands in `src/page/handlers/utilities/formColumns.ts`: `utilities.getFormAttributes` (logical name, display name, control names, tab and section labels, visible, required level, disabled, current value as display text) and `utilities.revealFormColumn({ logicalName, show })` which expands the tab and section, calls `control.setFocus()` and `setVisible(true)` when `show` is set, and flashes an outline on the control's DOM element (`data-id` attribute) for three seconds. Return the same details after the action.
- Dialog `FindColumnDialog`: `Combobox` with autocomplete over the attributes, a details list (tab, section, control type, visible, required, disabled, value), a "Show" button when hidden, and the "not on this form" message when the Column exists on the Table but has no control.
- Card on the Developer Area.
- Harness: stub both commands with a few sample attributes, one hidden. Real-org test required for the scroll, focus, and outline behaviour.

Blocked by: none
