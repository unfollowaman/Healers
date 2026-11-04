import test from 'node:test';
import assert from 'node:assert';
import { EventEmitter } from 'node:events';
import handler, {
  validateFileId,
  getTelegramFile,
  resolveTelegramFilePath,
  parseRangeHeader,
  getAudioContentType,
  filePathCache,
  clearFilePathCache
} from '../api/stream.js';

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
      assert.strictEqual(err.statusCode, 404);
      assert.strictEqual(err.errorCode, 'not_found');
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

test('parseRangeHeader - correctly parses valid range formats and flags invalid/unsatisfiable ranges', () => {
  assert.strictEqual(parseRangeHeader(null, 1000), null);
  assert.deepStrictEqual(parseRangeHeader('bytes=0-499', 1000), { start: 0, end: 499 });
  assert.deepStrictEqual(parseRangeHeader('bytes=500-', 1000), { start: 500, end: 999 });
  assert.deepStrictEqual(parseRangeHeader('bytes=-200', 1000), { start: 800, end: 999 });
  assert.deepStrictEqual(parseRangeHeader('bytes=1500-', 1000), { unsatisfiable: true });
  assert.deepStrictEqual(parseRangeHeader('bytes=500-200', 1000), { invalid: true });
  assert.deepStrictEqual(parseRangeHeader('bytes=-0', 1000), { invalid: true });
  assert.deepStrictEqual(parseRangeHeader('invalid-range', 1000), { invalid: true });
});

test('getAudioContentType - returns upstream audio type or infers from file extension', () => {
  assert.strictEqual(getAudioContentType('audio/ogg', 'music/track.mp3'), 'audio/ogg');
  assert.strictEqual(getAudioContentType('application/octet-stream', 'music/track.mp3'), 'audio/mpeg');
  assert.strictEqual(getAudioContentType(null, 'music/track.m4a'), 'audio/mp4');
  assert.strictEqual(getAudioContentType(null, 'music/track.flac'), 'audio/flac');
  assert.strictEqual(getAudioContentType(null, 'music/track.wav'), 'audio/wav');
  assert.strictEqual(getAudioContentType(null, 'music/track.ogg'), 'audio/ogg');
  assert.strictEqual(getAudioContentType(null, 'music/track.xyz'), 'audio/mpeg');
});

test('filePathCache - caches path for 30 minutes and clears on invalidation', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
    clearFilePathCache();
  });

  clearFilePathCache();
  let fetchCount = 0;
  globalThis.fetch = async () => {
    fetchCount++;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        result: { file_id: 'cache_test_id', file_path: 'tracks/song.mp3' }
      })
    };
  };

  const path1 = await resolveTelegramFilePath('fake-token', 'cache_test_id');
  const path2 = await resolveTelegramFilePath('fake-token', 'cache_test_id');
  assert.strictEqual(path1, 'tracks/song.mp3');
  assert.strictEqual(path2, 'tracks/song.mp3');
  assert.strictEqual(fetchCount, 1, 'Second call should use cached file path');
});

test('handler - returns 503 with Retry-After when Telegram responds 429', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  process.env.TELEGRAM_BOT_TOKEN = 'mock-token';
  globalThis.fetch = async () => ({
    status: 429,
    ok: false,
    json: async () => ({ ok: false, parameters: { retry_after: 15 } })
  });

  let statusCode = 0;
  let jsonBody = null;
  const headers = {};
  const res = {
    status(code) { statusCode = code; return this; },
    json(body) { jsonBody = body; return this; },
    setHeader(k, v) { headers[k] = v; },
    destroy() {}
  };

  await handler({
    method: 'GET',
    query: { file_id: '1234567890' },
    headers: {}
  }, res);

  assert.strictEqual(statusCode, 503);
  assert.strictEqual(headers['Retry-After'], 15);
  assert.deepStrictEqual(jsonBody, { error: 'rate_limited' });
});

test('handler - returns 404 not_found when Telegram responds 400', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  process.env.TELEGRAM_BOT_TOKEN = 'mock-token';
  globalThis.fetch = async () => ({
    status: 400,
    ok: false,
    json: async () => ({ ok: false, description: 'Bad Request: file_id invalid' })
  });

  let statusCode = 0;
  let jsonBody = null;
  const res = {
    status(code) { statusCode = code; return this; },
    json(body) { jsonBody = body; return this; },
    setHeader() {},
    destroy() {}
  };

  await handler({
    method: 'GET',
    query: { file_id: '1234567890' },
    headers: {}
  }, res);

  assert.strictEqual(statusCode, 404);
  assert.deepStrictEqual(jsonBody, { error: 'not_found' });
});

test('handler - handles 206 upstream response and passes through range and headers', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
    clearFilePathCache();
  });

  clearFilePathCache();
  process.env.TELEGRAM_BOT_TOKEN = 'mock-token';

  globalThis.fetch = async (url) => {
    const urlStr = url.toString();
    if (urlStr.includes('getFile')) {
      return {
        status: 200,
        ok: true,
        json: async () => ({ ok: true, result: { file_path: 'tracks/song.mp3' } })
      };
    }
    return {
      status: 206,
      ok: true,
      headers: new Headers({
        'content-range': 'bytes 0-3/10',
        'content-length': '4',
        'content-type': 'audio/mpeg',
        'accept-ranges': 'bytes'
      }),
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(Buffer.from('0123'));
          controller.close();
        }
      })
    };
  };

  class MockRes extends EventEmitter {
    constructor() {
      super();
      this.statusCode = 200;
      this.headers = {};
      this.chunks = [];
    }
    status(code) { this.statusCode = code; return this; }
    setHeader(k, v) { this.headers[k] = v; }
    write(c) { this.chunks.push(c); return true; }
    end(c) { if (c) this.chunks.push(c); this.emit('finish'); return this; }
  }

  const res = new MockRes();
  await handler({
    method: 'GET',
    query: { file_id: '1234567890' },
    headers: { range: 'bytes=0-3' }
  }, res);

  assert.strictEqual(res.statusCode, 206);
  assert.strictEqual(res.headers['Content-Range'], 'bytes 0-3/10');
  assert.strictEqual(res.headers['Content-Length'], '4');
  assert.strictEqual(res.headers['Accept-Ranges'], 'bytes');
  assert.strictEqual(res.headers['Cache-Control'], 'private, max-age=3600');
  assert.strictEqual(Buffer.concat(res.chunks).toString(), '0123');
});

test('handler - slices 200 upstream response into 206 when Range header is provided', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
    clearFilePathCache();
  });

  clearFilePathCache();
  process.env.TELEGRAM_BOT_TOKEN = 'mock-token';

  globalThis.fetch = async (url) => {
    const urlStr = url.toString();
    if (urlStr.includes('getFile')) {
      return {
        status: 200,
        ok: true,
        json: async () => ({ ok: true, result: { file_path: 'tracks/song.mp3' } })
      };
    }
    return {
      status: 200,
      ok: true,
      headers: new Headers({
        'content-length': '10',
        'content-type': 'audio/mpeg',
        'accept-ranges': 'bytes'
      }),
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(Buffer.from('0123456789'));
          controller.close();
        }
      })
    };
  };

  class MockRes extends EventEmitter {
    constructor() {
      super();
      this.statusCode = 200;
      this.headers = {};
      this.chunks = [];
    }
    status(code) { this.statusCode = code; return this; }
    setHeader(k, v) { this.headers[k] = v; }
    write(c) { this.chunks.push(c); return true; }
    end(c) { if (c) this.chunks.push(c); this.emit('finish'); return this; }
  }

  const res = new MockRes();
  await handler({
    method: 'GET',
    query: { file_id: '1234567890' },
    headers: { range: 'bytes=2-6' }
  }, res);

  assert.strictEqual(res.statusCode, 206);
  assert.strictEqual(res.headers['Content-Range'], 'bytes 2-6/10');
  assert.strictEqual(res.headers['Content-Length'], 5);
  assert.strictEqual(Buffer.concat(res.chunks).toString(), '23456');
});

test('handler - returns 416 on unsatisfiable Range header', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
    clearFilePathCache();
  });

  clearFilePathCache();
  process.env.TELEGRAM_BOT_TOKEN = 'mock-token';

  globalThis.fetch = async (url) => {
    const urlStr = url.toString();
    if (urlStr.includes('getFile')) {
      return {
        status: 200,
        ok: true,
        json: async () => ({ ok: true, result: { file_path: 'tracks/song.mp3' } })
      };
    }
    return {
      status: 200,
      ok: true,
      headers: new Headers({
        'content-length': '10',
        'content-type': 'audio/mpeg'
      }),
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(Buffer.from('0123456789'));
          controller.close();
        }
      })
    };
  };

  let statusCode = 0;
  const headers = {};
  const res = {
    status(code) { statusCode = code; return this; },
    setHeader(k, v) { headers[k] = v; },
    end() { return this; }
  };

  await handler({
    method: 'GET',
    query: { file_id: '1234567890' },
    headers: { range: 'bytes=100-' }
  }, res);

  assert.strictEqual(statusCode, 416);
  assert.strictEqual(headers['Content-Range'], 'bytes */10');
});

test('handler - retries getFile once if cached path returns 404', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
    clearFilePathCache();
  });

  clearFilePathCache();
  process.env.TELEGRAM_BOT_TOKEN = 'mock-token';

  let getFileCalls = 0;
  let downloadCalls = 0;

  globalThis.fetch = async (url) => {
    const urlStr = url.toString();
    if (urlStr.includes('getFile')) {
      getFileCalls++;
      return {
        status: 200,
        ok: true,
        json: async () => ({ ok: true, result: { file_path: 'fresh/song.mp3' } })
      };
    }
    downloadCalls++;
    if (downloadCalls === 1) {
      return {
        status: 404,
        ok: false,
        headers: new Headers(),
        json: async () => ({})
      };
    }
    return {
      status: 200,
      ok: true,
      headers: new Headers({
        'content-length': '5',
        'content-type': 'audio/mpeg'
      }),
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(Buffer.from('hello'));
          controller.close();
        }
      })
    };
  };

  class MockRes extends EventEmitter {
    constructor() {
      super();
      this.statusCode = 200;
      this.headers = {};
    }
    status(code) { this.statusCode = code; return this; }
    setHeader(k, v) { this.headers[k] = v; }
    write() { return true; }
    end() { this.emit('finish'); return this; }
  }

  // Pre-seed cache with stale path
  filePathCache.set('1234567890', { filePath: 'stale/song.mp3', fetchedAt: Date.now() });

  const res = new MockRes();
  await handler({
    method: 'GET',
    query: { file_id: '1234567890' },
    headers: {}
  }, res);

  assert.strictEqual(getFileCalls, 1, 'Should call getFile once on cache eviction');
  assert.strictEqual(downloadCalls, 2, 'Should attempt download with stale path then retry with fresh path');
  assert.strictEqual(res.statusCode, 200);
});
