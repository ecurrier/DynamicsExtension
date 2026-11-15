# Store listing assets

Copy and images for the Microsoft Edge Add-ons listing. [`LISTING.md`](LISTING.md) holds
everything that gets pasted into Partner Center; the folders hold everything that gets
uploaded.

```
screenshots/   1280 x 800, six of them, in upload order
promo/         440 x 280 and 1400 x 560 promotional tiles
logo/          300 x 300 store logo, plus icon/ at 16 / 32 / 48 / 128 for the package
tools/         the generators that produced all of the above
```

## Regenerating

The screenshots are captures of the real UI, driven through the dev harness so they show
the sample Dataverse fixtures rather than anyone's org data. The capture scripts talk to
headless Edge over the DevTools protocol and have no npm dependencies.

```bash
npm run build && npm run harness
npx serve -l 5173 .output/chrome-mv3
```

With that serving, from the repo root:

```bash
node store/tools/shoot-app.mjs
```

That writes raw 2x captures to `store/tools/raw/`. Set `ONLY=03` to redo a single screen.
Then compose the store-sized images:

```bash
node store/tools/compose.mjs
```

Output lands in `store/tools/out/`; copy it over `screenshots/`, `promo/` and `logo/`.

| File              | What it does                                                            |
| ----------------- | ----------------------------------------------------------------------- |
| `cdp.mjs`         | Launches headless Edge and speaks the DevTools protocol to it           |
| `render.mjs`      | Renders an HTML document at an exact pixel size and writes a PNG        |
| `logos.mjs`       | The three logo directions as SVG; `bracketBolt` is the one in use       |
| `captions.mjs`    | Headline, sub-line and store caption for each screenshot                |
| `shoot-app.mjs`   | Drives the harness to each screen and captures it at 2x                 |
| `shoot-logos.mjs` | Renders the logo candidates and a legibility contact sheet              |
| `compose.mjs`     | Lays each capture onto its 1280 x 800 canvas; builds the tiles and logo |

Captions live in `captions.mjs`, so changing the wording on a screenshot is a `compose.mjs`
run and does not need the harness.
