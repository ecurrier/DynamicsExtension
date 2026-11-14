# 07 - GitHub issue templates

Status: resolved
Type: task

`.github/` does not exist yet. Add two plain markdown templates and a chooser config.

Plain markdown, not `.yml` issue forms: forms cannot be cleanly prefilled from a URL, and their
required fields would block someone who already typed everything in the extension.

The templates are the receiving shape for a prefilled body, so they must read sensibly both when
prefilled by the extension and when someone opens them cold from the Issues tab.

## Answer

`.github/ISSUE_TEMPLATE/` with `bug_report.md`, `idea.md` and a `config.yml` that keeps blank
issues enabled. That last part is load-bearing: turning blank issues off would redirect the
extension's prefilled `/issues/new` straight to the chooser and throw the report away. Both
templates warn a cold visitor off pasting schema names, which the extension's own safe list handles
automatically.
