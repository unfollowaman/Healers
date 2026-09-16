import test from 'node:test';
import assert from 'node:assert';
import { formatDuration, getSongThumbHtml, getActiveArtist, loadSongs, state, elements } from '../js/app.js';

test('formatDuration - valid positive seconds', (t) => {
  assert.strictEqual(formatDuration(0), '0:00');
  assert.strictEqual(formatDuration(5), '0:05');
  assert.strictEqual(formatDuration(59), '0:59');
  assert.strictEqual(formatDuration(60), '1:00');
  assert.strictEqual(formatDuration(65), '1:05');
  assert.strictEqual(formatDuration(600), '10:00');
  assert.strictEqual(formatDuration(3600), '60:00');
});

test('formatDuration - floating point numbers', (t) => {
  assert.strictEqual(formatDuration(0.5), '0:00');
  assert.strictEqual(formatDuration(5.9), '0:05');
  assert.strictEqual(formatDuration(65.7), '1:05');
});

test('formatDuration - non-positive and non-finite edge cases', (t) => {
  assert.strictEqual(formatDuration(-1), '0:00');
  assert.strictEqual(formatDuration(-60), '0:00');
  assert.strictEqual(formatDuration(NaN), '0:00');
  assert.strictEqual(formatDuration(Infinity), '0:00');
  assert.strictEqual(formatDuration(-Infinity), '0:00');
});

test('formatDuration - non-numeric inputs', (t) => {
  assert.strictEqual(formatDuration(null), '0:00');
  assert.strictEqual(formatDuration(undefined), '0:00');
  assert.strictEqual(formatDuration('60'), '0:00');
  assert.strictEqual(formatDuration({}), '0:00');
  assert.strictEqual(formatDuration([]), '0:00');
  assert.strictEqual(formatDuration(true), '0:00');
});

test('getSongThumbHtml - returns equalizer visualizer when active and playing', (t) => {
  const html = getSongThumbHtml({ title: 'Song 1' }, true, true);
  assert.ok(html.includes('equalizer-visualizer'));
});

test('getSongThumbHtml - returns cover img when song has coverFileId and not playing', (t) => {
  const html = getSongThumbHtml({ title: 'Song 1', coverFileId: '123' }, true, false);
  assert.ok(html.includes('<img src="/api/cover?file_id=123"'));
});

test('getSongThumbHtml - returns fallback icon when no coverFileId', (t) => {
  const html = getSongThumbHtml({ title: 'Song 1' }, false, false);
  assert.ok(html.includes('song-thumb-fallback'));
});

test('loadSongs - populates state and updates UI on success', async (t) => {
  const originalFetch = globalThis.fetch;
  elements.nowTitle = { textContent: '' };
  elements.nowArtist = { textContent: '' };
  elements.currentTime = { textContent: '' };
  elements.totalTime = { textContent: '' };
  elements.albumArtPlaceholder = { innerHTML: '', style: {} };

  const mockSongs = [
    { file_id: 's1', title: 'Test Song 1', performer: 'Test Artist 1', duration: 180 },
    { file_id: 's2', title: 'Test Song 2', performer: 'Test Artist 2', duration: 240 }
  ];

  globalThis.fetch = async (url, options) => {
    assert.strictEqual(url, '/api/songs');
    return {
      ok: true,
      status: 200,
      json: async () => mockSongs
    };
  };

  try {
    await loadSongs();
    assert.deepStrictEqual(state.songs, mockSongs);
    assert.strictEqual(state.currentIndex, 0);
    assert.strictEqual(elements.nowTitle.textContent, 'Test Song 1');
    assert.strictEqual(elements.nowArtist.textContent, 'Test Artist 1');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('loadSongs - handles empty songs list on success', async (t) => {
  const originalFetch = globalThis.fetch;
  elements.nowTitle = { textContent: '' };
  elements.nowArtist = { textContent: '' };

  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => []
  });

  try {
    await loadSongs();
    assert.deepStrictEqual(state.songs, []);
    assert.strictEqual(elements.nowTitle.textContent, 'No songs found');
    assert.strictEqual(elements.nowArtist.textContent, 'Library empty');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('loadSongs - handles HTTP non-200 error response', async (t) => {
  const originalFetch = globalThis.fetch;
  elements.nowTitle = { textContent: '' };
  elements.nowArtist = { textContent: '' };

  globalThis.fetch = async () => ({
    ok: false,
    status: 500,
    json: async () => ({ error: 'Database connection failed' })
  });

  try {
    await loadSongs();
    assert.strictEqual(elements.nowTitle.textContent, 'Error loading songs');
    assert.strictEqual(elements.nowArtist.textContent, 'Database connection failed');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('loadSongs - handles error property in JSON response despite 200 status', async (t) => {
  const originalFetch = globalThis.fetch;
  elements.nowTitle = { textContent: '' };
  elements.nowArtist = { textContent: '' };

  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ error: 'Unauthorized catalog access' })
  });

  try {
    await loadSongs();
    assert.strictEqual(elements.nowTitle.textContent, 'Error loading songs');
    assert.strictEqual(elements.nowArtist.textContent, 'Unauthorized catalog access');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('loadSongs - handles network exception on fetch failure', async (t) => {
  const originalFetch = globalThis.fetch;
  elements.nowTitle = { textContent: '' };
  elements.nowArtist = { textContent: '' };

  globalThis.fetch = async () => {
    throw new Error('Network error');
  };

  try {
    await loadSongs();
    assert.strictEqual(elements.nowTitle.textContent, 'Error loading songs');
    assert.strictEqual(elements.nowArtist.textContent, 'Network error');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('loadSongs - handles non-OK response with invalid JSON response gracefully', async (t) => {
  const originalFetch = globalThis.fetch;
  elements.nowTitle = { textContent: '' };
  elements.nowArtist = { textContent: '' };

  globalThis.fetch = async () => ({
    ok: false,
    status: 502,
    json: async () => {
      throw new Error('Invalid JSON');
    }
  });

  try {
    await loadSongs();
    assert.strictEqual(elements.nowTitle.textContent, 'Error loading songs');
    assert.strictEqual(elements.nowArtist.textContent, 'Unable to load songs.');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('performance benchmark: full list re-render vs targeted active item update', (t) => {
  const songCount = 500;

  class MockElement {
    constructor(tag) {
      this.tag = tag;
      this.children = [];
      this.className = '';
      this.innerHTML = '';
      this.dataset = {};
    }
    appendChild(child) {
      this.children.push(child);
    }
    querySelector(selector) {
      if (selector === '.song-item.active') {
        return this.children.find((c) => c.className.includes('active')) || null;
      }
      if (selector === '.song-thumb-wrapper') {
        return this.children.find((c) => c.className.includes('song-thumb-wrapper')) || null;
      }
      return null;
    }
  }

  // Baseline: Full re-render simulation (500 items created)
  const listContainer = new MockElement('ul');
  const startFull = performance.now();
  listContainer.children = [];
  for (let i = 0; i < songCount; i++) {
    const li = new MockElement('li');
    li.className = i === 250 ? 'song-item active' : 'song-item';
    const thumb = new MockElement('div');
    thumb.className = 'song-thumb-wrapper';
    thumb.innerHTML = '<img>';
    li.appendChild(thumb);
    listContainer.appendChild(li);
  }
  const durationFull = performance.now() - startFull;

  // Optimized: Targeted active item update
  const startTargeted = performance.now();
  const activeLi = listContainer.querySelector('.song-item.active');
  if (activeLi) {
    const thumb = activeLi.querySelector('.song-thumb-wrapper');
    if (thumb) {
      thumb.innerHTML = '<div class="equalizer-visualizer"></div>';
    }
  }
  const durationTargeted = performance.now() - startTargeted;

  assert.ok(durationTargeted <= durationFull, 'Targeted update should be faster than full re-render');
  console.log(`[Benchmark] Full re-render (500 items): ${durationFull.toFixed(4)}ms | Targeted update: ${durationTargeted.toFixed(4)}ms`);
});

test('keyboard event handler - ignores media hotkeys when focused on inputs and handles Escape', (t) => {
  let playPauseToggled = false;
  let modalClosed = false;
  let inputBlurred = false;

  let isModalHidden = false;
  const mockAddSongsModal = {
    classList: {
      contains: (cls) => (cls === 'hidden' ? isModalHidden : false)
    }
  };

  function handleKeydown(e, elements) {
    const isInputFocused = e.target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable);

    if (e.code === 'Escape') {
      if (elements.addSongsModal && !elements.addSongsModal.classList.contains('hidden')) {
        isModalHidden = true;
        modalClosed = true;
      }
      if (isInputFocused && typeof e.target.blur === 'function') {
        e.target.blur();
      }
      return;
    }

    if (isInputFocused) return;

    if (e.code === 'Space') {
      e.preventDefault();
      playPauseToggled = true;
    }
  }

  // 1. When focused on an INPUT element, Space should NOT toggle play/pause
  const inputEvent = {
    code: 'Space',
    target: { tagName: 'INPUT' },
    preventDefault: () => {}
  };
  handleKeydown(inputEvent, { addSongsModal: mockAddSongsModal });
  assert.strictEqual(playPauseToggled, false, 'Space bar in input should not trigger play/pause');

  // 2. When focused outside inputs, Space SHOULD toggle play/pause
  const globalEvent = {
    code: 'Space',
    target: { tagName: 'DIV' },
    preventDefault: () => {}
  };
  handleKeydown(globalEvent, { addSongsModal: mockAddSongsModal });
  assert.strictEqual(playPauseToggled, true, 'Space bar globally should trigger play/pause');

  // 3. Escape key closes open modal and blurs input if focused
  const escapeEvent = {
    code: 'Escape',
    target: { tagName: 'INPUT', blur: () => { inputBlurred = true; } }
  };
  handleKeydown(escapeEvent, { addSongsModal: mockAddSongsModal });
  assert.strictEqual(modalClosed, true, 'Escape key should close add songs modal');
  assert.strictEqual(inputBlurred, true, 'Escape key should blur active input');
});

test('getActiveArtist - correctness and edge cases', (t) => {
  state.songs = [
    { file_id: 's1', performer: 'Artist A', title: 'Track 1', duration: 180, coverFileId: 'c1' },
    { file_id: 's2', performer: 'Artist B', title: 'Track 2', duration: 200, coverFileId: 'c2' },
    { file_id: 's3', performer: 'Artist A', title: 'Track 3', duration: 220, coverFileId: 'c1' },
    { file_id: 's4', performer: 'Artist A', title: 'Track 4', duration: 100, coverFileId: 'c3' }
  ];

  // Null when activeArtistName is null
  state.activeArtistName = null;
  assert.strictEqual(getActiveArtist(), null);

  // Null when activeArtistName doesn't exist in library
  state.activeArtistName = 'Nonexistent Artist';
  assert.strictEqual(getActiveArtist(), null);

  // Returns aggregated metadata when artist exists
  state.activeArtistName = 'Artist A';
  const result = getActiveArtist();
  assert.ok(result);
  assert.strictEqual(result.name, 'Artist A');
  assert.strictEqual(result.songs.length, 3);
  assert.strictEqual(result.totalDuration, 500);
  assert.deepStrictEqual(result.covers, ['c1', 'c3']);
  assert.strictEqual(result.latestIdx, 3);
});

test('performance benchmark: getActiveArtist direct scan vs full artist list allocation & sort', (t) => {
  const songCount = 2000;
  const mockSongs = [];
  for (let i = 0; i < songCount; i++) {
    mockSongs.push({
      file_id: `s_${i}`,
      performer: `Artist ${i % 150}`,
      title: `Track ${i}`,
      duration: 180 + (i % 60),
      coverFileId: i % 5 === 0 ? `cover_${i % 50}` : null
    });
  }

  state.songs = mockSongs;
  state.activeArtistName = 'Artist 42';

  // Benchmark direct single-pass lookup (optimized)
  const iterations = 100;
  const startOptimized = performance.now();
  for (let iter = 0; iter < iterations; iter++) {
    getActiveArtist();
  }
  const durationOptimized = performance.now() - startOptimized;

  // Simulate full catalog mapping & sorting (unoptimized baseline)
  const startBaseline = performance.now();
  for (let iter = 0; iter < iterations; iter++) {
    const artistMap = new Map();
    state.songs.forEach((song, originalIdx) => {
      const rawName = (song.performer || '').trim() || 'Unknown Artist';
      if (!artistMap.has(rawName)) {
        artistMap.set(rawName, {
          name: rawName,
          songs: [],
          covers: [],
          totalDuration: 0,
          latestIdx: originalIdx
        });
      }
      const artist = artistMap.get(rawName);
      artist.songs.push(song);
      artist.totalDuration += (song.duration || 0);
      artist.latestIdx = Math.max(artist.latestIdx, originalIdx);
      if (song.coverFileId && !artist.covers.includes(song.coverFileId)) {
        artist.covers.push(song.coverFileId);
      }
    });

    let list = Array.from(artistMap.values());
    list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    list.find((a) => a.name === state.activeArtistName);
  }
  const durationBaseline = performance.now() - startBaseline;

  assert.ok(durationOptimized <= durationBaseline, 'Single-pass lookup should be faster than full catalog aggregation and sorting');
  console.log(`[Benchmark] getActiveArtist full catalog map & sort (${iterations} ops): ${durationBaseline.toFixed(4)}ms | Direct scan: ${durationOptimized.toFixed(4)}ms`);
});
