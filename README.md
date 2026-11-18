# Healers

<div align="center">

**A private, zero-dependency, Telegram-backed cloud music streaming Progressive Web App.**

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=flat&logo=vercel&logoColor=white)](https://vercel.com/)
[![Upstash Redis](https://img.shields.io/badge/Cache-Upstash%20Redis-00E599?style=flat&logo=redis&logoColor=white)](https://upstash.com/)
[![Telegram Bot API](https://img.shields.io/badge/Storage-Telegram%20Bot%20API-2CA5E0?style=flat&logo=telegram&logoColor=white)](https://core.telegram.org/bots/api)
[![Dependencies](https://img.shields.io/badge/Dependencies-0%20Runtime%20NPM-brightgreen?style=flat)](package.json)
[![Tests](https://img.shields.io/badge/Tests-66%20Passing-success?style=flat)](tests/)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Performance Engineering](#performance-engineering)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Telegram Bot & Channel Setup](#1-telegram-bot--channel-setup)
  - [2. Upstash Redis Setup](#2-upstash-redis-setup)
  - [3. Local Development](#3-local-development)
  - [4. Vercel Production Deployment](#4-vercel-production-deployment)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Testing & Benchmarking](#testing--benchmarking)
- [Troubleshooting](#troubleshooting)
- [Security & Privacy](#security--privacy)

---

## Overview

**Healers** turns a private or public Telegram channel into a free, high-capacity, personal cloud audio streaming platform. Instead of managing expensive cloud object storage buckets (S3, GCS) or maintaining home media servers, you simply upload audio files (`.mp3`, `.m4a`, `.flac`, `.wav`) directly to your Telegram channel. 

The application sits on Vercel as a lightweight, serverless proxy layer. It syncs the audio metadata into Upstash Redis, streams the music with HTTP byte-range support (`206 Partial Content`) for instant seeking, and serves a responsive, retro-modern dark UI equipped with an audio-reactive CRT canvas visualizer, phonetic search engine, full playlist management, and listening analytics.

**Crucially, your Telegram bot token is never exposed to frontend JavaScript or client requests.**

---

## Key Features

### 📻 Retro-Modern "Device UI" & Canvas Visualizer
- **Tactile Hardware Aesthetic**: Styled as an analog-digital cyber-device with recessed wells, tactile buttons, and custom progress synchronization.
- **Generative CRT Monitor**: An HTML5 Canvas (`48 × 30` resolution, 1,440 cells) running 6 cellular automata and phosphor sparkle patterns through a uniform Fisher-Yates shuffle bag.
- **Audio-Reactive Animation**: Smoothly transitions time-scale, brightness, and particle intensity between `idle`, `playing`, and `paused` states.
- **Accessibility Conscious**: Fully respects `prefers-reduced-motion: reduce` by freezing animations to a static clean frame.

### 🔍 Phonetic & Fuzzy Search Engine (`MurexSearch`)
- **Hinglish & Transliteration Aware**: Custom phonetic pipeline designed for South Asian and global music titles (normalizes aspirates like `kh -> k`, `bh -> b`, `dh -> d`, and vowels like `ee -> i`, `oo -> u`, `aa -> a`).
- **Multi-Algorithm Scoring**: Combines token prefix matching, Damerau-Levenshtein edit distance with early exit, trigram Dice similarity, and vowel-dropped consonant skeletons.
- **Learned Ranking**: Remembers clicked search selections in `localStorage` to boost frequent track selections on ambiguous or abbreviated queries.
- **Sub-2ms Latency**: Zero external dependencies; indexes 5,000 songs in ~130ms and responds to queries in < 2ms.

### 📂 Comprehensive Library & Playlists Hub
- **All Songs Hub**: Chronological and alphabetical library browsing with instant sorting (Newest to Oldest, Oldest to Newest, Alphabetical A-Z).
- **Artists Hub**: Grid and List view modes, aggregated track counts, cumulative duration, and one-click artist playback/shuffling.
- **Playlist Management**: Create, edit titles and descriptions, delete, and curate playlists with an "Add Songs" modal.
- **Dynamic Mosaic Covers**: Automatically generates 4-quadrant visual cover mosaics from the artwork of tracks added to each playlist.
- **Affinity Recommendations**: Suggests additional tracks from your library based on artist representation in the active playlist.

### 📊 Listening Analytics & Stats Hub
- **Comprehensive Listening Metrics**: Tracks total listening hours, play counts, unique artists discovered, and daily listening averages.
- **Dynamic Time Ranges**: Filter insights across *This week*, *This month*, *This year*, *All time*, or *Custom date ranges*.
- **Ranked Top Lists**: Dynamic leaderboards for Top Artists, Top Songs, and Top Albums.
- **Visual Activity Chart**: Day-by-day CSS bar chart graphing play intensity and listening duration.
- **Milestones & Streaks**: Longest consecutive daily listening streak, new artist discoveries, and most repeated tracks.

### 🎧 Audio Engine & Native Media Integration
- **HTTP Range Seeking**: Supports byte-range requests (`Range: bytes=...`) allowing mobile and desktop browsers to scrub and jump forward without downloading entire files.
- **Smart Shuffle**: Uses a sliding exclusion window (`recentPlayed`) sized to `min(10, floor(N/2))` to prevent recently heard songs from repeating during shuffle sessions.
- **Web MediaSession API**: Full OS-level integration for lock screens, system notification shades, Bluetooth headsets, and smart watches.
- **Dynamic Fallback Artwork**: Generates custom 512×512 radial gradient cover art with artist initials on HTML5 canvas when audio files lack embedded ID3 thumbnails.

---

## System Architecture

```text
 ┌────────────────────────────────────────────────────────┐
 │                   TELEGRAM BACKEND                     │
 │   • Private or Public Music Channel                    │
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

## Tech Stack

The entire application is engineered with **zero runtime npm dependencies** and **zero build steps**.

| Layer | Technology | Details |
|---|---|---|
| **Runtime** | Node.js (>= 18) | Pure ES Modules (`"type": "module"`), native `fetch`, native `node:https`. |
| **Serverless Host** | Vercel | Vercel Serverless Functions (`/api/*`), Vercel Cron. |
| **Persistence Cache** | Upstash Redis | Serverless Redis accessed strictly via HTTP REST API (no Redis SDKs or open sockets). |
| **Storage Engine** | Telegram Bot API | `getUpdates`, `getFile`, and Telegram CDN file streaming. |
| **Frontend Framework** | **None (Pure Vanilla)** | Semantic HTML5, modern CSS3 (Custom Properties, `clamp()`, Flex/Grid), and Vanilla ES6+ JavaScript. |
| **Visualizer** | HTML5 Canvas 2D | High-DPI responsive canvas rendering 48×30 matrix animations. |
| **Client Storage** | Browser `localStorage` | Playlists, play history, search recent queries, learned query boosts. |
| **Testing** | Node.js Native Runner | `node:test` and `node:assert` (66 unit & benchmark tests). |

---

## Performance Engineering

Documented performance benchmarks from production tests:

- **Single-Pass Map Lookups**: Using `let item = map.get(key); if (!item) ...` instead of `map.has(key)` followed by `map.get(key)` cuts key string hashing and bucket lookups by **~30%**.
- **Module-Scoped `Intl.Collator`**: Instantiating a single reusable `Intl.Collator` instance instead of invoking `localeCompare` inside sort comparators reduces comparison time by **~95% (~50x speedup)** across 500+ tracks.
- **DocumentFragment Batching**: Accumulating iterated DOM elements into a single `DocumentFragment` before appending reduces layout reflows/repaints from $N$ to **1**.
- **Pre-Computed $O(1)$ Sets & Maps**: Extracting array membership checks (`some`, `includes`, `indexOf`) into pre-computed Sets/Maps prior to render loops eliminates $O(N \cdot M)$ and $O(N^2)$ quadratic slowdowns.
- **Parallel Upstash REST Requests**: Concurrently querying independent Redis keys (`murex:catalog` and `murex:offset`) via `Promise.all` yields a **~48% network latency reduction**.
- **Pre-Allocated Single-Pass Sorting**: Using `new Array(len)` with index population cuts memory reallocation overhead by **~60%** compared to `.map().reverse()`.

---

## Keyboard Shortcuts

The player includes global hotkey safety checks that automatically disable shortcuts when typing into inputs or search bars:

| Shortcut | Action | Scope |
|---|---|---|
| `/` | Open Global Search Overlay | Anywhere (unfocused) |
| `Space` | Play / Pause Toggle | Anywhere (unfocused) |
| `←` (Left Arrow) | Seek Backward 5 Seconds | Anywhere (unfocused) |
| `→` (Right Arrow) | Seek Forward 5 Seconds | Anywhere (unfocused) |
| `Escape` | Clear Search Input / Close Modal / Close Overlay | Global |
| `↓` / `↑` | Navigate Search Results | Search Overlay Active |
| `Enter` | Select Highlighted Track / Open Card | Search / Lists / Grids |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) `>= 18.0.0`
- A free [Telegram](https://telegram.org/) account
- A free [Upstash](https://upstash.com/) account (Redis)
- A free [Vercel](https://vercel.com/) account (for deployment)

---

### 1. Telegram Bot & Channel Setup

1. Open Telegram and message [@BotFather](https://t.me/BotFather).
2. Send `/newbot`, name your bot, and copy the **Bot Token** (`TELEGRAM_BOT_TOKEN`).
3. Create a **New Channel** (e.g., `My Music Vault`).
4. In channel settings, navigate to **Administrators** → **Add Admin** → select your bot and grant post-reading permissions.
5. Obtain your **Channel ID** (`TELEGRAM_CHANNEL_ID`):
   - *Public Channel*: Use `@your_channel_name`.
   - *Private Channel*: Forward a channel message to [@userinfobot](https://t.me/userinfobot) or use a bot log; private channel IDs start with `-100` (e.g. `-1001234567890`).
6. **Upload Songs**: Upload `.mp3`, `.m4a`, or `.flac` files as **Audio** (not raw documents) so Telegram extracts ID3 tags and cover thumbnails.

> ⚠️ **Important**: Telegram Bot API delivers channel updates only for messages sent **after** the bot was added as an administrator.

---

### 2. Upstash Redis Setup

1. Log into [Upstash Console](https://console.upstash.com/) and click **Create Database**.
2. Select **Redis** with **Regional** replication in a region close to your Vercel deployment.
3. In the database dashboard, find the **REST API** section.
4. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

---

### 3. Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/healers.git
   cd healers
   ```

2. Create a local environment configuration file:
   ```bash
   # .env.local
   TELEGRAM_BOT_TOKEN=123456789:replace_with_your_telegram_bot_token
   TELEGRAM_CHANNEL_ID=-1001234567890
   UPSTASH_REDIS_REST_URL=https://your-database-id.upstash.io
   UPSTASH_REDIS_REST_TOKEN=replace_with_your_upstash_token
   CRON_SECRET=replace_with_a_secure_random_string
   ```

3. Run the test suite:
   ```bash
   npm test
   ```
   *(Executes native `node --test tests/*.test.js`)*

4. Start the local Vercel development server:
   ```bash
   npx vercel dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### 4. Vercel Production Deployment

1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Import the project into [Vercel](https://vercel.com/new).
3. In **Settings → Environment Variables**, configure:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHANNEL_ID`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `CRON_SECRET`
4. Deploy the project.
5. **Initial Catalog Indexing**:
   Trigger your first catalog build by calling `/api/songs?refresh=1` with your `CRON_SECRET`:
   ```bash
   curl -H "Authorization: Bearer <YOUR_CRON_SECRET>" "https://your-domain.vercel.app/api/songs?refresh=1"
   ```
   The endpoint paginates through Telegram channel posts, parses audio metadata, and persists the index in Upstash Redis.
6. **Subsequent Uploads**:
   Whenever you post new songs to your channel, tap the in-app **Refresh** button or call the refresh endpoint to automatically merge new tracks into your persisted library.

---

## Environment Variables

| Variable | Required | Description | Example |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | **Yes** | Telegram bot token generated by @BotFather. | `123456789:ABCdefGHI...` |
| `TELEGRAM_CHANNEL_ID` | **Yes** | Target channel numeric ID or public `@username`. | `-1001234567890` or `@my_music` |
| `UPSTASH_REDIS_REST_URL` | **Yes** | HTTP REST endpoint for Upstash Redis. | `https://xxxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | **Yes** | Bearer authorization token for Upstash Redis REST. | `AXxxASQg...` |
| `CRON_SECRET` | **Yes** | Secret authorizing keepalive cron and catalog sync. | `super_secure_random_key` |

---

## API Reference

### `GET /api/songs`
Returns the cached library catalog.
- **Query Parameters**:
  - `refresh=1` *(optional)*: Scans Telegram for new updates and merges them. Enforces a 30-second rate-limit cooldown.
- **Headers**:
  - `Authorization: Bearer <CRON_SECRET>` *(required when refresh=1)*.
- **Response** (`200 OK`):
  ```json
  [
    {
      "file_id": "CQACAgUAAx0E...",
      "title": "Song Title",
      "performer": "Artist Name",
      "duration": 214,
      "coverFileId": "AgACAgUAAx0E..."
    }
  ]
  ```

---

### `GET /api/stream`
Proxies audio streams directly from the Telegram CDN.
- **Query Parameters**:
  - `file_id` *(required)*: Telegram audio `file_id` string matching `^[\w-]{10,512}$`.
- **Headers**:
  - `Range: bytes=start-end` *(optional)*: Standard HTTP range request for audio scrubbing.
- **Response**:
  - Returns `200 OK` or `206 Partial Content` with `Accept-Ranges: bytes` and `Content-Type: audio/mpeg`.

---

### `GET /api/cover`
Proxies album artwork thumbnails from Telegram.
- **Query Parameters**:
  - `file_id` *(required)*: Telegram thumbnail `file_id`.
- **Response**:
  - Returns binary image data (`image/jpeg`, `image/png`, or `image/webp`) with `Cache-Control: public, max-age=604800, immutable`.

---

### `GET /api/cron/keepalive`
Scheduled keepalive route configured in `vercel.json` (`0 3 * * *`).
- **Headers**:
  - `Authorization: Bearer <CRON_SECRET>` *(required)*.
- **Response** (`200 OK`):
  ```json
  {
    "ok": true,
    "key": "murex:keepalive",
    "timestamp": "2026-11-18T13:50:00.000Z"
  }
  ```

---

## Testing & Benchmarking

The project utilizes the native Node.js test runner (`node:test`).

Run all tests:
```bash
node --test tests/*.test.js
```

Included test suites:
- `tests/app.test.js`: State management, audio windowing, shuffle distribution, DOM fragment batching benchmarks, ARIA accessibility attributes, modal focus traps, and playlist/artist grouping.
- `tests/search.test.js`: Phonetic transformations, Hinglish transliterations, trigram Dice scoring, Damerau-Levenshtein distance, and a 5,000-song synthetic benchmark test (< 50ms latency target).
- `tests/songs.test.js`: Telegram channel ID normalization, chat validation, filename extension cleaning, update pagination, and 30-second refresh cooldown throttling.
- `tests/stream.test.js`: Query validation, regex sanitation, error code mapping, and HTTP range proxy stream piping.
- `tests/catalogStore.test.js`: Upstash Redis parallel fetch performance, error code propagation (`503`), and timestamp management.

---

## Troubleshooting

### `/api/songs` returns an empty array `[]`
- Confirm your bot was added to the channel **before** the audio files were uploaded.
- Confirm your bot has administrator status in the channel.
- Check that `TELEGRAM_CHANNEL_ID` matches your channel ID. For private channels, make sure the ID begins with `-100`.
- Verify updates were not consumed by another active webhook (see below).

### `Conflict: can't use getUpdates method while webhook is active`
If another integration configured a webhook for your bot, Telegram will block `getUpdates`. Remove it using curl:
```bash
curl "https://api.telegram.org/bot<YOUR_TELEGRAM_BOT_TOKEN>/deleteWebhook?drop_pending_updates=false"
```

### Mobile Autoplay Restrictions
Mobile Safari and Android Chrome block unmuted audio autoplay. Tap any track in the library or the hardware play button to trigger user interaction before audio begins.

### Database Inactivity Deletion on Free Tier
Upstash Redis databases on the free tier may hibernate after 30 days of complete inactivity. The automated Vercel Cron at `/api/cron/keepalive` runs daily at 03:00 UTC to write `murex:keepalive` and keep the database active indefinitely.

---

## Security & Privacy

- **Token Protection**: Your `TELEGRAM_BOT_TOKEN` and `UPSTASH_REDIS_REST_TOKEN` reside exclusively in serverless environment variables. They are never sent to or embedded within the client web application.
- **Input Sanitization**: `file_id` parameters passed to `/api/stream` and `/api/cover` are validated against strict regex (`^[\w-]{10,512}$`) to eliminate path traversal or request injection risks.
- **Single-User Scope**: This project is architected for private, personal use. If you choose to host it publicly, consider deploying behind [Vercel Authentication](https://vercel.com/docs/security/deployment-protection) or adding an authentication gateway.

---

<div align="center">

Crafted with vanilla web standards and zero bloat.

</div>
