# Side by Side Player

Play up to four local videos side by side in sync. Scrub, frame-step, zoom and pan them all at once, and line up takes with an adjustable offset for each video. Everything runs in the browser; videos are never uploaded.

Current version: see [`VERSION`](VERSION) and [`CHANGELOG.md`](CHANGELOG.md).

## Using it

- Drop a video on a panel, or use **Open several…** to load up to four files at once. **+ Add video** adds an empty panel.
- One set of controls plays, pauses, scrubs and frame-steps every video together. A is the reference; the others follow it.
- **Layout**: Auto (row for two, grid for three or four), Row, 2 × 2 grid or Stack. Drag the handles between panels to resize columns, and the grip below the panels to change height.
- **Offset**: each of B, C and D can be shifted against A. Pause on a key moment in A, step the other video to the same moment, then press **Sync to A**.
- **Zoom**: scroll or pinch on a video, drag to pan. **Link zoom** keeps every panel on the same spot.

## Updating an existing repository

If you already pushed an earlier version, replace the files with the ones from this package and commit:

```bash
git add -A
git commit -m "v1.2.0: up to four videos"
git tag v1.2.0
git push && git push --tags
```

Cloudflare redeploys automatically.

## Project layout

```
public/              ← everything that gets deployed
  index.html
  assets/app.css
  assets/app.js      ← APP_VERSION and the in-app CHANGELOG live here
  assets/favicon.svg
  _headers           ← Cloudflare security and cache headers
wrangler.jsonc       ← only for the Workers deploy option
VERSION
CHANGELOG.md
```

There is no build step. Open `public/index.html` directly to try it locally.

## Put it on GitHub

```bash
cd side-by-side-player
git init
git add .
git commit -m "Side by Side Player v1.2.0"
git branch -M main
git remote add origin https://github.com/<your-username>/side-by-side-player.git
git push -u origin main
```

(Create the empty repository on github.com first, without a README, so the push isn't rejected.)

## Publish on Cloudflare

### Option A: Cloudflare Pages connected to GitHub (simplest)

1. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Connect to Git**.
2. Pick the `side-by-side-player` repository.
3. Build settings:
   - Framework preset: **None**
   - Build command: *(leave empty)*
   - Build output directory: **`public`**
4. Save and deploy. You get a `*.pages.dev` address, and every push to `main` redeploys automatically.

### Option B: Cloudflare Workers (static assets)

```bash
npx wrangler login
npx wrangler deploy
```

This uses `wrangler.jsonc` and serves the `public` folder at a `*.workers.dev` address. You can also connect the repository under **Workers & Pages → Create → Workers → Import a repository** for automatic deploys on push.

### Custom domain

In the project's **Custom domains** (Pages) or **Domains & Routes** (Workers) settings, add a domain or subdomain you manage in Cloudflare.

## Releasing a new version

1. Make your changes.
2. Bump the version in **four places**: `VERSION`, `APP_VERSION` in `public/assets/app.js`, the `<meta name="version">` and `?v=` query strings in `public/index.html`.
3. Add an entry at the top of `CHANGELOG.md` and of the `CHANGELOG` array in `app.js`.
4. Commit, tag and push:
   ```bash
   git commit -am "v1.2.0"
   git tag v1.2.0
   git push && git push --tags
   ```
Cloudflare redeploys on push. The `?v=` query strings make browsers fetch the new CSS and JS instead of cached copies.

## Privacy

Videos are opened with the browser's file picker and played from memory. Nothing is sent to any server. The only external request is for the IBM Plex fonts from Google Fonts; remove those two `<link>` tags and the font host entries in `_headers` if you want zero third-party requests.
