import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('build check - JSON configuration files parse correctly', () => {
  const jsonFiles = [
    'package.json',
    'package-lock.json',
    'vercel.json',
    'manifest.webmanifest',
    'favicons/site.webmanifest'
  ];

  for (const relPath of jsonFiles) {
    const fullPath = path.join(process.cwd(), relPath);
    assert.ok(fs.existsSync(fullPath), `File ${relPath} must exist`);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.doesNotThrow(() => JSON.parse(content), `File ${relPath} must be valid JSON`);
  }
});

test('build check - package.json and engines constraints', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.strictEqual(pkg.type, 'module', 'Package type must be module');
  assert.ok(pkg.engines?.node, 'Engine node requirement must be specified');
  assert.strictEqual(pkg.dependencies, undefined, 'Must maintain zero runtime dependencies');
});

test('build check - vercel.json configuration integrity', () => {
  const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  assert.strictEqual(vercelConfig.version, 2);
  assert.ok(Array.isArray(vercelConfig.crons), 'Crons must be configured');
  assert.strictEqual(vercelConfig.crons[0].path, '/api/cron/keepalive');
  assert.strictEqual(vercelConfig.crons[0].schedule, '0 3 * * *');
  assert.ok(Array.isArray(vercelConfig.redirects), 'Redirects must be configured');
});

test('build check - HTML referenced stylesheet and script assets exist on disk', () => {
  const html = fs.readFileSync('index.html', 'utf8');

  // Match href and src attributes pointing to local assets
  const assetRegex = /(?:href|src)=["'](\/(?:css|js|favicons)[^"']+)["']/g;
  let match;
  let count = 0;

  while ((match = assetRegex.exec(html)) !== null) {
    const assetUrl = match[1];
    const localPath = path.join(process.cwd(), assetUrl.replace(/^\//, ''));
    assert.ok(fs.existsSync(localPath), `Referenced asset ${assetUrl} must exist on disk`);
    const stats = fs.statSync(localPath);
    assert.ok(stats.size > 0, `Referenced asset ${assetUrl} must not be empty`);
    count++;
  }

  assert.ok(count >= 7, `Expected at least 7 local assets in index.html, found ${count}`);
});

test('build check - PWA manifest icons exist and have non-zero size', () => {
  const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0, 'Manifest must declare icons');

  for (const icon of manifest.icons) {
    const iconPath = path.join(process.cwd(), icon.src.replace(/^\//, ''));
    assert.ok(fs.existsSync(iconPath), `Manifest icon ${icon.src} must exist`);
    assert.ok(fs.statSync(iconPath).size > 0, `Manifest icon ${icon.src} must not be empty`);
  }
});

test('build check - all serverless and client ES modules import and resolve cleanly', async () => {
  const modules = [
    '../js/app.js',
    '../js/search.js',
    '../api/_lib/utils.js',
    '../api/_lib/catalogStore.js',
    '../api/_lib/telegram.js',
    '../api/songs.js',
    '../api/stream.js',
    '../api/cover.js',
    '../api/cron/keepalive.js'
  ];

  for (const mod of modules) {
    const loaded = await import(mod);
    assert.ok(loaded, `Module ${mod} must import successfully`);
  }
});

test('build check - device-crt visualizer runs cleanly across idle, play transitions, and pattern rotations without halting', () => {
  const code = fs.readFileSync('js/device-crt.js', 'utf8');
  const audioListeners = {};
  const rafCallbacks = [];
  const loopErrors = [];

  const originalWindow = global.window;
  const originalDocument = global.document;
  const originalRaf = global.requestAnimationFrame;
  const originalCaf = global.cancelAnimationFrame;
  const originalWarn = console.warn;

  try {
    global.window = {
      devicePixelRatio: 2,
      matchMedia: () => ({ matches: false, addEventListener: () => {} }),
      addEventListener: () => {}
    };
    global.document = {
      readyState: 'complete',
      querySelector: (sel) => {
        if (sel === '#crt-screen') {
          return {
            getContext: () => ({
              fillRect: () => {},
              beginPath: () => {},
              arc: () => {},
              fill: () => {}
            }),
            getBoundingClientRect: () => ({ width: 600, height: 360 })
          };
        }
        if (sel === '#audio-player') {
          return {
            addEventListener: (ev, cb) => { audioListeners[ev] = cb; },
            src: 'stream.mp3'
          };
        }
        return null;
      },
      addEventListener: () => {}
    };
    global.requestAnimationFrame = (cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    };
    global.cancelAnimationFrame = () => {};

    console.warn = (...args) => {
      const msg = args.join(' ');
      if (msg.includes('CRT Screen loop halted')) {
        loopErrors.push(msg);
      }
    };

    // Execute IIFE
    new Function(code)();

    let t = 0;
    // Step 1: Idle state simulation (10 seconds)
    for (let i = 0; i < 300; i++) {
      t += 33.3;
      const cbs = rafCallbacks.slice();
      rafCallbacks.length = 0;
      for (const cb of cbs) cb(t);
    }

    // Step 2: Song begins (emptied -> play events)
    if (audioListeners['emptied']) audioListeners['emptied']();
    if (audioListeners['play']) audioListeners['play']();

    // Step 3: Play state simulation across multiple pattern transitions (30 seconds)
    for (let i = 0; i < 900; i++) {
      t += 33.3;
      const cbs = rafCallbacks.slice();
      rafCallbacks.length = 0;
      for (const cb of cbs) cb(t);
    }

    // Step 4: Pause and resume simulation
    if (audioListeners['pause']) audioListeners['pause']();
    for (let i = 0; i < 60; i++) {
      t += 33.3;
      const cbs = rafCallbacks.slice();
      rafCallbacks.length = 0;
      for (const cb of cbs) cb(t);
    }

    if (audioListeners['playing']) audioListeners['playing']();
    for (let i = 0; i < 60; i++) {
      t += 33.3;
      const cbs = rafCallbacks.slice();
      rafCallbacks.length = 0;
      for (const cb of cbs) cb(t);
    }

    assert.strictEqual(loopErrors.length, 0, `Expected 0 loop errors, got: ${loopErrors.join(', ')}`);
    assert.ok(rafCallbacks.length > 0, 'Animation loop must remain active and scheduled');
  } finally {
    global.window = originalWindow;
    global.document = originalDocument;
    global.requestAnimationFrame = originalRaf;
    global.cancelAnimationFrame = originalCaf;
    console.warn = originalWarn;
  }
});
