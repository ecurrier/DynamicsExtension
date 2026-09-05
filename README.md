# Power Tools for Power Platform / Dynamics 365

Browser extension (Manifest V3) with productivity utilities for model-driven apps and Power Pages: admin shortcuts, Fetch XML and URL generation, choice code snippets, form templates, Web API field updates and queries, and security role management.

Built with [WXT](https://wxt.dev), React, TypeScript, Fluent UI v9, TanStack Query, Zustand, and CodeMirror 6.

## Development

```bash
npm install
npm run dev
```

`npm run dev` builds to `.output/chrome-mv3-dev` and launches a Chrome profile with the extension loaded and hot reload enabled.

To load a production build manually:

```bash
npm run build
```

Then open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `.output/chrome-mv3`.

Other scripts:

| Script | Purpose |
| --- | --- |
| `npm run typecheck` | TypeScript project check |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run zip` | Store-ready archive in `.output` |

## Project layout

```
src/
  entrypoints/      popup, results viewer page, and the page bundle injected into Dynamics tabs
  app/              popup shell, providers, session bootstrap
  messaging/        typed command contract, page bridge, popup client and TanStack hooks
  page/             code that runs inside the Dynamics page (Xrm access), no React
  modules/          one folder per module: module.ts registration, areas/, lib/, hooks/
  shared/           components, storage schema and migration, stores, theme, pure helpers
```

### Adding a module

1. Create `src/modules/<name>/` with a `module.ts` exporting a `ModuleDefinition` (id, label, icon, areas).
2. Put each area under `areas/<area>/` with its component, and pure logic under `lib/`.
3. Register the module in `src/modules/registry.ts`.

Navigation, breadcrumbs, page-context gating, and last-visited persistence derive from the registry.

### Adding a page command

1. Add the command to `CommandMap` in `src/messaging/contract/commands.ts`.
2. Implement the handler in `src/page/handlers/<module>.ts`; the exhaustive `HandlerMap` fails to compile until it exists.
3. Call it from the popup with `usePageQuery` (reads) or `usePageMutation` (actions).
