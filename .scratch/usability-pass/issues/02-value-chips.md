# Value Chips

Status: resolved
Type: task

See `../spec.md`, "Shared components".

- New `src/shared/components/ValueChip/ValueChip.tsx` rendering a Fluent `Badge` with `appearance="tint"` and a colour chosen from a supplied map, falling back to `subtle` for an unmapped value.
- Palettes in `src/shared/components/ValueChip/palettes.ts`: `PRIVILEGE_DEPTH_COLORS` (None subtle, User informative, BusinessUnit brand, ParentChild warning, Organization danger, so reach reads as escalating risk) and `PRIVILEGE_ACCESS_COLORS`.
- Tests for the mapping: every member of `PRIVILEGE_DEPTHS` and `PRIVILEGE_ACCESS_TYPES` resolves to a colour, and an unknown value falls back rather than throwing.
- Export from `src/shared/components/index.ts`.

Blocked by: none

## Comments

The depth palette escalates subtle to danger with reach, so an Organization privilege reads as the riskiest thing on the screen without anyone having to know what the words mean. Tests assert every member of both enums resolves, so adding a depth without a colour fails rather than rendering an unexplained grey.
