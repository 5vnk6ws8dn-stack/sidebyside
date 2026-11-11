# Changelog

All notable changes to Side by Side Player.
Author: ©Simon Z. Chan. Versions follow [Semantic Versioning](https://semver.org).

## [1.2.1] - 2026-11-11 12:17 EST
### Added
- Author credit (©Simon Z. Chan) with build date and time in every source file, in the page metadata and in the app footer.
- `AUTHORS` file.

## [1.2.0] - 2026-11-11
### Added
- Up to four videos at once: add panels one at a time, or open or drop several files in one go.
- Layout choices: Auto, Row, 2 × 2 grid and Stack.
- Resize handles between every column.
- Each video has its own offset against A, with Sync to A.
- Reorder panels with ◀ ▶ and remove one with ✕.

### Changed
- Swap A/B is replaced by the ◀ ▶ reorder buttons.
- Saved layout preferences use a new key, so earlier saved settings reset once.

## [1.1.1] - 2026-11-10
### Changed
- Packaged as a GitHub repository ready to deploy on Cloudflare.
- Split into `index.html`, `assets/app.css` and `assets/app.js`; added favicon and security headers.

## [1.1.0] - 2026-11-10
### Added
- Zoom and pan on each video: scroll wheel, pinch, drag, or the − / + buttons (up to 800%).
- Link zoom keeps both videos zoomed to the same spot.
- Draggable divider between A and B; double-click for 50/50.
- Viewer height slider and drag grip, with a Fit option.
- Version number and history shown in the app.

## [1.0.0] - 2026-11-10
### Added
- Synced playback of two local videos with shared play, pause and scrub.
- Frame stepping at 24–60 fps and speed from 0.25× to 2×.
- B offset with frame nudging and Sync here.
- Loop, stacked layout, swap A/B and full screen.
