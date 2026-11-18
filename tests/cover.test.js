import test from 'node:test';
import assert from 'node:assert';
import handler from '../api/cover.js';

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    ended: false,
    headersSent: false,
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
    },
    end() {
      res.ended = true;
      return res;
    }
  };
  return res;
}

test('cover handler - rejects unsupported HTTP methods', async (t) => {
  const invalidMethods = ['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
  for (const method of invalidMethods) {
    const res = createMockRes();
    await handler({ method }, res);
    assert.strictEqual(res.statusCode, 405);
    assert.strictEqual(res.headers.allow, 'GET, HEAD');
    assert.deepStrictEqual(res.body, { error: 'Method not allowed.' });
  }
});

test('cover handler - returns 500 when TELEGRAM_BOT_TOKEN is missing', async (t) => {
  const originalToken = process.env.TELEGRAM_BOT_TOKEN;
  try {
    delete process.env.TELEGRAM_BOT_TOKEN;
    const res = createMockRes();
    await handler({ method: 'GET', query: { file_id: 'valid_file_id_12345' } }, res);
    assert.strictEqual(res.statusCode, 500);
    assert.match(res.body.error, /TELEGRAM_BOT_TOKEN is not configured/);
  } finally {
    process.env.TELEGRAM_BOT_TOKEN = originalToken;
  }
});

test('cover handler - validates file_id parameter and rejects invalid inputs', async (t) => {
  const originalToken = process.env.TELEGRAM_BOT_TOKEN;
  try {
    process.env.TELEGRAM_BOT_TOKEN = 'test_token';

    // Missing file_id
    const resMissing = createMockRes();
    await handler({ method: 'GET', query: {} }, resMissing);
    assert.strictEqual(resMissing.statusCode, 400);
    assert.match(resMissing.body.error, /Missing required file_id/);

    // Invalid format / length (< 10 chars)
    const resShort = createMockRes();
    await handler({ method: 'GET', query: { file_id: 'too_short' } }, resShort);
    assert.strictEqual(resShort.statusCode, 400);
    assert.match(resShort.body.error, /Invalid file_id/);
  } finally {
    process.env.TELEGRAM_BOT_TOKEN = originalToken;
  }
});

test('cover handler - returns 404 when Telegram getFile fails or returns no file_path', async (t) => {
  const originalToken = process.env.TELEGRAM_BOT_TOKEN;
  const originalFetch = globalThis.fetch;

  try {
    process.env.TELEGRAM_BOT_TOKEN = 'test_token';

    // Mock Telegram API failure
    globalThis.fetch = async () => ({
      ok: false,
      status: 400,
      json: async () => ({ ok: false, description: 'Bad Request: file is not found' })
    });

    const res = createMockRes();
    await handler({ method: 'GET', query: { file_id: 'valid_file_id_12345' } }, res);
    assert.strictEqual(res.statusCode, 404);
    assert.match(res.body.error, /Bad Request: file is not found/);
  } finally {
    process.env.TELEGRAM_BOT_TOKEN = originalToken;
    globalThis.fetch = originalFetch;
  }
});

test('cover handler - handles HEAD requests and sets immutable cache header', async (t) => {
  const originalToken = process.env.TELEGRAM_BOT_TOKEN;
  const originalFetch = globalThis.fetch;

  try {
    process.env.TELEGRAM_BOT_TOKEN = 'test_token';

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        result: {
          file_id: 'valid_file_id_12345',
          file_path: 'thumbnails/cover.jpg'
        }
      })
    });

    const res = createMockRes();
    await handler({ method: 'HEAD', query: { file_id: 'valid_file_id_12345' } }, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['cache-control'], 'public, max-age=604800, immutable');
    assert.strictEqual(res.ended, true);
  } finally {
    process.env.TELEGRAM_BOT_TOKEN = originalToken;
    globalThis.fetch = originalFetch;
  }
});
