import { requireEnv } from './utils.js';
import { getCatalogFromStore, saveCatalogToStore } from './_lib/catalogStore.js';

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';
const UPDATE_PAGE_SIZE = 100;

const CACHE_S_MAXAGE = 3600;
const CACHE_STALE_WHILE_REVALIDATE = 86400;

export function normalizeChannelId(value) {
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
    file_unique_id: audio.file_unique_id || audio.file_id,
    coverFileId: audio.thumbnail?.file_id || audio.thumb?.file_id || null
  };
}

function publicSong(song) {
  return {
    file_id: song.file_id,
    title: song.title,
    performer: song.performer,
    duration: song.duration,
    coverFileId: song.coverFileId
  };
}

export async function telegramRequest(token, method, params = {}) {
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

  for (const song of existingSongs) {
    byUniqueId.set(song.file_unique_id || song.file_id, song);
  }
  for (const song of incomingSongs) {
    const key = song.file_unique_id || song.file_id;
    if (!byUniqueId.has(key)) {
      byUniqueId.set(key, song);
    }
  }

  return [...byUniqueId.values()].sort((a, b) => {
    if (a.date !== b.date) return a.date - b.date;
    return a.message_id - b.message_id;
  });
}

async function discoverSongs() {
  const token = requireEnv('TELEGRAM_BOT_TOKEN');
  const channelId = normalizeChannelId(requireEnv('TELEGRAM_CHANNEL_ID'));

  const { catalog: existingCatalog, offset } = await getCatalogFromStore();

  let currentOffset = offset;
  let currentCatalog = existingCatalog;

  while (true) {
    const updates = await telegramRequest(token, 'getUpdates', {
      offset: currentOffset,
      limit: UPDATE_PAGE_SIZE,
      timeout: 0,
      allowed_updates: JSON.stringify(['message', 'channel_post'])
    });

    if (updates.length === 0) {
      break;
    }

    let batchAudioMessages = [];
    let highestUpdateId = currentOffset - 1;

    for (const update of updates) {
      if (highestUpdateId < update.update_id) {
        highestUpdateId = update.update_id;
      }

      const message = update.channel_post || update.message;
      if (!isExpectedChannel(message?.chat, channelId)) continue;

      const song = toSong(update);
      if (song) batchAudioMessages.push(song);
    }

    const candidateNextOffset = highestUpdateId + 1;
    const mergedCatalog = mergeSongs(currentCatalog, batchAudioMessages);

    // Persist this batch before acknowledging it via the next getUpdates call
    await saveCatalogToStore(mergedCatalog, candidateNextOffset);

    currentCatalog = mergedCatalog;
    currentOffset = candidateNextOffset;

    if (updates.length < UPDATE_PAGE_SIZE) {
      break;
    }
  }

  return currentCatalog;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const refresh = req.query?.refresh === '1';

    let songs;
    if (refresh) {
      songs = await discoverSongs();
    } else {
      const storeData = await getCatalogFromStore();
      songs = storeData.catalog;
    }

    res.setHeader('Cache-Control', refresh ? 'no-store' : `s-maxage=${CACHE_S_MAXAGE}, stale-while-revalidate=${CACHE_STALE_WHILE_REVALIDATE}`);
    return res.status(200).json(songs.map(publicSong));
  } catch (error) {
    console.error('Error handling /api/songs request:', error);
    if (error.statusCode === 503) {
      return res.status(503).json({
        error: 'Catalog store unavailable',
        detail: error.message
      });
    }
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      error: error.message || 'Unable to load songs from Telegram.'
    });
  }
}
