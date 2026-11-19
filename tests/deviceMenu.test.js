import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import vm from 'node:vm';

test('device-menu: outside click dismisses open panel on mobile and desktop while preserving clicks on player pill', () => {
  const code = fs.readFileSync('js/device-menu.js', 'utf8');

  // Build minimal DOM tree for device-menu
  const listeners = {};
  const addEventListener = (type, fn, capture) => {
    listeners[type] = listeners[type] || [];
    listeners[type].push({ fn, capture: !!capture });
  };

  const createMockElement = (id, classNames = []) => {
    const classes = new Set(classNames);
    const attrs = new Map();
    let parent = null;
    const children = [];

    const el = {
      id,
      nodeType: 1,
      getAttribute: (k) => attrs.get(k) || null,
      setAttribute: (k, v) => attrs.set(k, String(v)),
      classList: {
        add: (c) => classes.add(c),
        remove: (c) => classes.delete(c),
        contains: (c) => classes.has(c)
      },
      appendChild: (child) => {
        child.parentElement = el;
        children.push(child);
        return child;
      },
      addEventListener: (type, fn) => {},
      focus: () => { el.isFocused = true; },
      click: () => {},
      offsetHeight: 600,
      style: {
        setProperty: () => {},
        style: {}
      },
      closest: (selector) => {
        let curr = el;
        while (curr) {
          if (selector.includes('#' + curr.id)) return curr;
          for (const c of classes) {
            if (selector.includes('.' + c)) return curr;
          }
          curr = curr.parentElement;
        }
        return null;
      }
    };
    return el;
  };

  const panel = createMockElement('device-panel', ['device-panel']);
  const hamburgerBtn = createMockElement('hamburger-button', ['hamburger-btn']);
  const playerContainer = createMockElement('player-container', ['player-container']);
  const playerPill = createMockElement('player-pill', ['device-body', 'player-pill']);
  const deviceViews = createMockElement('device-views');
  const settingsView = createMockElement('device-settings-view');
  const tabSongs = createMockElement('tab-songs', ['device-tab']);
  tabSongs.setAttribute('data-view', 'songs');

  playerContainer.appendChild(playerPill);
  playerContainer.appendChild(panel);
  panel.appendChild(deviceViews);

  const body = createMockElement('body', ['device-ui']);
  body.appendChild(playerContainer);

  const elementsMap = {
    'device-panel': panel,
    'hamburger-button': hamburgerBtn,
    'player-container': playerContainer,
    'player-pill': playerPill,
    'device-views': deviceViews,
    'device-settings-view': settingsView,
    'tab-songs': tabSongs
  };

  const mockDoc = {
    readyState: 'complete',
    getElementById: (id) => elementsMap[id] || null,
    querySelector: (sel) => {
      if (sel === '.device-body') return playerPill;
      return null;
    },
    querySelectorAll: () => [],
    addEventListener,
    body
  };

  const mockWindow = {
    innerWidth: 1024,
    innerHeight: 768,
    addEventListener: () => {},
    document: mockDoc,
    requestAnimationFrame: (cb) => { cb(); return 1; },
    MutationObserver: class {
      observe() {}
      disconnect() {}
    }
  };

  const sandbox = {
    window: mockWindow,
    document: mockDoc,
    MutationObserver: mockWindow.MutationObserver,
    requestAnimationFrame: mockWindow.requestAnimationFrame
  };

  vm.runInNewContext(code, sandbox);

  const clickListeners = listeners['click'] || [];
  assert.ok(clickListeners.length >= 2, 'Must have capture hamburger listener and outside click listener');

  const dispatchClick = (targetEl) => {
    const event = {
      target: targetEl,
      defaultPrevented: false,
      propagationStopped: false,
      preventDefault: () => { event.defaultPrevented = true; },
      stopPropagation: () => { event.propagationStopped = true; },
      composedPath: () => {
        const path = [];
        let curr = targetEl;
        while (curr) {
          path.push(curr);
          curr = curr.parentElement;
        }
        return path;
      }
    };

    // Run capture listeners first
    for (const l of clickListeners) {
      if (l.capture) {
        l.fn(event);
        if (event.propagationStopped) break;
      }
    }
    // If not stopped, run bubble listeners
    if (!event.propagationStopped) {
      for (const l of clickListeners) {
        if (!l.capture) {
          l.fn(event);
        }
      }
    }
  };

  // 1. Initial state: panel is closed
  assert.strictEqual(panel.classList.contains('is-open'), false);

  // 2. Click hamburger button to open panel
  dispatchClick(hamburgerBtn);
  assert.strictEqual(panel.classList.contains('is-open'), true, 'Panel should be open after hamburger click');
  assert.strictEqual(body.classList.contains('device-menu-open'), true);

  // 3. Click inside panel -> panel must remain open
  const childInsidePanel = createMockElement('song-row');
  panel.appendChild(childInsidePanel);
  dispatchClick(childInsidePanel);
  assert.strictEqual(panel.classList.contains('is-open'), true, 'Panel must remain open on inside panel click');

  // 4. Click inside player pill -> panel must remain open
  const playButton = createMockElement('play-button');
  playerPill.appendChild(playButton);
  dispatchClick(playButton);
  assert.strictEqual(panel.classList.contains('is-open'), true, 'Panel must remain open on player pill click');

  // 5. Click inside active modal -> panel must remain open
  const modal = createMockElement('add-songs-modal', ['modal-overlay']);
  const modalContent = createMockElement('modal-input');
  modal.appendChild(modalContent);
  body.appendChild(modal);
  elementsMap['add-songs-modal'] = modal;
  dispatchClick(modalContent);
  assert.strictEqual(panel.classList.contains('is-open'), true, 'Panel must remain open on modal click');

  // 6. Click on element removed from DOM during click handling (composedPath test)
  const ephemeralBtn = createMockElement('delete-btn');
  panel.appendChild(ephemeralBtn);
  // Simulate inner click handler deleting element before event bubbles
  const ephemeralEvent = {
    target: ephemeralBtn,
    defaultPrevented: false,
    propagationStopped: false,
    preventDefault: () => {},
    stopPropagation: () => {},
    composedPath: () => [ephemeralBtn, panel, playerContainer, body, mockDoc, mockWindow]
  };
  ephemeralBtn.parentElement = null; // Detached
  for (const l of clickListeners) {
    if (!l.capture) l.fn(ephemeralEvent);
  }
  assert.strictEqual(panel.classList.contains('is-open'), true, 'Panel must remain open when clicked child element was detached');

  // 7. Click outside (e.g. body or playerContainer background) -> panel must close
  dispatchClick(playerContainer);
  assert.strictEqual(panel.classList.contains('is-open'), false, 'Panel must close on outside click');
  assert.strictEqual(body.classList.contains('device-menu-open'), false);
  assert.strictEqual(panel.getAttribute('aria-hidden'), 'true');

  // 8. Subsequent clicks when panel is already closed should do nothing
  dispatchClick(playerContainer);
  assert.strictEqual(panel.classList.contains('is-open'), false);
});
