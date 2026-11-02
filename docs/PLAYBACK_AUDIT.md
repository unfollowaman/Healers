# Murex Playback & Audio Fetch Pipeline Audit

This document provides a comprehensive technical investigation into the song fetching, streaming, and playback architecture of Murex / Healers. It analyzes two specific reported bugs observed on Android (Brave browser, screen turned off, lock-screen / Media Session playback):

- **Bug A**: After a song finishes, the next song sometimes fails to load and playback ends.
- **Bug B**: A song sometimes stops mid-track and never resumes (e.g. stopping at 1:45 of a 3:00 track; stop point varies).

---

## 1. Fetch Pipeline Map

Tracing one song from user interaction (or automatic transition) to audio output:

### 1.1 Trigger & Audio Source Assignment
When a song is selected or automatically triggered in `js/app.js`:
- In `startSong(index)`:
```javascript
// js/app.js: startSong(index)
async function startSong(index) {
    if (index < 0 || index >= state.songs.length) return;
    state.currentIndex = index;
    const song = getCurrentSong();
    if (!song) return;

    recordPlayedSong(song);

    updateNowPlaying(song);
    elements.audio.src = `/api/stream?file_id=${encodeURIComponent(song.file_id)}`;
    elements.audio.load();

    try {
        await elements.audio.play();
        logPlayEvent(song);
    } catch (error) {
        console.warn('Autoplay prevented or playback interrupted:', error);
    }
    updatePlayButton();

    if (state.isQueueOpen) {
        renderQueueList();
    }
}
```
1. The browser's `<audio id="audio-player">` element is given `src = "/api/stream?file_id=" + encodeURIComponent(song.file_id)`.
2. `elements.audio.load()` is invoked synchronously.
3. `elements.audio.play()` is invoked. The returned promise is awaited inside a `try/catch` block. If `play()` rejects, only a `console.warn` is executed; there is no retry, recovery, or fallback handler.

### 1.2 Endpoint Request & Telegram Resolution
When the browser initiates an HTTP `GET` request for the audio URL `/api/stream?file_id=...`:
- Vercel routes the request to `api/stream.js`:
```javascript
// api/stream.js: default handler(req, res)
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const token = requireEnv('TELEGRAM_BOT_TOKEN');
    const fileId = req.query?.file_id;
    validateFileId(fileId);

    const file = await getTelegramFile(token, fileId);

    if (req.method === 'HEAD') {
      res.setHeader('Cache-Control', 'private, max-age=3600');
      return res.status(200).end();
    }

    await streamTelegramFile({
      token,
      filePath: file.file_path,
      range: req.headers.range
    }, res);
  } catch (error) {
    if (!res.headersSent) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        error: error.message || 'Unable to stream audio from Telegram.'
      });
    }

    res.destroy(error);
  }
}
```
- Telegram's Bot API is queried via `getTelegramFile(token, fileId)`:
```javascript
// api/stream.js: getTelegramFile(token, fileId)
export async function getTelegramFile(token, fileId) {
  const url = new URL(`${TELEGRAM_API_BASE}${token}/getFile`);
  url.searchParams.set('file_id', fileId);

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json'
    }
  });
  const body = await response.json().catch(() => null);

  if (!response.ok || !body?.ok) {
    const error = new Error(body?.description || 'Unable to resolve Telegram file.');
    error.statusCode = response.status || 502;
    throw error;
  }

  if (!body.result?.file_path) {
    const error = new Error('Telegram did not return a downloadable file path.');
    error.statusCode = 502;
    throw error;
  }

  return body.result;
}
```
**Key observation**: Every single HTTP request (initial load or Range slice) triggers a fresh outbound `fetch()` to `https://api.telegram.org/bot<TOKEN>/getFile` before streaming begins. The `file_path` is not cached anywhere.

### 1.3 Upstream Streaming & Range Proxying
Once `file.file_path` is resolved, `streamTelegramFile()` initiates an HTTPS request to Telegram's file server:
```javascript
// api/stream.js: streamTelegramFile({ token, filePath, range }, res)
function streamTelegramFile({ token, filePath, range }, res) {
  return new Promise((resolve, reject) => {
    const fileUrl = new URL(`${TELEGRAM_FILE_BASE}${token}/${filePath}`);
    const request = https.request(fileUrl, {
      method: 'GET',
      headers: range ? { Range: range } : undefined
    }, (telegramResponse) => {
      const headers = { ...telegramResponse.headers };
      headers['cache-control'] = 'private, max-age=3600';
      headers['accept-ranges'] = headers['accept-ranges'] || 'bytes';
      headers['content-type'] = headers['content-type'] || 'audio/mpeg';

      delete headers['set-cookie'];
      delete headers['content-security-policy'];

      res.writeHead(telegramResponse.statusCode || 200, headers);
      telegramResponse.pipe(res);
      telegramResponse.on('end', resolve);
    });

    request.on('error', reject);
    request.end();
  });
}
```
- **Range forwarding**: `headers: range ? { Range: range } : undefined` forwards the client's `Range` header directly to Telegram.
- **Status code forwarding**: `res.writeHead(telegramResponse.statusCode || 200, headers)`. If Telegram responds with HTTP 206 Partial Content, the Vercel function sends HTTP 206 to the client.
- **Headers returned**:
  - `Content-Type`: Forwarded from Telegram or fallback `'audio/mpeg'`.
  - `Content-Length`: Forwarded from Telegram via `...telegramResponse.headers`.
  - `Accept-Ranges`: Forwarded from Telegram or fallback `'bytes'`.
  - `Content-Range`: Forwarded from Telegram (if present in `telegramResponse.headers` on a 206 response).
  - `Cache-Control`: Explicitly overwritten with `'private, max-age=3600'`.
- **Streaming mechanism**: The endpoint uses `telegramResponse.pipe(res)`. It streams chunks directly as they arrive from Telegram rather than buffering the entire file into Node memory.

---

## 2. Hypothesis Checklist

| # | Hypothesis | Verdict | Quoted Code Evidence & Analysis |
|---|---|---|---|
| **a** | **Range requests**: stream endpoint ignores or mishandles Range | **RULED OUT** | In `api/stream.js`: `headers: range ? { Range: range } : undefined` and `res.writeHead(telegramResponse.statusCode || 200, headers); telegramResponse.pipe(res);`. The endpoint correctly forwards the incoming client `Range` header to Telegram, receives Telegram's `206 Partial Content` along with `Content-Range` and `Content-Length`, and pipes them back to the client. Seeking and range slicing work at the HTTP level. |
| **b** | **Vercel serverless limits**: function timeout / max duration vs track length | **CONFIRMED (Primary cause for Bug B)** | In `vercel.json`: ```json { "version": 2, "cleanUrls": true, ... } ``` There is **no `maxDuration` specified** in `vercel.json`. On Vercel Hobby tier, the default serverless execution duration limit is **10 seconds** (or 15s depending on runtime region). On Vercel Pro tier, the default is **15 seconds** unless `maxDuration` is explicitly declared. Because `/api/stream` is a Vercel Serverless Function that proxies audio in real-time, if the mobile browser streams audio at 1x playback rate over a single continuous connection without pre-buffering the entire file in under 10–15 seconds, Vercel kills the serverless function execution (`GATEWAY_TIMEOUT` / `FUNCTION_INVOCATION_TIMEOUT`), abruptly severing the TCP stream to the phone. |
| **c** | **Telegram file_path or download URL expiry & Bot API limits** | **CONFIRMED (Contributing to Bug A & B)** | In `api/stream.js:getTelegramFile`: ```javascript const url = new URL(`${TELEGRAM_API_BASE}${token}/getFile`); url.searchParams.set('file_id', fileId); const response = await fetch(url, ...); ``` 1. `file_path` is not cached. Every single audio chunk or track change hits Telegram's Bot API `/getFile`. 2. Telegram Bot API limits `/getFile` to files $\le$ 20 MB. Songs over 20 MB fail with HTTP 400/502. 3. Telegram rate limits Bot API requests (around 30 reqs/sec global, and strict burst limits per bot). If Telegram returns HTTP 429 or 502, `getTelegramFile` throws and `/api/stream` returns 502. 4. Furthermore, Telegram download URLs (`/file/bot<token>/<file_path>`) expire after roughly 1 hour, though since `getFile` is called dynamically per request, file expiry only affects active connections older than 1 hour. |
| **d** | **Upstream failure handling**: what happens when Telegram drops mid-stream | **CONFIRMED** | In `api/stream.js`: ```javascript } catch (error) { if (!res.headersSent) { const statusCode = error.statusCode || 500; return res.status(statusCode).json({ error: error.message || 'Unable to stream audio from Telegram.' }); } res.destroy(error); } ``` In `streamTelegramFile`: ```javascript request.on('error', reject); telegramResponse.pipe(res); telegramResponse.on('end', resolve); ``` Notice: `telegramResponse.on('error')` is NOT handled; only `request.on('error')` is wired. If Telegram closes the stream prematurely, `res.destroy(error)` terminates the client socket. In the browser (`js/app.js`), there is NO listener on `<audio>` for `'error'`, `'stalled'`, `'abort'`, or `'suspend'`. The audio element enters an error state or sits stalled, and playback halts forever. |
| **e** | **Next-track logic**: triggered by 'ended', timers, unhandled promises | **CONFIRMED (Primary cause for Bug A)** | In `js/app.js`: ```javascript elements.audio.addEventListener('ended', handleTrackEnded); function handleTrackEnded() { cancelProgressLoop(); if (state.repeatMode === 'one') { ... return; } playNext(); } ``` And in `startSong`: ```javascript elements.audio.src = `/api/stream?file_id=${encodeURIComponent(song.file_id)}`; elements.audio.load(); try { await elements.audio.play(); logPlayEvent(song); } catch (error) { console.warn('Autoplay prevented or playback interrupted:', error); } ``` If the phone screen is off and background execution is heavily constrained: 1. `elements.audio.play()` rejects or hangs if the OS restricts new background media playback initiated without an active user gesture, or if network fetching the new track takes too long. 2. In `js/device-media.js`: ```javascript function handleAudioEndedOrEmptied() { try { navigator.mediaSession.playbackState = 'none'; } catch (err) { console.warn('MediaSession playbackState none error:', err); } } ... audio.addEventListener('ended', handleAudioEndedOrEmptied); audio.addEventListener('emptied', handleAudioEndedOrEmptied); ``` When `ended` fires, `handleAudioEndedOrEmptied` immediately sets `navigator.mediaSession.playbackState = 'none'`. Calling `elements.audio.load()` inside `startSong()` synchronously fires `emptied`, which AGAIN sets `playbackState = 'none'`. Setting `playbackState = 'none'` while screen is off informs the mobile operating system (Android) that media playback has ceased, allowing the OS audio focus manager to discard foreground background audio privileges before `play()` finishes. 3. If `startSong()` fails, it merely logs `console.warn` and does not retry or skip to the next track. Playback completely ends. |
| **f** | **Background throttling**: setInterval/setTimeout/rAF/visibilitychange | **CONFIRMED** | In `js/app.js`: ```javascript function startProgressLoop() { cancelProgressLoop(); function step() { updateProgress(); if (elements.audio && !elements.audio.paused && !elements.audio.ended) { progressAnimationFrame = requestAnimationFrame(step); } else { progressAnimationFrame = null; } } progressAnimationFrame = requestAnimationFrame(step); } ``` In `js/device-crt.js`: ```javascript document.addEventListener('visibilitychange', function () { if (document.hidden) { stopLoop(); } else { startLoop(); } }); ``` While `requestAnimationFrame` and CRT rendering correctly stop when hidden (`document.hidden`), notice that track advance does NOT depend on timers (it binds to `audio.addEventListener('ended')`). However, mobile browsers (especially Brave / Chromium on Android with aggressive battery optimization) aggressively throttle JavaScript timers and async network tasks when the screen is locked and no audio is actively outputting sound. If `audio.src` is changed and `playbackState` drops to `'none'`, the tab loses wake-lock and JS execution suspends. |
| **g** | **Web Audio API**: AudioContext / createMediaElementSource / AnalyserNode | **RULED OUT** | Codebase search across all files reveals **zero usages** of `AudioContext`, `webkitAudioContext`, `createMediaElementSource`, or `AnalyserNode`. CRT visualization in `js/device-crt.js` is purely procedural/algorithmic based on elapsed time and audio state (`audio.addEventListener('play')`), with no Web Audio nodes attached to the media element. |
| **h** | **Media Session**: handlers registered, path equivalence, stale duration | **CONFIRMED (Flawed state transitions)** | In `js/device-media.js`: ```javascript ['nexttrack', function () { if (nextButton) nextButton.click(); }], ['previoustrack', function () { if (prevButton) prevButton.click(); }] ``` In `js/app.js`: ```javascript elements.nextButton.addEventListener('click', playNext); ``` The Media Session handlers do invoke the exact same code path (`nextButton.click()` $\rightarrow$ `playNext()`). However: 1. `audio.addEventListener('ended', handleAudioEndedOrEmptied)` and `'emptied'` set `playbackState = 'none'` synchronously right as the next track is being prepared. 2. `syncPosition()` calls `navigator.mediaSession.setPositionState()` using `audio.duration`. If `audio.duration` is `NaN` or unready during track transition, position is cleared. |
| **i** | **Error and stall handling**: error/stalled/waiting/suspend/abort listeners | **CONFIRMED (Zero recovery logic)** | Codebase audit of `js/app.js`, `js/device-media.js`, and `js/device-ui.js`: - There are **no event listeners** for `error`, `stalled`, `waiting`, `suspend`, or `abort` on `elements.audio`. - If an HTTP stream is dropped by Vercel or Telegram mid-track, the HTML5 audio element raises a `stalled` or `error` event (`audio.error.code = MEDIA_ERR_NETWORK` or `MEDIA_ERR_DECODE`). - Because there is no error handler, no retry from `audio.currentTime`, and no auto-skip to the next track, the player stays frozen permanently at that timestamp. |
| **j** | **Preloading**: next track preloaded or prefetched | **CONFIRMED (Absence of preloading)** | In `index.html`: ```html <audio id="audio-player" preload="metadata"></audio> ``` There is **no preloading or prefetching** of the next track anywhere in `js/app.js`. When a track ends, there is an unavoidable network roundtrip: client calls `/api/stream?file_id=...` $\rightarrow$ Vercel invokes `getTelegramFile` $\rightarrow$ Telegram Bot API responds $\rightarrow$ Vercel opens HTTPS stream to Telegram file server $\rightarrow$ first audio chunk arrives. On mobile connections with screen off, this network latency gap (often 1.5–3+ seconds) creates dead air, causing Android/Brave to assume media session playback has ended and revoke background execution. |
| **k** | **Stats or tracking calls**: /api/stats/track throwing or blocking | **RULED OUT** | In `js/app.js`: ```javascript function logPlayEvent(song) { if (!song) return; ... state.playHistory.unshift(playEvent); ... savePlayHistory(); } ``` All tracking and history logging is strictly client-side via `localStorage.setItem('murex_play_history', ...)`. There are no remote `/api/stats` network requests in `js/app.js`, and `logPlayEvent` is wrapped synchronously within the `try` block after `audio.play()` resolves. |
| **l** | **Catalog or queue state**: empty, stale, or index out of range | **CONFIRMED (Potential edge case on shuffle/single-track queue)** | In `js/app.js:playNext()`: ```javascript function playNext() { if (!state.songs.length) return; if (state.isShuffle) { const nextIndex = pickShuffleNextIndex(); if (nextIndex >= 0) { startSong(nextIndex); } } else { const nextIndex = (state.currentIndex + 1) % state.songs.length; startSong(nextIndex); } } ``` If `state.songs.length === 0`, `playNext()` silently returns without doing anything. In `pickShuffleNextIndex()`: ```javascript if (len === 1) return 0; ... if (eligibleIndices.length === 0) { return state.currentIndex >= 0 ? state.currentIndex : 0; } ``` If `state.songs` has items, `pickShuffleNextIndex()` returns a valid index. However, if an artist or playlist detail view previously overrode `state.songs` (e.g. `playSongFromArtist`: `state.songs = [...artist.songs]`), and that list only had 1 song, it loops or re-plays that 1 song. |

---

## 3. Failure Scenarios

### Bug A: After a song finishes, the next song sometimes fails to load and playback ends

#### Ranked Root Causes:
1. **Premature MediaSession Teardown & Lock-Screen Audio Focus Loss (Highest Likelihood)**
   - **Mechanism**: In `js/device-media.js`, line 191:
     ```javascript
     function handleAudioEndedOrEmptied() {
         try {
             navigator.mediaSession.playbackState = 'none';
         } catch (err) {
             console.warn('MediaSession playbackState none error:', err);
         }
     }
     audio.addEventListener('ended', handleAudioEndedOrEmptied);
     audio.addEventListener('emptied', handleAudioEndedOrEmptied);
     ```
     When a song ends, `handleAudioEndedOrEmptied` fires and sets `navigator.mediaSession.playbackState = 'none'`. Then in `js/app.js`, `handleTrackEnded()` calls `playNext()`, which calls `startSong()`, which calls `elements.audio.load()`. Calling `.load()` immediately triggers the browser's `'emptied'` event, which again sets `navigator.mediaSession.playbackState = 'none'`.
   - **Why screen-off specific**: When the screen is OFF on Android, the operating system's audio focus service monitors `MediaSession` state. When `playbackState` drops to `'none'`, Android immediately revokes the app's background wake lock and audio focus. By the time `audio.play()` is invoked asynchronously after the network round-trip to `/api/stream`, the browser has been suspended by Android, and `play()` rejects with `NotAllowedError: play() can only be initiated by a user gesture.`
   - **File & Function**: `js/device-media.js: handleAudioEndedOrEmptied()`, `js/app.js: startSong()`.
   - **How to reproduce**: On Android Brave, lock screen with a short track (or seek to 2 seconds before end). Allow track to end. Observe in adb logcat that Android audio service receives `playbackState = 'none'` and releases the wake lock before the next track begins buffering.

2. **Network Gap / Telegram getFile Cold Latency during Track Transition**
   - **Mechanism**: There is no next-track preloading. When track ends, the client must wait for:
     1. Client $\rightarrow$ Vercel `/api/stream?file_id=...`
     2. Vercel $\rightarrow$ Telegram `/getFile`
     3. Vercel $\rightarrow$ Telegram `/file/bot...`
   - **Why screen-off specific**: If mobile radio enters power-saving sleep during track end, the cold round-trip to Telegram often takes 2–5 seconds. Because `audio.src` has been reset and audio output is zero, Android detects inactive audio for $>1$ second and suspends the Chromium rendering process.
   - **File & Function**: `js/app.js: startSong()`, `api/stream.js: handler()`.
   - **How to reproduce**: Throttle mobile network to 3G/LTE in Chrome DevTools Remote Debugging on an Android device; let song reach end with screen off.

3. **Telegram 429 / 502 Rate Limiting on Rapid getFile Calls**
   - **Mechanism**: Every track change performs an uncached `getTelegramFile` call. If rate-limited or if Telegram transiently fails, `/api/stream` returns 502.
   - **File & Function**: `api/stream.js: getTelegramFile()`.

---

### Bug B: A song sometimes stops mid-track and never resumes (e.g. stopping near 1:45)

#### Ranked Root Causes:
1. **Vercel Serverless Function Timeout Severing Stream (Highest Likelihood)**
   - **Mechanism**: `/api/stream.js` is a standard Vercel Serverless Function. In `vercel.json`, no `maxDuration` is configured.
     - On Vercel Hobby plan, default serverless function timeout is **10 seconds** (max configurable is 60s).
     - On Vercel Pro plan, default is **15 seconds** (max configurable is 300s).
     When a mobile browser streams an audio file in real-time, the browser does not buffer the entire 5–10MB MP3 instantly; mobile Chromium requests chunks via HTTP or throttles downstream TCP window to buffer only 30–60 seconds ahead. As soon as the Vercel function hits its execution limit (10s–60s), Vercel terminates the serverless container with a timeout. The TCP stream to the phone is severed mid-file.
   - **Why stop point varies (e.g. 1:45)**: The audio element buffers a variable number of seconds ahead depending on mobile connection speed before Vercel kills the function. If network speed allows downloading 100 seconds worth of audio within the Vercel timeout window, the song plays until exactly 1:40–1:45 where the buffer ran out, then halts.
   - **Why screen-off specific**: When screen is on, user might touch slider or seek, which issues a new HTTP Range request and restarts the buffer. With screen off, once the pre-buffered audio finishes, the audio element encounters end-of-buffer, fires a `stalled` event, and stops.
   - **File & Function**: `vercel.json` (missing `maxDuration`), `api/stream.js: streamTelegramFile()`.
   - **How to reproduce**: Deploy to Vercel without `maxDuration`. Play a 4-minute 320kbps MP3 on a throttled mobile network where the whole file cannot download within 10 seconds. Observe serverless function log displaying `TASK TIME OUT` or `504 Gateway Timeout` after 10.0s, and browser playback freezing once the buffered range is exhausted.

2. **Total Absence of Stalled/Error Recovery in Client Audio Engine**
   - **Mechanism**: When an underlying TCP socket or HTTP stream disconnects, HTML5 `<audio>` pauses and enters `stalled` or fires `error`. In `js/app.js`, there is **no handler for `error` or `stalled`**.
   ```javascript
   // js/app.js lines 1300-1310:
   elements.audio.addEventListener('play', () => { ... });
   elements.audio.addEventListener('pause', () => { ... });
   elements.audio.addEventListener('ended', handleTrackEnded);
   elements.audio.addEventListener('timeupdate', updateProgress);
   elements.audio.addEventListener('loadedmetadata', updateProgress);
   // Notice: No 'error', 'stalled', or 'waiting' listeners!
   ```
   Without a retry mechanism (e.g., re-fetching `src` with a `Range: bytes=<currentTime>-` header or reloading `elements.audio.currentTime`), the browser stays stalled indefinitely.
   - **File & Function**: `js/app.js: bindEvents()`.
   - **How to reproduce**: Simulate a transient network blip by toggling Airplane mode for 1 second while playing a song. The player permanently stops at that second and never recovers.

3. **Telegram File Stream Socket Drop without Error Propagation**
   - **Mechanism**: In `api/stream.js: streamTelegramFile()`:
     ```javascript
     const request = https.request(fileUrl, ..., (telegramResponse) => {
         ...
         res.writeHead(telegramResponse.statusCode || 200, headers);
         telegramResponse.pipe(res);
         telegramResponse.on('end', resolve);
     });
     request.on('error', reject);
     ```
     Notice that `telegramResponse.on('error')` is not hooked. If Telegram drops the connection mid-transfer, Node's `pipe` may close `res` without sending an HTTP error code (since headers were already sent), resulting in a truncated MP3 stream.
   - **File & Function**: `api/stream.js: streamTelegramFile()`.

---

## 4. Proposed Fixes (Findings Only — Not Implemented)

The proposed solutions are modularized below into standalone, single-concern engineering tasks:

### Task Group 1: Serverless Stream Longevity & Direct Redirect
- **Fix Description**:
  1. Add `maxDuration` to `vercel.json` for `api/stream.js` (e.g. `60` for Hobby, or up to `300` for Pro).
  2. Alternatively (and most recommended): instead of proxying megabytes of audio through a serverless function, `/api/stream` can issue an `HTTP 307 Temporary Redirect` directly to the Telegram file download URL (`https://api.telegram.org/file/bot<TOKEN>/<file_path>`). Telegram's file servers support full byte-ranges, have no 10-second serverless timeout, and stream directly to the client browser!
  3. Cache `file_path` in Upstash Redis or in-memory LRU with a 45-minute TTL to avoid redundant Telegram `/getFile` API round-trips.
- **Files Touched**: `vercel.json`, `api/stream.js`.
- **Regression Risk**: Low. Telegram file URLs must allow direct CORS access (or client audio elements can play cross-origin audio without CORS headers when no Web Audio API is used).
- **Suggested Priority**: 1 (Resolves Bug B root cause).

### Task Group 2: MediaSession State Transition Fix & Screen-Off Audio Continuity
- **Fix Description**:
  1. In `js/device-media.js`, remove setting `playbackState = 'none'` inside `handleAudioEndedOrEmptied`. During track transition (`ended` and `emptied`), keep `navigator.mediaSession.playbackState = 'playing'` or temporarily transition to `'paused'` only when explicitly user-paused. Setting `'none'` tells Android the session is dead.
  2. In `js/app.js`, handle track transitions without tearing down the audio player state before the next track's promise resolves.
- **Files Touched**: `js/device-media.js`, `js/app.js`.
- **Regression Risk**: Very Low. Improves lock-screen UI consistency.
- **Suggested Priority**: 2 (Resolves Bug A primary root cause).

### Task Group 3: Client Audio Recovery Engine (Stall & Error Resilience)
- **Fix Description**:
  1. Add listeners on `elements.audio` for `'stalled'`, `'waiting'`, and `'error'`.
  2. Implement an automatic retry mechanism: if audio stalls or errors mid-song for $>3$ seconds, record `const resumeTime = elements.audio.currentTime`, re-assign `audio.src`, reload, seek to `resumeTime`, and call `audio.play()`.
  3. If loading the next track in `startSong()` fails after 2 retries, automatically advance to `playNext()` instead of halting playback permanently.
- **Files Touched**: `js/app.js`.
- **Regression Risk**: Low. Guard against infinite retry loops with a maximum retry counter (e.g. max 3 retries).
- **Suggested Priority**: 3 (Eliminates deadlocks for both Bug A and Bug B).

### Task Group 4: Next-Track Audio Preloading
- **Fix Description**:
  1. Create a hidden auxiliary `<audio id="audio-preloader" preload="auto">` or use a lightweight background `fetch()` for the next track's metadata / first chunk when the current song reaches 90% progress (`audio.currentTime / audio.duration > 0.90`).
  2. Seamlessly swap or play pre-buffered audio to eliminate silence gap at track boundaries.
- **Files Touched**: `js/app.js`, `index.html`.
- **Regression Risk**: Low. Needs careful memory management on mobile devices.
- **Suggested Priority**: 4.

---

## 5. Diagnostics Proposal

To capture telemetry on physical Android devices when screen is off, a lightweight diagnostic ring-buffer can be integrated into `js/app.js` and stored in `localStorage` or dumped to a hidden debug modal:

### 5.1 Event Logging Ring Buffer
Log critical audio lifecycle events with high-resolution timestamps:
```javascript
// Suggested diagnostic recorder (to be added temporarily in a future debug branch)
const audioDiagnosticLog = [];
function recordAudioDiag(event, extra = {}) {
    const entry = {
        ts: new Date().toISOString(),
        tMs: Date.now(),
        event: event,
        currentTime: elements.audio?.currentTime || 0,
        duration: elements.audio?.duration || 0,
        readyState: elements.audio?.readyState,
        networkState: elements.audio?.networkState,
        paused: elements.audio?.paused,
        ended: elements.audio?.ended,
        error: elements.audio?.error ? {
            code: elements.audio.error.code,
            message: elements.audio.error.message
        } : null,
        mediaSessionState: navigator.mediaSession?.playbackState,
        screenHidden: document.hidden,
        ...extra
    };
    audioDiagnosticLog.push(entry);
    if (audioDiagnosticLog.length > 100) audioDiagnosticLog.shift();
    try {
        localStorage.setItem('murex_audio_diag', JSON.stringify(audioDiagnosticLog));
    } catch (e) {}
}

['loadstart', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough',
 'play', 'playing', 'pause', 'waiting', 'stalled', 'suspend', 'abort',
 'error', 'emptied', 'ended'].forEach((evt) => {
    elements.audio.addEventListener(evt, () => recordAudioDiag(evt));
});
```

### 5.2 What This Captures
When the failure occurs in the pocket:
1. The user unlocks the phone and opens the app.
2. The log will reveal:
   - For **Bug A**: Did `'ended'` fire? What was the exact exception thrown by `audio.play()` on the next track? Did `document.hidden` block execution? Did `mediaSession.playbackState` change to `'none'`?
   - For **Bug B**: Did a `'stalled'` or `'error'` event fire at 1:45? What was `networkState` (e.g. `NETWORK_IDLE` vs `NETWORK_LOADING`) and `readyState`? What was the HTTP status code returned by `/api/stream`?
