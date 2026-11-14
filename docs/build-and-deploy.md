# Build and deploy

Everything you need to run Power Tools on your own machine and to put a new version in the store. No code changes are involved in any of it.

## Once, on a new machine

Install Node, then from the repo folder:

```bash
npm install
```

## Work on it with the extension live

```bash
npm run dev
```

This builds to `.output/chrome-mv3-dev` and opens a fresh Chrome profile with the extension already loaded. Edits reload by themselves. Close the window to stop it.

## Look at a layout without opening a Dynamics org

```bash
npm run build
npm run harness
npx serve -l 5173 .output/chrome-mv3
```

Then open one of these:

| Address                                             | Shows                                                     |
| --------------------------------------------------- | --------------------------------------------------------- |
| `http://localhost:5173/harness.html`                | the popup, 700 × 600                                      |
| `http://localhost:5173/harness-sidepanel`           | the side panel — narrow the browser window to panel width |
| `http://localhost:5173/harness?mode=window&tabId=1` | the pinned window                                         |
| `http://localhost:5173/harness-traces`              | the Trace Viewer                                          |
| `http://localhost:5173/harness-schema`              | Schema Tools                                              |
| `http://localhost:5173/harness-security`            | Security Tools                                            |

Everything is filled with sample data, so nothing touches a real environment. `dev/harness/README.md` lists the extra switches, such as `?granted=1` to skip the access banners.

## Install the real build yourself

```bash
npm run build
```

Open `chrome://extensions`, turn on Developer mode, choose **Load unpacked**, and pick the `.output/chrome-mv3` folder.

## Ship a new version to the store

1. Raise `"version"` in `package.json`. The manifest reads it from there, so that one line is the whole version bump.
2. Check it still builds cleanly:

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm test
```

3. Make the archive:

```bash
npm run zip
```

The `.zip` lands in `.output`. It carries source maps on purpose: the source is public on GitHub
anyway, so withholding them buys no secrecy, and without them every stack trace in a bug report is
unreadable.

4. Tag the commit, so a stack trace in a report can be matched to the build it came from:

```bash
git tag v2.5.0 && git push origin v2.5.0
```

Use the version you just set in `package.json`. Keep the `.zip` for that version somewhere you can
find it: the source maps inside it are the only way to read a stack from a released build.

5. Upload that file in Partner Center, under Microsoft Edge Add-ons.
6. `docs/store-submission.md` holds the text the store asks for: the privacy answers, the justification for each permission, and the test steps for the certification reviewer. Paste from there rather than rewriting it, and keep it in step with `wxt.config.ts` and `PRIVACY.md` whenever permissions change.
