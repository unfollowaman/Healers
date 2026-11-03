import test from 'node:test';
import assert from 'node:assert';
import { getCatalogFromStore, saveCatalogToStore, getLastRefreshTime, setLastRefreshTime } from '../api/_lib/catalogStore.js';

test('getCatalogFromStore - successfully reads catalog and offset in parallel', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  process.env.UPSTASH_REDIS_REST_URL = 'https://mock-upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';

  const requestedCommands = [];

  globalThis.fetch = async (url, options) => {
    assert.strictEqual(url, 'https://mock-upstash.io');
    assert.strictEqual(options.headers.Authorization, 'Bearer mock-token');

    const body = JSON.parse(options.body);
    requestedCommands.push(body[1]);

    if (body[1] === 'murex:catalog') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          result: JSON.stringify([{ file_id: 'song1', title: 'Test Song' }])
        })
      };
    } else if (body[1] === 'murex:offset') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          result: '42'
        })
      };
    }
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  });

  const { catalog, offset } = await getCatalogFromStore();

  assert.strictEqual(catalog.length, 1);
  assert.strictEqual(catalog[0].title, 'Test Song');
  assert.strictEqual(offset, 42);
  assert.ok(requestedCommands.includes('murex:catalog'));
  assert.ok(requestedCommands.includes('murex:offset'));
});

test('getCatalogFromStore - propagates custom statusCode 503 when Upstash returns error', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  process.env.UPSTASH_REDIS_REST_URL = 'https://mock-upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';

  globalThis.fetch = async () => {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        error: 'ERR Database is archived'
      })
    };
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  });

  await assert.rejects(
    async () => getCatalogFromStore(),
    (err) => {
      assert.strictEqual(err.statusCode, 503);
      assert.ok(err.message.includes('murex:catalog read failed'));
      return true;
    }
  );
});

test('saveCatalogToStore - successfully saves catalog and offset in parallel', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  process.env.UPSTASH_REDIS_REST_URL = 'https://mock-upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';

  const savedPayloads = {};

  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    const command = body[0];
    const key = body[1];
    const val = body[2];

    assert.strictEqual(command, 'SET');
    savedPayloads[key] = val;

    return {
      ok: true,
      status: 200,
      json: async () => ({ result: 'OK' })
    };
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  });

  const mockCatalog = [{ file_id: 'abc', title: 'Track 1' }];
  await saveCatalogToStore(mockCatalog, 100);

  assert.strictEqual(savedPayloads['murex:catalog'], JSON.stringify(mockCatalog));
  assert.strictEqual(savedPayloads['murex:offset'], '100');
});

test('saveCatalogToStore - propagates custom statusCode 503 when Upstash returns error', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  process.env.UPSTASH_REDIS_REST_URL = 'https://mock-upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';

  globalThis.fetch = async () => {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        error: 'ERR Write rejected'
      })
    };
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  });

  await assert.rejects(
    async () => saveCatalogToStore([], 0),
    (err) => {
      assert.strictEqual(err.statusCode, 503);
      assert.ok(err.message.includes('murex:catalog write failed'));
      return true;
    }
  );
});

test('getLastRefreshTime - returns timestamp when available', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  process.env.UPSTASH_REDIS_REST_URL = 'https://mock-upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';

  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    assert.strictEqual(body[0], 'GET');
    assert.strictEqual(body[1], 'murex:refresh:lastrun');
    return {
      ok: true,
      status: 200,
      json: async () => ({ result: '1700000000000' })
    };
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  });

  const timestamp = await getLastRefreshTime();
  assert.strictEqual(timestamp, 1700000000000);
});

test('getLastRefreshTime - returns 0 when credentials are missing or errors occur without warnings', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  const originalWarn = console.warn;

  let warnCallCount = 0;
  console.warn = () => { warnCallCount++; };

  t.after(() => {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
    console.warn = originalWarn;
  });

  // 1. Missing credentials
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  assert.strictEqual(await getLastRefreshTime(), 0);

  // 2. Fetch throws network error
  process.env.UPSTASH_REDIS_REST_URL = 'https://mock-upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';
  globalThis.fetch = async () => {
    throw new Error('Network failure');
  };
  assert.strictEqual(await getLastRefreshTime(), 0);

  // 3. Response not ok
  globalThis.fetch = async () => ({
    ok: false,
    status: 500
  });
  assert.strictEqual(await getLastRefreshTime(), 0);

  // 4. Response contains error
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ error: 'Some Redis error' })
  });
  assert.strictEqual(await getLastRefreshTime(), 0);

  // Ensure no console.warn was triggered during failures
  assert.strictEqual(warnCallCount, 0, 'No console.warn should be emitted by getLastRefreshTime');
});

test('setLastRefreshTime - successfully writes timestamp and handles errors silently', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  const originalWarn = console.warn;

  let warnCallCount = 0;
  console.warn = () => { warnCallCount++; };

  let recordedBody = null;

  globalThis.fetch = async (url, options) => {
    recordedBody = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({ result: 'OK' })
    };
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
    console.warn = originalWarn;
  });

  // 1. Successful write
  process.env.UPSTASH_REDIS_REST_URL = 'https://mock-upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';

  await setLastRefreshTime(1700000000000);
  assert.deepStrictEqual(recordedBody, ['SET', 'murex:refresh:lastrun', '1700000000000']);

  // 2. Missing credentials (no throw, no warn)
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  await assert.doesNotReject(async () => setLastRefreshTime(1700000000000));

  // 3. Network error (no throw, no warn)
  process.env.UPSTASH_REDIS_REST_URL = 'https://mock-upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';
  globalThis.fetch = async () => {
    throw new Error('Connection refused');
  };
  await assert.doesNotReject(async () => setLastRefreshTime(1700000000000));

  // 4. Upstash returns error payload (no throw, no warn)
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ error: 'ERR write error' })
  });
  await assert.doesNotReject(async () => setLastRefreshTime(1700000000000));

  assert.strictEqual(warnCallCount, 0, 'No console.warn should be emitted by setLastRefreshTime');
});

test('performance benchmark: sequential vs parallel store fetches', async (t) => {
  const simulatedNetworkDelayMs = 20;

  const mockFetchDelay = () => new Promise((resolve) => setTimeout(resolve, simulatedNetworkDelayMs));

  // Benchmark sequential fetches
  const startSeq = performance.now();
  await mockFetchDelay(); // get catalog
  await mockFetchDelay(); // get offset
  const durationSeq = performance.now() - startSeq;

  // Benchmark parallel fetches
  const startPar = performance.now();
  await Promise.all([mockFetchDelay(), mockFetchDelay()]);
  const durationPar = performance.now() - startPar;

  assert.ok(durationPar < durationSeq, 'Parallel requests must complete faster than sequential requests');
  console.log(`[Benchmark] Upstash sequential requests: ${durationSeq.toFixed(2)}ms | Parallel requests: ${durationPar.toFixed(2)}ms (${((1 - durationPar / durationSeq) * 100).toFixed(1)}% latency reduction)`);
});
