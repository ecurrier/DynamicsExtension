# Schema Bulk Edit Docs

Status: resolved
Type: task

See `../spec.md`.

- Add to `CONTEXT.md` under "Platform concepts": `Polymorphic Lookup` (a Column that may reference Records on more than one Table, with `_Avoid_: multi-table lookup, customer field`) and `Requirement Level` (with `_Avoid_: required level, mandatory flag`, noting the platform values).
- Update the `README.md` capability sentence for the new Areas and the `schema-tools` Workspace, and note that Power Tools now writes metadata.
- Update `dev/harness/README.md` with the attribute match and polymorphic fixtures, and state that metadata writes, publish and the polymorphic requests only log.
- Record the confirmed polymorphic request shapes from `04` in `CONTEXT.md` or an ADR if the finding contradicts decision 5.

Blocked by: 01, 02, 03, 04

## Comments

`CONTEXT.md` gained `Polymorphic Lookup` and `Requirement Level`. `README.md` and `dev/harness/README.md` describe the schema fixtures and the `harness-schema` page with its `?schemaTool=polymorphic` variant.

The confirmed polymorphic request shapes could not be recorded because they are not confirmed; `06` carries that work, and this ticket should be revisited when it lands.
