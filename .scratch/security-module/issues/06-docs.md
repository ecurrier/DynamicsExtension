# Security Module Docs

Status: resolved
Type: task

See `../spec.md`.

- Add the privilege depth vocabulary to `CONTEXT.md` under "Platform concepts": `Privilege Depth` with the five values and `_Avoid_: scope, access level`. Extend the `Security Role` entry to say roles are replicated per business unit and that Power Tools operates on the root copy.
- Update the `README.md` capability sentence for the four Areas in the Security Module and the new `security-tools` Workspace.
- Update `dev/harness/README.md` with the role copies, privilege depth and user search fixtures, and note that `AddPrivilegesRole` only logs.

Blocked by: 01, 02, 03, 04, 05

## Comments

`CONTEXT.md` gained `Privilege Depth` and `Bulk Run` under "Platform concepts", and the `Security Role` entry now states the business unit replication rule and that Power Tools operates on the root copy — that rule is the single most surprising thing about this Module and belongs in the glossary rather than only in a spec.

`README.md` gained a paragraph telling future work to route multi-item writes through the Bulk Run engine instead of hand-rolling a confirmation dialog.

`dev/harness/README.md` describes the role copies, the child-only role, the privilege depth fixtures, the System Administrator failure, the twelve users, and the `harness-security` page with its `?securityTool=privileges` variant.
