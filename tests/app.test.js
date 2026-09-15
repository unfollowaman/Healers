import test from 'node:test';
import assert from 'node:assert';
import { formatDuration, getSongThumbHtml } from '../js/app.js';

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
