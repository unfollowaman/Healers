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

test('handler - refresh parameter requires authentication', async (t) => {
  const originalSecret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = 'test-cron-secret-123';

  t.after(() => {
    if (originalSecret !== undefined) {
      process.env.CRON_SECRET = originalSecret;
    } else {
      delete process.env.CRON_SECRET;
    }
  });

  // Case 1: Missing Authorization header when refresh=1
  {
    const req = { method: 'GET', query: { refresh: '1' }, headers: {} };
    const res = createMockRes();

    await handler(req, res);

    assert.strictEqual(res.statusCode, 401);
    assert.deepStrictEqual(res.body, { error: 'Unauthorized' });
  }

  // Case 2: Incorrect Authorization header when refresh=1
  {
    const req = {
      method: 'GET',
      query: { refresh: '1' },
      headers: { authorization: 'Bearer wrong-secret' }
    };
    const res = createMockRes();

    await handler(req, res);

    assert.strictEqual(res.statusCode, 401);
    assert.deepStrictEqual(res.body, { error: 'Unauthorized' });
  }

  // Case 3: Missing CRON_SECRET in environment
  {
    delete process.env.CRON_SECRET;
    const req = {
      method: 'GET',
      query: { refresh: '1' },
      headers: { authorization: 'Bearer test-cron-secret-123' }
    };
    const res = createMockRes();

    await handler(req, res);

    assert.strictEqual(res.statusCode, 401);
    assert.deepStrictEqual(res.body, { error: 'Unauthorized' });
  }
});
