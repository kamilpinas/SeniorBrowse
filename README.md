# SeniorWeb

Chrome extension (Manifest V3) that lets older adults browse the internet safely. See `docs/` for the product brief, architecture, and task list.

## Setup

```bash
npm install
```

## Development

Iterate on the new tab and admin pages with HMR:

```bash
npm run dev
```

Then open:

- http://localhost:5173/newtab/
- http://localhost:5173/admin/

The content script and service worker do not HMR through `chrome-extension://`. Use the build flow below.

## Build

```bash
npm run build
```

Produces four bundles in `dist/`:

| Path | Source | Format |
| --- | --- | --- |
| `dist/newtab/index.html` | `src/newtab/` | React app |
| `dist/admin/index.html` | `src/admin/` | React app |
| `dist/content/index.js` | `src/content/` | IIFE content script (Preact) |
| `dist/background/service-worker.js` | `src/background/` | ES module service worker |

`public/manifest.json` is copied verbatim into `dist/`.

## Loading the unpacked extension

1. `npm run build`
2. Open `chrome://extensions`
3. Enable Developer mode
4. Click "Load unpacked" and select the `dist/` folder
5. Reload after each rebuild

## Project layout

```
src/
  newtab/      React — senior home page
  admin/       React — settings page (opened from admin-mode gear icon)
  content/     Preact — side panel injected on every page
  background/  Vanilla JS — service worker
  shared/      storage, constants, types
public/
  manifest.json
docs/          Product brief, architecture, tasks, market
```
