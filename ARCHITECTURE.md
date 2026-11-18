# Healers — Technical Architecture Specification

This document details the internal systems, algorithms, protocols, and data structures powering **Healers**.

---

## 1. System Topology & Request Lifecycle

```text
 ┌────────────────────────────────────────────────────────┐
 │                   TELEGRAM BACKEND                     │
 │   • Channel Posts (Audio attachments with ID3 tags)   │
 │   • BotFather Administrator Bot                        │
 └──────────────────────────┬─────────────────────────────┘
                            │
              Audio Uploads │ Telegram Bot API
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │             VERCEL SERVERLESS LAYER (Node.js)          │
 │                                                        │
 │   GET /api/songs           GET /api/stream             │
 │   • Reads cached catalog   • Resolves Telegram path    │
 │   • Syncs via ?refresh=1   • Proxies byte-range audio  │
 │   • Deduplicates tracks    • Strips sensitive headers  │
 │                                                        │
 │   GET /api/cover           GET /api/cron/keepalive     │
 │   • Proxies thumbnails     • Prevents Upstash sleep    │
 └─────────────┬───────────────────────────┬──────────────┘
               │                           │
  Parallel REST│Requests       HTTP Range  │Audio Stream
               ▼                           ▼
 ┌───────────────────────────┐   ┌────────────────────────┐
 │       UPSTASH REDIS       │   │   CLIENT BROWSER (PWA) │
 │                           │   │                        │
 │ • murex:catalog (JSON)    │   │ • Vanilla JS Player    │
 │ • murex:offset (Integer)  │   │ • Canvas CRT Visualizer│
 │ • murex:refresh:lastrun   │   │ • MurexSearch Engine   │
 │ • murex:keepalive (Date)  │   │ • Playlists & Stats    │
 └───────────────────────────┘   │ • MediaSession API     │
                                 └────────────────────────┘
```

---

## 2. Serverless API Routes (`/api`)

### `api/songs.js` — Catalog Retrieval & Sync
- **Standard Read**: Checks Upstash Redis `murex:catalog` and returns the public song payload.
- **Cache-Control**: `s-maxage=3600, stale-while-revalidate=86400` (on normal read); `no-store` (on refresh).
- **Discovery Sync (`?refresh=1`)**:
  - Requires `Authorization: Bearer <CRON_SECRET>`.
  - Enforces a 30-second rate-limit cooldown (`REFRESH_COOLDOWN_MS = 30000`) tracked at `murex:refresh:lastrun`. If invoked within 30s, sets `X-Throttled: true` and returns the existing catalog.
  - Queries Upstash Redis in parallel for `murex:catalog` and `murex:offset`.
  - Paginates through Telegram `getUpdates` with `limit: 100` and `allowed_updates: ['message', 'channel_post']`.
  - Validates `chat.id` against `TELEGRAM_CHANNEL_ID` (handles numeric `-100...` IDs and `@username`).
  - Merges new tracks into the existing catalog using a `Map` keyed on `song.file_unique_id || song.file_id`, sorting chronologically by upload date.
  - Atomically stores the merged catalog and next candidate offset back to Upstash Redis in parallel.

### `api/stream.js` — Audio Range Streaming Proxy
- **Input Validation**: `validateFileId(fileId)` checks against regex `^[\w-]{10,512}$`.
- **Telegram File Resolution**: Calls Telegram `getFile` to obtain the temporary CDN `file_path`.
- **Range Proxying**:
  - Uses `node:https.request` to stream from `https://api.telegram.org/file/bot<token>/<file_path>`.
  - Forwards incoming `Range` header (e.g. `bytes=1048576-`).
  - Sets `Cache-Control: private, max-age=3600`, `Accept-Ranges: bytes`, and `Content-Type: audio/mpeg`.
  - Deletes sensitive upstream headers (`set-cookie`, `content-security-policy`).
  - Pipes audio chunks directly to `res`, yielding `200 OK` or `206 Partial Content`.

### `api/cover.js` — Cover Art Proxy
- Resolves image file paths from Telegram thumbnails via `getFile`.
- Detects format (`.png` -> `image/png`, `.webp` -> `image/webp`, default `image/jpeg`).
- Sets immutable cache headers: `Cache-Control: public, max-age=604800, immutable`.

### `api/cron/keepalive.js` — Scheduled Ping
- Authenticated via `Authorization: Bearer <CRON_SECRET>`.
- Executes `SET murex:keepalive <ISO_TIMESTAMP>` in Upstash Redis.
- Configured in `vercel.json` to trigger every day at `0 3 * * *` (03:00 UTC).

---

## 3. Database Subsystem (Upstash Redis REST Protocol)

Upstash Redis is accessed strictly via native HTTP REST calls without TCP connection pooling or third-party SDKs:

- **Command Format**: HTTP `POST` to `UPSTASH_REDIS_REST_URL` with body `JSON.stringify(["COMMAND", "KEY", "ARG1", ...])`.
- **Parallel Execution**: Independent key operations are batched using `Promise.all`:
  ```javascript
  const [catalogResponse, offsetResponse] = await Promise.all([
    fetch(url, { method: 'POST', body: JSON.stringify(["GET", "murex:catalog"]) }),
    fetch(url, { method: 'POST', body: JSON.stringify(["GET", "murex:offset"]) })
  ]);
  ```
  *(Reduces network latency by ~48% compared to sequential round-trips).*

---

## 4. Client-Side Subsystems

### A. Reactive State Engine (`js/app.js`)
All UI views, playback cues, and overlay states bind to a centralized, mutable `state` singleton:
- **Playback**: `songs`, `currentIndex`, `isShuffle`, `shuffledIndices`, `repeatMode` (`off` | `all` | `one`), `volume`, `isMuted`.
- **Playlists**: `playlists`, `activePlaylistId`, `isPlaylistOverlayOpen`, `playlistSortOrder`.
- **Artists**: `activeArtistName`, `artistSearchQuery`, `artistSortOrder`, `artistViewMode` (`grid` | `list`).
- **Stats**: `statsTimeRange`, `playHistory`, `customStartDate`, `customEndDate`.
- **Search**: `searchQuery`, `searchResults`, `highlightedResultIndex`, `isCatalogLoaded`.

### B. Generative CRT Visualizer (`js/device-crt.js`)
- **Grid Geometry**: 48 columns × 30 rows (1,440 total cells) rendered onto an HTML5 `<canvas id="crt-screen">`.
- **Display Pipeline**:
  - Buffer arrays: `activeBrightness`, `activeColorIndex`, `incomingBrightness`, `incomingColorIndex`, `sparkleGrid` (allocated once as `Float32Array`).
  - Fixed 6-color RGB palette: Pink (`#FF3EA5`), Purple (`#C04BFF`), Indigo (`#6E6BFF`), Blue (`#38B6FF`), Cyan (`#2EE6D6`), Orange (`#FF8A3D`).
  - 6 Generative Algorithms: Cellular automata, wave equations, radial ripples, phosphor noise, harmonic oscillators, and orbital fields.
  - Shuffle Bag: Rotates pattern variations without consecutive repeats via uniform Fisher-Yates array shuffling.
  - State Interpolation: Brightness target transitions between `idle` (0.55), `playing` (1.0), and `paused` (0.45).
  - Reduced Motion: Listens to `window.matchMedia('(prefers-reduced-motion: reduce)')` to render a single frozen, low-contrast static frame.

### C. Phonetic & Fuzzy Search Engine (`js/search.js`)
The `MurexSearch` engine operates entirely in the browser:
1. **Noise Cleaning**:
   - Strips bracketed metadata: `BRACKET_NOISE_REGEX = /[\(\[][^\)\]]*[\)\]]/g`.
   - Strips audio tags and bitrates: `official`, `video`, `audio`, `lyrics`, `320kbps`, `hd`.
   - Strips leading track numbers: `^\d{1,3}\s*[\.\-]?\s+`.
2. **Phonetic Pipeline (South Asian / Global Transliterations)**:
   - De-aspirates consonants: `kh -> k`, `gh -> g`, `bh -> b`, `dh -> d`, `th -> t`, `jh -> j`.
   - Vowel collapsing: `(aa|ah) -> a`, `(ee|ii|ea) -> i`, `(oo|uu) -> u`, `(ai|ay) -> e`, `(au|ow) -> o`.
   - Homophone mapping: `w -> v`, `z -> j`, `ph -> f`, `q -> k`.
3. **Scoring Function**:
   - Exact token matches: `1.00`.
   - Prefix match on final query token: `0.92`.
   - Phonetic identity: `0.85`.
   - Damerau-Levenshtein edit distance: `0.80 - (0.12 * distance)`.
   - Compact trigram Dice similarity: `(2 * common_trigrams) / (trigrams_a + trigrams_b)`.
   - Learned pick boost: `+0.20` for exact query match, `+0.10` for prefix query match.
4. **Performance**: Indexes 5,000 synthetic songs in ~130ms; queries complete in 1.5–1.8ms.

### D. Audio Playback & MediaSession Subsystem (`js/device-media.js`)
- **Smart Shuffle**: Maintains `recentPlayed = []` window of length `min(10, floor(N/2))`. When picking the next shuffle track, candidates within the recent window are excluded, preserving uniform randomness across unplayed tracks.
- **MediaSession API**:
  - Binds handlers for `play`, `pause`, `previoustrack`, `nexttrack`, `seekto`, `seekbackward`, `seekforward`.
  - Generates 512×512 radial gradient cover art with track title initials on HTML5 canvas when songs lack embedded covers.

---

## 5. Security & Threat Model

1. **Bot Token Isolation**: The Telegram Bot token is stored exclusively in Vercel serverless environment variables. Frontend network traces see only `/api/stream?file_id=...`.
2. **Regex Input Sanitization**: All file ID query parameters are strictly verified with `^[\w-]{10,512}$` to prevent HTTP request splitting or URL injection.
3. **Header Stripping**: Upstream Telegram response headers (`Set-Cookie`, `Content-Security-Policy`) are explicitly purged before streaming to the client.
4. **Rate-Limit Throttling**: The refresh endpoint enforces a 30-second cooldown in Upstash Redis, preventing abuse or Telegram API rate-limit bans (`429 Too Many Requests`).
5. **Private Deployment Scope**: Designed as a single-user personal audio cloud. When deploying publicly, protect with Vercel Deployment Protection or reverse-proxy authentication.
