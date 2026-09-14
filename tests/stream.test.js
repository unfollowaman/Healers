import test from 'node:test';
import assert from 'node:assert';
import { validateFileId, getTelegramFile } from '../api/stream.js';

test('validateFileId - valid file IDs', (t) => {
  // Valid alphanumeric and hyphenated strings between 10 and 512 characters
  assert.doesNotThrow(() => validateFileId('1234567890'));
  assert.doesNotThrow(() => validateFileId('A_valid_telegram_file_id-1234567890'));
  assert.doesNotThrow(() => validateFileId('a'.repeat(10)));
  assert.doesNotThrow(() => validateFileId('a'.repeat(512)));
});

test('validateFileId - missing or non-string file IDs', (t) => {
  const invalidInputs = [
    null,
    undefined,
    '',
    1234567890,
    {},
    [],
    true,
    false
  ];

  for (const input of invalidInputs) {
    assert.throws(
      () => validateFileId(input),
      (err) => {
        assert.strictEqual(err.message, 'Missing required file_id query parameter.');
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );
  }
});

test('getTelegramFile - successful resolution', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (url, options) => {
    assert.strictEqual(options.headers.Accept, 'application/json');
    assert.ok(url.toString().includes('getFile'));
    assert.ok(url.toString().includes('file_id=valid_file_id'));

    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        result: {
          file_id: 'valid_file_id',
          file_path: 'music/track.mp3'
        }
      })
    };
  };

  const result = await getTelegramFile('fake-token', 'valid_file_id');
  assert.deepStrictEqual(result, {
    file_id: 'valid_file_id',
    file_path: 'music/track.mp3'
  });
});

test('getTelegramFile - HTTP error response', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () => ({
    ok: false,
    status: 500,
    json: async () => ({
      ok: false,
      description: 'Internal Server Error'
    })
  });

  await assert.rejects(
    async () => getTelegramFile('fake-token', 'valid_file_id'),
    (err) => {
      assert.strictEqual(err.message, 'Internal Server Error');
      assert.strictEqual(err.statusCode, 500);
      return true;
    }
  );
});

test('getTelegramFile - Telegram API error (ok: false)', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () => ({
    ok: false,
    status: 400,
    json: async () => ({
      ok: false,
      description: 'Bad Request: file_id invalid'
    })
  });

  await assert.rejects(
    async () => getTelegramFile('fake-token', 'invalid_id'),
    (err) => {
      assert.strictEqual(err.message, 'Bad Request: file_id invalid');
      assert.strictEqual(err.statusCode, 400);
      return true;
    }
  );
});

test('getTelegramFile - invalid JSON or empty error response', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () => ({
    ok: false,
    status: 502,
    json: async () => {
      throw new Error('Invalid JSON');
    }
  });

  await assert.rejects(
    async () => getTelegramFile('fake-token', 'valid_file_id'),
    (err) => {
      assert.strictEqual(err.message, 'Unable to resolve Telegram file.');
      assert.strictEqual(err.statusCode, 502);
      return true;
    }
  );
});

test('getTelegramFile - missing file_path in result', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      ok: true,
      result: {}
    })
  });

  await assert.rejects(
    async () => getTelegramFile('fake-token', 'valid_file_id'),
    (err) => {
      assert.strictEqual(err.message, 'Telegram did not return a downloadable file path.');
      assert.strictEqual(err.statusCode, 502);
      return true;
    }
  );
});

test('validateFileId - invalid string formats or lengths', (t) => {
  const invalidStrings = [
    'short',               // Less than 10 chars (length 5)
    '123456789',           // 9 chars
    'a'.repeat(513),       // More than 512 chars
    'invalid file id!',    // Contains spaces and exclamation mark
    'file_id_with_$pecial',// Contains disallowed symbol $
    'file_id/with/slash',  // Contains slashes
    'file_id_with.dot'     // Contains dots
  ];

  for (const str of invalidStrings) {
    assert.throws(
      () => validateFileId(str),
      (err) => {
        assert.strictEqual(err.message, 'Invalid file_id query parameter.');
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );
  }
});
