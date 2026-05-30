const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';
const MAX_UPDATE_PAGES = 25;
const UPDATE_PAGE_SIZE = 100;

let memoryCatalog = [];
let lastScannedAt = 0;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    const error = new Error(`${name} is not configured.`);
    error.statusCode = 500;
    throw error;
  }
  return value;
}

function normalizeChannelId(value) {
  return String(value || '').trim();
}

function isExpectedChannel(chat, expectedChannelId) {
  if (!expectedChannelId) return true;

  const expected = normalizeChannelId(expectedChannelId);
  const numericChatId = chat?.id == null ? '' : String(chat.id);
  const username = chat?.username ? `@${chat.username}`.toLowerCase() : '';

  return numericChatId === expected || username === expected.toLowerCase();
}

function trimExtension(fileName = '') {
  return fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
}

function toSong(update) {
  const message = update.channel_post || update.message;
  const audio = message?.audio;
  if (!message || !audio) return null;

  return {
    file_id: audio.file_id,
    title: audio.title || trimExtension(audio.file_name) || 'Untitled track',
    performer: audio.performer || 'Unknown Artist',
    duration: Number(audio.duration || 0),
    filename: audio.file_name || '',
    message_id: message.message_id,
    date: message.date || 0,
    file_unique_id: audio.file_unique_id || audio.file_id
  };
}

function publicSong(song) {
  return {
    file_id: song.file_id,
    title: song.title,
    performer: song.performer,
    duration: song.duration
  };
}

async function telegramRequest(token, method, params = {}) {
  const url = new URL(`${TELEGRAM_API_BASE}${token}/${method}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json'
    }
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) {
    const description = body?.description || `Telegram API request failed with status ${response.status}.`;
    const error = new Error(description);
    error.statusCode = response.status || 502;
    throw error;
  }

  return body.result;
}

function mergeSongs(existingSongs, incomingSongs) {
  const byUniqueId = new Map();

  for (const song of [...existingSongs, ...incomingSongs]) {
    byUniqueId.set(song.file_unique_id || song.file_id, song);
  }

  return [...byUniqueId.values()].sort((a, b) => {
    if (a.date !== b.date) return a.date - b.date;
    return a.message_id - b.message_id;
  });
}

async function discoverSongs() {
  const token = requireEnv('TELEGRAM_BOT_TOKEN');
  const channelId = normalizeChannelId(requireEnv('TELEGRAM_CHANNEL_ID'));
  const discovered = [];
  let offset;

  for (let page = 0; page < MAX_UPDATE_PAGES; page += 1) {
    const updates = await telegramRequest(token, 'getUpdates', {
      offset,
      limit: UPDATE_PAGE_SIZE,
      timeout: 0,
      allowed_updates: JSON.stringify(['message', 'channel_post'])
    });

    if (!updates.length) break;

    let highestUpdateId = offset ? offset - 1 : -1;

    for (const update of updates) {
      highestUpdateId = Math.max(highestUpdateId, update.update_id);
      const message = update.channel_post || update.message;
      if (!isExpectedChannel(message?.chat, channelId)) continue;

      const song = toSong(update);
      if (song) discovered.push(song);
    }

    offset = highestUpdateId + 1;
    if (updates.length < UPDATE_PAGE_SIZE) break;
  }

  memoryCatalog = mergeSongs(memoryCatalog, discovered);
  lastScannedAt = Date.now();
  return memoryCatalog;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const refresh = req.query?.refresh === '1';
    const cacheIsWarm = memoryCatalog.length > 0 && Date.now() - lastScannedAt < 5 * 60 * 1000;
    const songs = refresh || !cacheIsWarm ? await discoverSongs() : memoryCatalog;

    res.setHeader('Cache-Control', refresh ? 'no-store' : 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(songs.map(publicSong));
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      error: error.message || 'Unable to load songs from Telegram.'
    });
  }
}
