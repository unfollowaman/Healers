# AGENTS.md — Development Guidelines & Memory for Healers

This file provides critical guidelines, architectural constraints, and performance patterns that all AI assistants and developers must follow when modifying or extending **Healers**.

---

## 1. Core Architecture & Strict Constraints

- **Zero Runtime NPM Dependencies**: The root `package.json` intentionally contains `"dependencies": {}`. Do NOT introduce external npm runtime packages (no `express`, `ioredis`, `axios`, `lodash`, `dotenv`, etc.).
- **Zero Frontend Build Steps**: No React, Vue, Svelte, Tailwind, Webpack, Vite, or Babel. All client-side code must run as standard ES6+ Modules or native scripts directly in modern browsers.
- **Node.js Built-ins Only**: Serverless endpoints in `/api` must exclusively use Node.js standard modules (`node:https`, `node:test`, `node:assert`, native `fetch`, native `URL`).
- **Upstash Redis via Native HTTP REST**: Never use TCP Redis connection clients. All interactions with Upstash Redis must use HTTP `POST` requests via native `fetch` using `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- **Telegram Token Isolation**: Never expose `TELEGRAM_BOT_TOKEN` to frontend client scripts or API responses. The client communicates solely with `/api/*` endpoints.

---

## 2. Directory Structure

```text
/
├── api/
│   ├── _lib/
│   │   ├── catalogStore.js     # Upstash Redis REST access (read, write, parallel fetch)
│   │   ├── telegram.js         # Telegram Bot API client & request handling
│   │   └── utils.js            # Environment validation & file ID checking (requireEnv, validateFileId)
│   ├── cron/
│   │   └── keepalive.js        # Scheduled daily keepalive cron (0 3 * * *)
│   ├── cover.js                # Thumbnail/album artwork proxy
│   ├── songs.js                # Catalog retrieval & Telegram discovery/sync
│   └── stream.js               # Audio streaming proxy with Range support
├── css/
│   ├── device.css              # Cyber-device shell, CRT styling, tactile controls
│   └── style.css               # Core layout, modals, tables, dark theme
├── js/
│   ├── app.js                  # Central player state, playback, playlists, analytics
│   ├── device-crt.js           # 48x30 HTML5 Canvas generative CRT visualizer
│   ├── device-media.js         # MediaSession API integration & dynamic cover canvas
│   ├── device-menu.js          # Tab navigation & view switching (songs/playlists/artists/settings)
│   ├── device-ui.js            # Hardware progress bar & time synchronization
│   └── search.js               # MurexSearch: phonetic pipeline, fuzzy scoring, learned picks
├── favicons/                   # Manifest icons, touch icons, SVG favicons
├── tests/                      # Native test suites executed via node:test
├── AGENTS.md                   # Agent guidelines & project memory (this file)
├── ARCHITECTURE.md             # Deep-dive technical system specification
├── index.html                  # Single-page application entry point
├── manifest.webmanifest        # PWA configuration
├── package.json                # Project scripts & engine specification (Node >= 18)
├── vercel.json                 # Vercel routing, redirects, and cron configuration
└── README.md                   # Public documentation
```

---

## 3. Database Keys & State Contracts

All serverless Redis keys use the `murex:` namespace:

| Redis Key | Type | Description |
|---|---|---|
| `murex:catalog` | String (JSON Array) | Persisted array of song objects discovered from Telegram. |
| `murex:offset` | String (Integer) | Next `update_id` offset for Telegram `getUpdates` pagination. |
| `murex:refresh:lastrun` | String (Timestamp) | Epoch ms of the last catalog sync; enforces 30s cooldown (`REFRESH_COOLDOWN_MS = 30000`). |
| `murex:keepalive` | String (ISO Date) | Daily timestamp written by `/api/cron/keepalive` to prevent free-tier hibernation. |

### Browser `localStorage` Keys
- `murex_playlists`: Array of custom user playlists (JSON).
- `murex_play_history`: Array of playback events for stats/analytics (JSON).
- `murex:search:recent`: Array of recent search query strings (JSON).
- `murex_shuffle_order`, `murex_queue_order`, `murex_shuffle`: Active playback state.

---

## 4. Mandatory Performance & Optimization Rules

Before making any frontend or backend changes, always uphold these patterns:

1. **DocumentFragment Batching for DOM Updates**:
   Never append elements to live DOM containers in a loop. Always collect list items in a `document.createDocumentFragment()` and perform a single `container.appendChild(fragment)`.
2. **Reused Module-Scoped `Intl.Collator`**:
   Never call `localeCompare(b, undefined, { sensitivity: 'base' })` inside array sort callbacks. Always reuse the module-scoped `const stringCollator = new Intl.Collator(...)` instance (~50x faster).
3. **Single-Pass Map Lookups**:
   Avoid checking `map.has(key)` before `map.get(key)`. Use:
   ```javascript
   let item = map.get(key);
   if (!item) {
     item = createItem();
     map.set(key, item);
   }
   ```
4. **Pre-Computed Sets & Maps for Loops**:
   Never invoke `.some()`, `.includes()`, or `.indexOf()` inside array render loops. Convert candidates into a `Set` or `Map` of IDs/indices before the loop for $O(1)$ lookups.
5. **Pre-Allocated Single-Pass Sorting**:
   When mapping array elements with index tracking or reverse order, pre-allocate `new Array(len)` and assign by index directly instead of chaining `.map().reverse()`.
6. **Concurrent Upstash REST Requests**:
   Always execute independent Redis REST queries in parallel using `Promise.all([fetchCatalog, fetchOffset])` to avoid sequential network round-trip penalties.

---

## 5. Accessibility & Interaction Guidelines

Always uphold these UI and accessibility requirements:

1. **Hotkey Safety**:
   Always guard global keyboard shortcuts (e.g., `Space` for play/pause, `/` for search, arrow keys for seeking) by verifying `e.target` is not an `INPUT`, `TEXTAREA`, `SELECT`, or `isContentEditable` element.
2. **Escape Key Handling**:
   `Escape` must clear search inputs first if text is present; otherwise, it closes open overlays, modals, and dropdowns, returning focus to the trigger.
3. **Modal Focus Trapping & Restoration**:
   When opening a modal, capture `document.activeElement` and focus the primary input. When dismissing, restore focus to the originating element.
4. **Entity-Specific ARIA Labels**:
   Row action buttons repeated in lists must include contextual entity titles (e.g. `aria-label="Remove 'Bohemian Rhapsody' from playlist"`, not generic `"Remove"`).

---

## 6. Testing Protocol

- **Run Tests**: Always verify changes by running the native test suite:
  ```powershell
  node --test tests/*.test.js
  ```
  *(Note: On Windows PowerShell, avoid calling `npm test` directly if script execution policies block `npm.ps1`; use `node --test tests/*.test.js`)*.
- **Test Suites**:
  - `tests/app.test.js` — Client state, windowing, DOM rendering benchmarks, accessibility attributes.
  - `tests/search.test.js` — Phonetic search pipeline, Hinglish transforms, 5,000-song latency benchmark (< 50ms target).
  - `tests/songs.test.js` — Telegram update parsing, channel ID matching, deduplication, 30s throttling.
  - `tests/stream.test.js` — Audio range proxying, file ID validation, error mapping.
  - `tests/catalogStore.test.js` — Upstash Redis REST operations, parallel fetch verification.
  - `tests/cover.test.js` — Cover art proxy, HTTP method validation, HEAD requests, error mapping.
  - `tests/keepalive.test.js` — Vercel keepalive cron handler, bearer authorization, Upstash health checks.
  - `tests/utils.test.js` — Serverless utilities, environment validation, file ID validation bounds.
  - `tests/build.test.js` — Static configuration validation, manifest assets, HTML asset integrity, ES module resolution.

---

## 7. Development Checklist for New Features

- [ ] Does this require an external npm package? If yes, find a vanilla/built-in alternative.
- [ ] Is `TELEGRAM_BOT_TOKEN` protected server-side?
- [ ] Does any new audio proxying forward byte-range headers (`Accept-Ranges: bytes`)?
- [ ] Does iterated DOM rendering use `DocumentFragment`?
- [ ] Are array lookups inside loops protected by pre-computed `Set` or `Map` structures?
- [ ] Are global hotkeys guarded against focused form inputs?
- [ ] Do all 86 tests in `tests/*.test.js` pass with zero failures?
