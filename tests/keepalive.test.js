import test from 'node:test';
import assert from 'node:assert';
import handler from '../api/cron/keepalive.js';

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

test('keepalive handler - rejects request without valid CRON_SECRET authorization', async (t) => {
  const originalSecret = process.env.CRON_SECRET;
  try {
    process.env.CRON_SECRET = 'valid_cron_secret_123';

    // No header
    const res1 = createMockRes();
    await handler({ headers: {} }, res1);
    assert.strictEqual(res1.statusCode, 401);
    assert.deepStrictEqual(res1.body, { error: 'Unauthorized' });

    // Invalid bearer token
    const res2 = createMockRes();
    await handler({ headers: { authorization: 'Bearer wrong_token' } }, res2);
    assert.strictEqual(res2.statusCode, 401);
    assert.deepStrictEqual(res2.body, { error: 'Unauthorized' });
  } finally {
    process.env.CRON_SECRET = originalSecret;
  }
});

test('keepalive handler - returns 500 when Upstash credentials are missing', async (t) => {
  const originalSecret = process.env.CRON_SECRET;
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const originalError = console.error;

  try {
    console.error = () => {};
    process.env.CRON_SECRET = 'test_secret';
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const res = createMockRes();
    await handler({ headers: { authorization: 'Bearer test_secret' } }, res);
    assert.strictEqual(res.statusCode, 500);
    assert.deepStrictEqual(res.body, { error: 'Server misconfiguration' });
  } finally {
    console.error = originalError;
    process.env.CRON_SECRET = originalSecret;
    process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
  }
});

test('keepalive handler - handles Upstash API error and returns 503', async (t) => {
  const originalSecret = process.env.CRON_SECRET;
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const originalFetch = globalThis.fetch;
  const originalError = console.error;

  try {
    console.error = () => {};
    process.env.CRON_SECRET = 'test_secret';
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-redis.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake_token';

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ error: 'ERR max daily commands reached' })
    });

    const res = createMockRes();
    await handler({ headers: { authorization: 'Bearer test_secret' } }, res);
    assert.strictEqual(res.statusCode, 503);
    assert.strictEqual(res.body.error, 'Upstash keepalive failed');
    assert.strictEqual(res.body.detail, 'ERR max daily commands reached');
  } finally {
    console.error = originalError;
    process.env.CRON_SECRET = originalSecret;
    process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
    globalThis.fetch = originalFetch;
  }
});

test('keepalive handler - successfully records keepalive timestamp and returns 200', async (t) => {
  const originalSecret = process.env.CRON_SECRET;
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const originalFetch = globalThis.fetch;

  try {
    process.env.CRON_SECRET = 'test_secret';
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-redis.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake_token';

    let interceptedBody = null;
    globalThis.fetch = async (url, opts) => {
      interceptedBody = JSON.parse(opts.body);
      return {
        ok: true,
        json: async () => ({ result: 'OK' })
      };
    };

    const res = createMockRes();
    await handler({ headers: { authorization: 'Bearer test_secret' } }, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.key, 'murex:keepalive');
    assert.ok(res.body.timestamp);
    assert.strictEqual(interceptedBody[0], 'SET');
    assert.strictEqual(interceptedBody[1], 'murex:keepalive');
  } finally {
    process.env.CRON_SECRET = originalSecret;
    process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
    globalThis.fetch = originalFetch;
  }
});
