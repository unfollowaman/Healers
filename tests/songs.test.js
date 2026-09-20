import test from 'node:test';
import assert from 'node:assert';
import handler, { normalizeChannelId, isExpectedChannel, trimExtension } from '../api/songs.js';

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(key, val) {
      res.headers[key.toLowerCase()] = val;
    },
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(data) {
      res.body = data;
      return res;
    }
  };
  return res;
}

test('normalizeChannelId', (t) => {
  assert.strictEqual(normalizeChannelId(''), '');
  assert.strictEqual(normalizeChannelId('  '), '');
  assert.strictEqual(normalizeChannelId(null), '');
  assert.strictEqual(normalizeChannelId(undefined), '');
  assert.strictEqual(normalizeChannelId(123), '123');
  assert.strictEqual(normalizeChannelId(' 123 '), '123');
  assert.strictEqual(normalizeChannelId('-1001234567890'), '-1001234567890');
  assert.strictEqual(normalizeChannelId(' -1001234567890  '), '-1001234567890');
  assert.strictEqual(normalizeChannelId('@my_channel'), '@my_channel');
  assert.strictEqual(normalizeChannelId('  @my_channel '), '@my_channel');
});

test('isExpectedChannel', (t) => {
  // Returns true when expectedChannelId is not set / empty / whitespace
  assert.strictEqual(isExpectedChannel({ id: -100123 }, ''), true);
  assert.strictEqual(isExpectedChannel({ id: -100123 }, null), true);
  assert.strictEqual(isExpectedChannel({ id: -100123 }, undefined), true);
  assert.strictEqual(isExpectedChannel(null, ''), true);

  // Match by numeric chat id
  assert.strictEqual(isExpectedChannel({ id: -1001234567890 }, '-1001234567890'), true);
  assert.strictEqual(isExpectedChannel({ id: -1001234567890 }, ' -1001234567890 '), true);
  assert.strictEqual(isExpectedChannel({ id: '-1001234567890' }, '-1001234567890'), true);

  // Match by @username (case-insensitive)
  assert.strictEqual(isExpectedChannel({ username: 'my_channel' }, '@my_channel'), true);
  assert.strictEqual(isExpectedChannel({ username: 'MY_CHANNEL' }, '@my_channel'), true);
  assert.strictEqual(isExpectedChannel({ username: 'my_channel' }, '@MY_CHANNEL'), true);
  assert.strictEqual(isExpectedChannel({ username: 'my_channel' }, '  @my_channel  '), true);

  // Mismatches
  assert.strictEqual(isExpectedChannel({ id: -100123, username: 'other_channel' }, '-100999'), false);
  assert.strictEqual(isExpectedChannel({ id: -100123, username: 'other_channel' }, '@my_channel'), false);

  // Handles nullish or missing chat objects gracefully when expectedChannelId is present
  assert.strictEqual(isExpectedChannel(null, '-100123'), false);
  assert.strictEqual(isExpectedChannel(undefined, '-100123'), false);
  assert.strictEqual(isExpectedChannel({}, '-100123'), false);
});

test('trimExtension', (t) => {
  // Removes extension and replaces underscores/hyphens with spaces
  assert.strictEqual(trimExtension('song.mp3'), 'song');
  assert.strictEqual(trimExtension('track_title_01.flac'), 'track title 01');
  assert.strictEqual(trimExtension('artist-name---song.wav'), 'artist name song');
  assert.strictEqual(trimExtension('my_cool-track_name.ogg'), 'my cool track name');

  // Handles multiple dots in filename
  assert.strictEqual(trimExtension('track.v1.0.mp3'), 'track.v1.0');

  // Handles filenames without extension
  assert.strictEqual(trimExtension('no_extension'), 'no extension');
  assert.strictEqual(trimExtension('simple-file'), 'simple file');

  // Handles edge cases: empty strings, nullish defaults, whitespace
  assert.strictEqual(trimExtension(''), '');
  assert.strictEqual(trimExtension(), '');
  assert.strictEqual(trimExtension('   spaced_file.mp3   '), 'spaced file');
  assert.strictEqual(trimExtension('---___'), '');
});

test('handler - HTTP method validation', async (t) => {
  const req = { method: 'POST' };
  const res = createMockRes();

  await handler(req, res);

  assert.strictEqual(res.statusCode, 405);
  assert.strictEqual(res.headers['allow'], 'GET');
  assert.deepStrictEqual(res.body, { error: 'Method not allowed.' });
});

test('handler - refresh parameter works without authorization header and respects 30s cooldown', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const originalChannelId = process.env.TELEGRAM_CHANNEL_ID;
  const originalRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  process.env.TELEGRAM_BOT_TOKEN = 'mock-bot-token';
  process.env.TELEGRAM_CHANNEL_ID = 'mock-channel';
  process.env.UPSTASH_REDIS_REST_URL = 'https://mock.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-redis-token';

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalBotToken) process.env.TELEGRAM_BOT_TOKEN = originalBotToken; else delete process.env.TELEGRAM_BOT_TOKEN;
    if (originalChannelId) process.env.TELEGRAM_CHANNEL_ID = originalChannelId; else delete process.env.TELEGRAM_CHANNEL_ID;
    if (originalRedisUrl) process.env.UPSTASH_REDIS_REST_URL = originalRedisUrl; else delete process.env.UPSTASH_REDIS_REST_URL;
    if (originalRedisToken) process.env.UPSTASH_REDIS_REST_TOKEN = originalRedisToken; else delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  let mockLastRun = null;
  let mockCatalog = [{ file_id: 's1', title: 'Song 1', performer: 'Artist 1', duration: 100 }];
  let telegramCalled = false;

  globalThis.fetch = async (url, options = {}) => {
    const urlString = String(url);

    // Mock Upstash calls
    if (urlString.includes('mock.upstash.io')) {
      const body = JSON.parse(options.body || '[]');
      const command = body[0];
      const key = body[1];

      if (command === 'GET') {
        if (key === 'murex:refresh:lastrun') {
          return { ok: true, json: async () => ({ result: mockLastRun ? String(mockLastRun) : null }) };
        }
        if (key === 'murex:catalog') {
          return { ok: true, json: async () => ({ result: JSON.stringify(mockCatalog) }) };
        }
        if (key === 'murex:offset') {
          return { ok: true, json: async () => ({ result: '0' }) };
        }
      }
      if (command === 'SET') {
        if (key === 'murex:refresh:lastrun') {
          mockLastRun = parseInt(body[2], 10);
          return { ok: true, json: async () => ({ result: 'OK' }) };
        }
        if (key === 'murex:catalog' || key === 'murex:offset') {
          return { ok: true, json: async () => ({ result: 'OK' }) };
        }
      }
    }

    // Mock Telegram getUpdates calls
    if (urlString.includes('api.telegram.org')) {
      telegramCalled = true;
      return {
        ok: true,
        json: async () => ({ ok: true, result: [] })
      };
    }

    return { ok: false, status: 404, json: async () => ({}) };
  };

  // 1. Initial refresh call with no Authorization header -> runs sync, sets lastrun timestamp, throttled: false
  {
    telegramCalled = false;
    const req = { method: 'GET', query: { refresh: '1' }, headers: {} };
    const res = createMockRes();

    await handler(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(telegramCalled, true);
    assert.strictEqual(res.body.throttled, false);
    assert.strictEqual(Array.isArray(res.body), true);
    assert.ok(mockLastRun > 0);
  }

  // 2. Second refresh call immediately after -> throttled: true, no Telegram call made
  {
    telegramCalled = false;
    const req = { method: 'GET', query: { refresh: '1' }, headers: {} };
    const res = createMockRes();

    await handler(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(telegramCalled, false);
    assert.strictEqual(res.body.throttled, true);
    assert.strictEqual(Array.isArray(res.body), true);
  }

  // 3. Normal GET /api/songs -> does not include throttled field
  {
    telegramCalled = false;
    const req = { method: 'GET', query: {}, headers: {} };
    const res = createMockRes();

    await handler(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(telegramCalled, false);
    assert.strictEqual(res.body.throttled, undefined);
    assert.strictEqual(Array.isArray(res.body), true);
  }
});
