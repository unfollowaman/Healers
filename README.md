# Telegram Personal Music Player

A private, single-user music streaming website that uses a Telegram channel as the audio storage backend. The browser talks only to your Vercel API routes; your Telegram bot token is never exposed to frontend JavaScript.

## Features

- `GET /api/songs` discovers Telegram audio messages and returns a clean JSON catalog.
- `GET /api/stream?file_id=...` resolves Telegram files server-side and proxies audio streams with range support.
- Mobile-first dark UI inspired by Spotify and YouTube Music.
- Real-time search by title or artist.
- Queue playback based on the current filtered search results.
- Sticky bottom player with play/pause, previous, next, progress, current time, total duration, and volume controls.
- No frontend frameworks: HTML, CSS, and vanilla JavaScript only.

## Project structure

```text
/
├── api/
│   ├── songs.js
│   └── stream.js
├── css/
│   └── style.css
├── js/
│   └── app.js
├── index.html
├── package.json
├── vercel.json
└── README.md
```

## Telegram bot setup

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy the bot token.
2. Add the bot to the Telegram channel that contains your music.
3. Promote the bot to an administrator so it can receive channel posts.
4. Upload audio files to the channel after the bot has been added. Telegram Bot API song discovery depends on updates delivered to the bot, so the bot must be present before the channel posts are created.
5. Find your channel ID:
   - Public channel: you may use the username format, such as `@my_music_channel`.
   - Private channel: use the numeric ID, usually starting with `-100`. You can get it from a channel post update, a Telegram ID helper bot, or your own bot logs.

> Important: Telegram Bot API does not provide a general channel-history endpoint. This app discovers audio from bot updates. If another service has already consumed the bot updates, or a webhook is configured elsewhere, clear that integration before using this app.

## Environment variables

Set these variables locally and in Vercel:

| Variable | Description |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | Bot token from BotFather. |
| `TELEGRAM_CHANNEL_ID` | Channel numeric ID, for example `-1001234567890`, or public username, for example `@my_music_channel`. |
| `UPSTASH_REDIS_REST_URL` | The REST URL of an Upstash Redis database. |
| `UPSTASH_REDIS_REST_TOKEN` | The REST token for the Upstash database. |

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file for Vercel CLI:

   ```bash
   cat > .env.local <<'ENV'
   TELEGRAM_BOT_TOKEN=123456789:replace_with_your_token
   TELEGRAM_CHANNEL_ID=-1001234567890
   UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your_upstash_token
   ENV
   ```

3. Start the Vercel development server:

   ```bash
   npm run dev
   ```

4. Open the local URL printed by Vercel, typically `http://localhost:3000`.

## Vercel deployment

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. Import the project in Vercel.
3. In **Project Settings → Environment Variables**, add:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHANNEL_ID`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Deploy the project.
5. Visit `/api/songs` once after deployment to build and cache the song catalog.
6. Use the **Refresh** button in the UI, or call `/api/songs?refresh=1`, after uploading new audio to the Telegram channel.

## API reference

### `GET /api/songs`

Returns audio messages discovered from the configured Telegram channel:

```json
[
  {
    "file_id": "...",
    "title": "Song title",
    "performer": "Artist",
    "duration": 240
  }
]
```

The endpoint filters updates by `TELEGRAM_CHANNEL_ID`, extracts Telegram `audio` attachments, deduplicates songs by Telegram file identity, and caches the catalog for fast repeat loads.

### `GET /api/stream?file_id=...`

Streams a Telegram audio file to the browser. The endpoint:

1. Validates the `file_id` query parameter.
2. Calls Telegram `getFile` on the server.
3. Proxies the file from Telegram's file API.
4. Forwards range requests so mobile browsers can seek and progressively load audio.

The browser receives only your app's `/api/stream` URL and never sees the Telegram bot token.

## Troubleshooting

### `/api/songs` returns an empty array

- Confirm the bot was added to the channel before the songs were uploaded.
- Confirm the bot is an administrator in the channel.
- Confirm `TELEGRAM_CHANNEL_ID` matches the channel that posted the audio messages.
- If you use a private channel, prefer the numeric `-100...` channel ID.
- If another server or webhook consumed the bot updates first, Telegram may no longer return those updates through `getUpdates`.
- Upload one new audio file after deployment, then call `/api/songs?refresh=1` to verify that discovery works.

### Telegram says `Conflict: can't use getUpdates method while webhook is active`

A webhook is already configured for the bot. Remove it before using this app:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/deleteWebhook?drop_pending_updates=false"
```

Use `drop_pending_updates=false` if you want to preserve pending song updates.

### Audio does not play on mobile

- Tap a song row or the play button directly. Android Chrome and Mobile Safari can block autoplay until a user gesture occurs.
- Make sure `/api/stream?file_id=...` returns `200` or `206` in the browser network panel.
- Confirm the Telegram file still exists and the bot still has access to the channel.

### New uploads do not appear immediately

- Use the **Refresh** button in the app.
- Or call `/api/songs?refresh=1` directly.
- Vercel may serve a cached catalog for normal `/api/songs` requests, which improves performance for everyday listening.

## Security notes

- Keep `TELEGRAM_BOT_TOKEN` only in Vercel environment variables and local `.env.local` files.
- Do not commit real tokens or private channel IDs.
- This app is intended for personal use. Add your own authentication layer if you deploy it to a public URL that other people can access.
