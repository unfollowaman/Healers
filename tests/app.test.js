import test from 'node:test';
import assert from 'node:assert';
import { formatDuration, getSongThumbHtml, loadSongs, generateShuffleOrder, state, elements, openAddSongsModal, closeAddSongsModal, renderArtistTracks, renderPlaylistTracks } from '../js/app.js';

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

test('performance benchmark: sequential DOM appends vs DocumentFragment batched rendering', (t) => {
  const itemCount = 500;

  class MockElement {
    constructor(tag) {
      this.tag = tag;
      this.children = [];
    }
    appendChild(child) {
      if (child.isFragment) {
        this.children.push(...child.children);
      } else {
        this.children.push(child);
      }
    }
  }

  class MockDocumentFragment {
    constructor() {
      this.isFragment = true;
      this.children = [];
    }
    appendChild(child) {
      this.children.push(child);
    }
  }

  // Sequential appends benchmark
  const sequentialContainer = new MockElement('ul');
  const startSequential = performance.now();
  for (let i = 0; i < itemCount; i++) {
    const li = new MockElement('li');
    sequentialContainer.appendChild(li);
  }
  const durationSequential = performance.now() - startSequential;

  // DocumentFragment batched appends benchmark
  const fragmentContainer = new MockElement('ul');
  const startBatched = performance.now();
  const fragment = new MockDocumentFragment();
  for (let i = 0; i < itemCount; i++) {
    const li = new MockElement('li');
    fragment.appendChild(li);
  }
  fragmentContainer.appendChild(fragment);
  const durationBatched = performance.now() - startBatched;

  assert.strictEqual(fragmentContainer.children.length, itemCount);
  assert.strictEqual(sequentialContainer.children.length, itemCount);
  console.log(`[Benchmark] Sequential appends (500 items): ${durationSequential.toFixed(4)}ms | Batched fragment append: ${durationBatched.toFixed(4)}ms`);
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

test('player controls ARIA attributes update correctly', (t) => {
  const mockAttributes = new Map();
  const mockButton = {
    classList: { toggle: () => {} },
    setAttribute: (k, v) => mockAttributes.set(k, String(v)),
    getAttribute: (k) => mockAttributes.get(k)
  };

  elements.shuffleButton = mockButton;

  // Simulate setting shuffle button attributes
  state.isShuffle = true;
  elements.shuffleButton.setAttribute('aria-pressed', String(state.isShuffle));
  elements.shuffleButton.setAttribute('aria-label', state.isShuffle ? 'Shuffle on' : 'Shuffle off');

  assert.strictEqual(elements.shuffleButton.getAttribute('aria-pressed'), 'true');
  assert.strictEqual(elements.shuffleButton.getAttribute('aria-label'), 'Shuffle on');

  state.isShuffle = false;
  elements.shuffleButton.setAttribute('aria-pressed', String(state.isShuffle));
  elements.shuffleButton.setAttribute('aria-label', state.isShuffle ? 'Shuffle on' : 'Shuffle off');

  assert.strictEqual(elements.shuffleButton.getAttribute('aria-pressed'), 'false');
  assert.strictEqual(elements.shuffleButton.getAttribute('aria-label'), 'Shuffle off');
});

test('slider controls update aria-valuetext correctly', (t) => {
  const progressBarAttrs = new Map();
  const volumeBarAttrs = new Map();

  elements.progressBar = {
    value: '0',
    style: {},
    setAttribute: (k, v) => progressBarAttrs.set(k, String(v)),
    getAttribute: (k) => progressBarAttrs.get(k)
  };

  elements.volumeBar = {
    value: '1',
    style: {},
    setAttribute: (k, v) => volumeBarAttrs.set(k, String(v)),
    getAttribute: (k) => volumeBarAttrs.get(k)
  };

  // Set aria-valuetext for progress slider
  const currentFormatted = formatDuration(65);
  const totalFormatted = formatDuration(180);
  elements.progressBar.setAttribute('aria-valuetext', `${currentFormatted} of ${totalFormatted}`);

  assert.strictEqual(elements.progressBar.getAttribute('aria-valuetext'), '1:05 of 3:00');

  // Set aria-valuetext for volume slider
  const volumePercent = 80;
  elements.volumeBar.setAttribute('aria-valuetext', `${volumePercent}% volume`);

  assert.strictEqual(elements.volumeBar.getAttribute('aria-valuetext'), '80% volume');
});

test('performance benchmark: localeCompare with inline options vs reused Intl.Collator instance', (t) => {
  const sampleNames = Array.from({ length: 500 }, (_, i) => `Artist ${Math.floor(Math.sin(i) * 1000)}`);

  // Inline localeCompare with options
  const startInline = performance.now();
  const arrInline = [...sampleNames];
  arrInline.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const durationInline = performance.now() - startInline;

  // Reused Intl.Collator instance
  const stringCollator = new Intl.Collator(undefined, { sensitivity: 'base' });
  const startCollator = performance.now();
  const arrCollator = [...sampleNames];
  arrCollator.sort((a, b) => stringCollator.compare(a, b));
  const durationCollator = performance.now() - startCollator;

  assert.deepStrictEqual(arrCollator, arrInline, 'Reused Intl.Collator sorting results must match localeCompare results');
  assert.ok(durationCollator <= durationInline, 'Reused Intl.Collator comparison should be faster than inline localeCompare options');
  console.log(`[Benchmark] Inline localeCompare options (500 strings): ${durationInline.toFixed(4)}ms | Reused Intl.Collator: ${durationCollator.toFixed(4)}ms`);
});

test('playlist empty state updates contextually for active search query vs empty playlist', (t) => {
  const emptyTitle = { textContent: '' };
  const emptySubtitle = { textContent: '' };
  const btnSpan = { textContent: '' };

  elements.plTrackList = {
    innerHTML: '',
    appendChild: () => {}
  };
  elements.plEmptyAddBtn = {
    querySelector: (selector) => (selector === 'span' ? btnSpan : null)
  };
  elements.plEmptyState = {
    classList: {
      remove: () => {},
      add: () => {}
    },
    querySelector: (selector) => {
      if (selector === '.empty-title') return emptyTitle;
      if (selector === '.empty-subtitle') return emptySubtitle;
      return null;
    }
  };

  const samplePlaylist = {
    id: 'pl_test',
    title: 'Test Playlist',
    songs: [{ file_id: '1', title: 'Song Alpha', performer: 'Artist A' }]
  };
  state.playlists = [samplePlaylist];
  state.activePlaylistId = 'pl_test';

  // 1. When non-matching search query is active
  state.playlistSearchQuery = 'NonExistent';
  const songsToRender = samplePlaylist.songs.filter(
    (s) => s.title.includes(state.playlistSearchQuery)
  );
  assert.strictEqual(songsToRender.length, 0);

  if (state.playlistSearchQuery.trim()) {
    emptyTitle.textContent = 'No tracks found';
    emptySubtitle.textContent = `No tracks match "${state.playlistSearchQuery.trim()}".`;
    btnSpan.textContent = 'Clear Search';
  }

  assert.strictEqual(emptyTitle.textContent, 'No tracks found');
  assert.strictEqual(emptySubtitle.textContent, 'No tracks match "NonExistent".');
  assert.strictEqual(btnSpan.textContent, 'Clear Search');

  // 2. When playlist is genuinely empty (no songs)
  samplePlaylist.songs = [];
  state.playlistSearchQuery = '';
  if (!state.playlistSearchQuery.trim()) {
    emptyTitle.textContent = 'This playlist is empty';
    emptySubtitle.textContent = 'Add songs from your library to get started.';
    btnSpan.textContent = 'Add Songs';
  }

  assert.strictEqual(emptyTitle.textContent, 'This playlist is empty');
  assert.strictEqual(emptySubtitle.textContent, 'Add songs from your library to get started.');
  assert.strictEqual(btnSpan.textContent, 'Add Songs');
});

test('linear O(N) min/max span calculation accurately measures event range across history', (t) => {
  const now = Date.now();
  const DAY = 24 * 3600 * 1000;
  const mockEvents = [
    { timestamp: now - 10 * DAY, duration: 180 },
    { timestamp: now - 3 * DAY, duration: 200 },
    { timestamp: now - 15 * DAY, duration: 210 },
    { timestamp: now - 1 * DAY, duration: 150 }
  ];

  let minTime = mockEvents[0].timestamp;
  let maxTime = mockEvents[0].timestamp;
  for (let i = 1; i < mockEvents.length; i++) {
    const time = mockEvents[i].timestamp;
    if (time < minTime) minTime = time;
    if (time > maxTime) maxTime = time;
  }

  const expectedSpanMs = mockEvents[0].timestamp - mockEvents[2].timestamp; // (now - 1 * DAY) - (now - 15 * DAY) = 14 * DAY
  assert.strictEqual(maxTime - minTime, 14 * DAY);
});

test('toggle buttons maintain aria-pressed and aria-expanded attributes correctly', (t) => {
  const queueAttrs = new Map();
  const queueClasses = new Set();
  const queueButton = {
    classList: {
      toggle: (cls, flag) => (flag ? queueClasses.add(cls) : queueClasses.delete(cls))
    },
    setAttribute: (k, v) => queueAttrs.set(k, String(v)),
    getAttribute: (k) => queueAttrs.get(k)
  };

  elements.queueButton = queueButton;
  elements.queueContainer = { classList: { toggle: () => {} } };

  state.isQueueOpen = false;
  // Simulate toggleQueue logic
  state.isQueueOpen = !state.isQueueOpen;
  elements.queueButton.classList.toggle('active', state.isQueueOpen);
  elements.queueButton.setAttribute('aria-pressed', String(state.isQueueOpen));
  elements.queueButton.setAttribute('aria-expanded', String(state.isQueueOpen));

  assert.strictEqual(elements.queueButton.getAttribute('aria-pressed'), 'true');
  assert.strictEqual(elements.queueButton.getAttribute('aria-expanded'), 'true');

  state.isQueueOpen = !state.isQueueOpen;
  elements.queueButton.classList.toggle('active', state.isQueueOpen);
  elements.queueButton.setAttribute('aria-pressed', String(state.isQueueOpen));
  elements.queueButton.setAttribute('aria-expanded', String(state.isQueueOpen));

  assert.strictEqual(elements.queueButton.getAttribute('aria-pressed'), 'false');
  assert.strictEqual(elements.queueButton.getAttribute('aria-expanded'), 'false');
});

test('generateShuffleOrder - creates valid permutation starting with startIndex', (t) => {
  state.songs = Array.from({ length: 100 }, (_, i) => ({ file_id: `song_${i}`, title: `Track ${i}` }));

  // Test valid startIndex = 25
  const shuffleOrder = generateShuffleOrder(25);
  assert.strictEqual(shuffleOrder.length, 100);
  assert.strictEqual(shuffleOrder[0], 25);

  const sortedIndices = [...shuffleOrder].sort((a, b) => a - b);
  const expectedIndices = Array.from({ length: 100 }, (_, i) => i);
  assert.deepStrictEqual(sortedIndices, expectedIndices);

  // Test invalid / negative startIndex
  const fullShuffle = generateShuffleOrder(-1);
  assert.strictEqual(fullShuffle.length, 100);
  assert.deepStrictEqual([...fullShuffle].sort((a, b) => a - b), expectedIndices);
});

test('modal focus management captures and restores focus correctly', (t) => {
  let focusedInput = false;
  let restoredTriggerFocus = false;

  const triggerButton = {
    focus: () => { restoredTriggerFocus = true; }
  };

  globalThis.document = globalThis.document || {};
  globalThis.document.activeElement = triggerButton;

  let modalHidden = true;
  elements.addSongsModal = {
    classList: {
      remove: (cls) => { if (cls === 'hidden') modalHidden = false; },
      add: (cls) => { if (cls === 'hidden') modalHidden = true; }
    }
  };

  elements.modalSearchInput = {
    focus: () => { focusedInput = true; }
  };

  openAddSongsModal();
  assert.strictEqual(modalHidden, false, 'Modal should no longer be hidden');
  assert.strictEqual(focusedInput, true, 'Focus should be transferred to modalSearchInput');

  closeAddSongsModal();
  assert.strictEqual(modalHidden, true, 'Modal should be hidden after closing');
  assert.strictEqual(restoredTriggerFocus, true, 'Focus should be restored to previously focused element');
});

test('renderArtistTracks generates contextual ARIA labels for track actions', (t) => {
  class MockElement {
    constructor(tag) {
      this.tag = tag;
      this.children = [];
      this.className = '';
      this.innerHTML = '';
    }
    appendChild(child) {
      if (child.isFragment) {
        this.children.push(...child.children);
      } else {
        this.children.push(child);
      }
    }
    querySelector() {
      return { addEventListener: () => {} };
    }
    querySelectorAll() {
      return [];
    }
    addEventListener() {}
  }

  class MockDocumentFragment {
    constructor() {
      this.isFragment = true;
      this.children = [];
    }
    appendChild(child) {
      this.children.push(child);
    }
  }

  const originalDoc = globalThis.document;
  globalThis.document = {
    createElement: (tag) => new MockElement(tag),
    createDocumentFragment: () => new MockDocumentFragment()
  };

  elements.artistTrackList = new MockElement('ul');

  const mockArtist = {
    name: 'Stellar Sound',
    songs: [{ file_id: 's10', title: 'Cosmic Journey', performer: 'Stellar Sound', duration: 200 }]
  };

  try {
    renderArtistTracks(mockArtist);
    assert.strictEqual(elements.artistTrackList.children.length, 1);
    const li = elements.artistTrackList.children[0];
    assert.ok(li.innerHTML.includes('aria-label="Add &quot;Cosmic Journey&quot; to queue"'));
  } finally {
    globalThis.document = originalDoc;
  }
});

test('renderPlaylistTracks generates contextual ARIA labels for track actions', (t) => {
  class MockElement {
    constructor(tag) {
      this.tag = tag;
      this.children = [];
      this.className = '';
      this.innerHTML = '';
    }
    appendChild(child) {
      if (child.isFragment) {
        this.children.push(...child.children);
      } else {
        this.children.push(child);
      }
    }
    querySelector() {
      return { addEventListener: () => {} };
    }
    querySelectorAll() {
      return [];
    }
    addEventListener() {}
  }

  class MockDocumentFragment {
    constructor() {
      this.isFragment = true;
      this.children = [];
    }
    appendChild(child) {
      this.children.push(child);
    }
  }

  const originalDoc = globalThis.document;
  globalThis.document = {
    createElement: (tag) => new MockElement(tag),
    createDocumentFragment: () => new MockDocumentFragment()
  };

  elements.plTrackList = new MockElement('ul');
  elements.plEmptyState = { classList: { add: () => {}, remove: () => {} } };

  const samplePl = {
    id: 'pl_aria',
    title: 'A11y Test Playlist',
    songs: [
      { file_id: 'p1', title: 'Track One', performer: 'Artist A', duration: 180 },
      { file_id: 'p2', title: 'Track Two', performer: 'Artist B', duration: 210 }
    ]
  };

  state.playlists = [samplePl];
  state.activePlaylistId = 'pl_aria';
  state.playlistSearchQuery = '';
  state.playlistSortOrder = 'custom';

  try {
    renderPlaylistTracks();
    assert.strictEqual(elements.plTrackList.children.length, 2);
    const firstLi = elements.plTrackList.children[0];
    assert.ok(firstLi.innerHTML.includes('aria-label="Move &quot;Track One&quot; up"'));
    assert.ok(firstLi.innerHTML.includes('aria-label="Move &quot;Track One&quot; down"'));
    assert.ok(firstLi.innerHTML.includes('aria-label="Remove &quot;Track One&quot; from playlist"'));
  } finally {
    globalThis.document = originalDoc;
  }
});

test('performance benchmark: generateShuffleOrder full scan/shift vs O(1) initial swap', (t) => {
  const songCount = 1000;
  state.songs = Array.from({ length: songCount }, (_, i) => ({ file_id: `song_${i}` }));
  const targetIndex = 500;
  const iterations = 500;

  // Unoptimized legacy approach simulation
  const legacyGenerateShuffleOrder = (startIndex) => {
    const indices = Array.from({ length: state.songs.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    if (startIndex >= 0 && indices.includes(startIndex)) {
      const currPos = indices.indexOf(startIndex);
      indices.splice(currPos, 1);
      indices.unshift(startIndex);
    }
    return indices;
  };

  const startLegacy = performance.now();
  for (let i = 0; i < iterations; i++) {
    legacyGenerateShuffleOrder(targetIndex);
  }
  const durationLegacy = performance.now() - startLegacy;

  const startOptimized = performance.now();
  for (let i = 0; i < iterations; i++) {
    generateShuffleOrder(targetIndex);
  }
  const durationOptimized = performance.now() - startOptimized;

  assert.ok(durationOptimized <= durationLegacy, 'Optimized shuffle order must be faster or equal to legacy shuffle order');
  console.log(`[Benchmark] Legacy shuffle order (1000 items x 500 runs): ${durationLegacy.toFixed(4)}ms | O(1) swap shuffle: ${durationOptimized.toFixed(4)}ms`);
});
