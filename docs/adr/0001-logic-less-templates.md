---
status: accepted
---

# Templates are logic-less and interpreted by the extension

Code generation lets users author Templates so generated classes and enums match their own codebase. The extension's pages run under the Manifest V3 default content security policy (`script-src 'self'`), so no template engine that compiles to JavaScript (Handlebars, EJS, JavaScript template literals) can run there. We chose a Mustache-style, logic-less syntax (variables, sections, inverted sections, dotted paths) interpreted by our own small engine, and moved every computation a template might want (PascalCase and camelCase identifiers, prefix stripping, the C# and TypeScript type of a column, first and last flags) into the data model the engine renders.

## Considered options

- **Handlebars or a JavaScript-based template**: rejected, cannot run under the extension CSP without `unsafe-eval`, which Manifest V3 does not allow on extension pages.
- **A richer in-house language with helpers and conditionals**: rejected, an interpreter to maintain and a syntax to document for marginal gain over precomputed variants.
- **Structured JSON templates with named slots**: rejected, too rigid to express a team's class layout.

## Consequences

The template syntax is user-facing and will be hard to change once Templates are shared between teams, so additions to the data model are the way to add power, not syntax extensions. Type mapping is fixed and metadata-driven rather than user-editable: lookups are always `EntityReference`, and `DateOnly` versus `DateTime` follows the column's date-time behaviour.
