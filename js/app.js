const state = {
  songs: [],
  filteredSongs: [],
  queue: [],
  currentIndex: -1,
  isSeeking: false
};

const elements = {
  searchInput: document.querySelector('#search-input'),
  searchToggle: document.querySelector('#search-toggle'),
  refreshButton: document.querySelector('#refresh-button'),
  statusCard: document.querySelector('#status-card'),
  contentWrapper: document.querySelector('#content-wrapper'),
  songList: document.querySelector('#song-list'),
  audio: document.querySelector('#audio-player'),
  player: document.querySelector('#player'),
  header: document.querySelector('.header'),
  bottomSeparator: document.querySelector('#bottom-separator'),
  statSongs: document.querySelector('#stat-songs'),
  statArtists: document.querySelector('#stat-artists'),
  statAlbums: document.querySelector('#stat-albums'),
  statDuration: document.querySelector('#stat-duration'),
  recentlyAddedStrip: document.querySelector('#recently-added-strip'),
  allSongsCount: document.querySelector('#all-songs-count'),
  btnRecentlyAdded: document.querySelector('#btn-recently-added'),
  nowTitle: document.querySelector('#now-title'),
  nowArtist: document.querySelector('#now-artist'),
  playButton: document.querySelector('#play-button'),
  prevButton: document.querySelector('#prev-button'),
  nextButton: document.querySelector('#next-button'),
  shuffleButton: document.querySelector('#shuffle-button'),
  repeatButton: document.querySelector('#repeat-button'),
  repeatBadge: document.querySelector('.repeat-one-badge'),
  progressBar: document.querySelector('#progress-bar'),
  currentTime: document.querySelector('#current-time'),
  totalTime: document.querySelector('#total-time'),
  volumeKnob: document.querySelector('#volume-knob'),
  waveformCanvasMobile: document.querySelector('#waveform-canvas-mobile'),
  waveformCanvasDesktop: document.querySelector('#waveform-canvas-desktop'),
  desktopNowTitle: document.querySelector('#desktop-now-title'),
  desktopNowArtist: document.querySelector('#desktop-now-artist')
};

let isShuffle = false;
let repeatMode = 0; // 0: off, 1: all, 2: one
let unplayedIndices = [];

// Search toggle logic
let isSearchExpanded = false;
function toggleSearch() {
  isSearchExpanded = !isSearchExpanded;
  if (isSearchExpanded) {
    elements.searchInput.classList.add('expanded');
    elements.searchInput.focus();
  } else {
    elements.searchInput.classList.remove('expanded');
    elements.searchInput.value = '';
    filterSongs();
  }
}

// --- Volume Knob Logic ---
let isDraggingKnob = false;
let startY = 0;
let currentRotation = 0; // Starts at 0 degrees = middle volume

function updateVolumeFromRotation() {
  // Map rotation (-135 to 135) to volume (0.0 to 1.0)
  const volume = (currentRotation + 135) / 270;
  elements.audio.volume = Math.max(0, Math.min(1, volume));
  elements.volumeKnob.setAttribute('aria-valuenow', Math.round(volume * 100));
}

function handleKnobStart(e) {
  isDraggingKnob = true;
  startY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
  e.preventDefault(); // Prevent scrolling on touch
}

function handleKnobMove(e) {
  if (!isDraggingKnob) return;

  const currentY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
  const deltaY = currentY - startY;

  // Every 2px of drag = 3 degrees of rotation
  // Negative deltaY (moving up) should INCREASE volume (positive rotation)
  const rotationChange = -(deltaY / 2) * 3;

  currentRotation += rotationChange;

  // Clamp between -135 and +135
  currentRotation = Math.max(-135, Math.min(135, currentRotation));

  elements.volumeKnob.style.transform = `rotate(${currentRotation}deg)`;
  updateVolumeFromRotation();

  startY = currentY;
}

function handleKnobEnd() {
  isDraggingKnob = false;
}

// Initial volume state setup
// Default volume in old app was 0.85.
// Volume 0.85 = (rotation + 135) / 270 => 229.5 = rotation + 135 => rotation = 94.5
currentRotation = 94.5;
elements.volumeKnob.style.transform = `rotate(${currentRotation}deg)`;


// --- Waveform Canvas Logic ---
let audioCtx;
let analyser;
let source;
let dataArray;
let canvasCtxMobile;
let canvasCtxDesktop;

function setupWaveform() {
  canvasCtxMobile = elements.waveformCanvasMobile.getContext('2d');
  canvasCtxDesktop = elements.waveformCanvasDesktop.getContext('2d');

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  source = audioCtx.createMediaElementSource(elements.audio);

  source.connect(analyser);
  analyser.connect(audioCtx.destination);

  analyser.fftSize = 256;
  const bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  drawWaveform();
}

function resizeCanvas() {
  elements.waveformCanvasMobile.width = elements.waveformCanvasMobile.offsetWidth;
  elements.waveformCanvasMobile.height = 110;

  elements.waveformCanvasDesktop.width = elements.waveformCanvasDesktop.offsetWidth;
  elements.waveformCanvasDesktop.height = elements.waveformCanvasDesktop.offsetWidth; // Square
}

function drawIdleBarsForCanvas(canvas, ctx) {
  if (canvas.offsetWidth === 0) return;

  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const barCount = 64;
  const gap = 3;
  const barWidth = (canvas.width - (barCount - 1) * gap) / barCount;
  const idleHeight = 4;

  ctx.fillStyle = '#444444'; // var(--waveform-idle)
  for (let i = 0; i < barCount; i++) {
    const x = i * (barWidth + gap);
    ctx.fillRect(x, canvas.height - idleHeight, barWidth, idleHeight);
  }
}

function drawActiveBarsForCanvas(canvas, ctx) {
  if (canvas.offsetWidth === 0) return;

  ctx.fillStyle = '#111111'; // var(--waveform-bg)
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const barCount = 64;
  const gap = 3;
  const barWidth = (canvas.width - (barCount - 1) * gap) / barCount;

  for (let i = 0; i < barCount; i++) {
    const value = dataArray[i];
    const barHeight = (value / 255) * canvas.height * 0.9;
    const x = i * (barWidth + gap);
    const y = canvas.height - barHeight;

    const gradient = ctx.createLinearGradient(x, y, x, canvas.height);
    gradient.addColorStop(0, '#FF0800'); // var(--accent-bright)
    gradient.addColorStop(1, '#880000');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, barWidth, barHeight, 2);
    } else {
      ctx.fillRect(x, y, barWidth, barHeight);
    }
    ctx.fill();
  }
}

function drawWaveform() {
  requestAnimationFrame(drawWaveform);

  // Re-check desktop canvas width in case layout changed
  if (elements.waveformCanvasDesktop.offsetWidth > 0 && elements.waveformCanvasDesktop.width !== elements.waveformCanvasDesktop.offsetWidth) {
      elements.waveformCanvasDesktop.width = elements.waveformCanvasDesktop.offsetWidth;
      elements.waveformCanvasDesktop.height = elements.waveformCanvasDesktop.offsetWidth;
  }

  if (elements.audio.paused) {
    drawIdleBarsForCanvas(elements.waveformCanvasMobile, canvasCtxMobile);
    drawIdleBarsForCanvas(elements.waveformCanvasDesktop, canvasCtxDesktop);
    return;
  }

  analyser.getByteFrequencyData(dataArray);

  drawActiveBarsForCanvas(elements.waveformCanvasMobile, canvasCtxMobile);
  drawActiveBarsForCanvas(elements.waveformCanvasDesktop, canvasCtxDesktop);
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';

  const rounded = Math.floor(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainder = String(rounded % 60).padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function setStatus(message, { loading = false, error = false } = {}) {
  elements.statusCard.hidden = false;
  elements.statusCard.classList.toggle('error', error);
  elements.statusCard.innerHTML = `${loading ? '<div class="loader" aria-hidden="true"></div>' : ''}<p></p>`;
  elements.statusCard.querySelector('p').textContent = message;
}

function hideStatus() {
  elements.statusCard.hidden = true;
}

function normalizeText(value) {
  return String(value || '').toLowerCase().trim();
}

function getCurrentSong() {
  return state.queue[state.currentIndex] || null;
}

function updateStats() {
  const songs = state.songs.length;
  elements.statSongs.textContent = songs;

  const artists = new Set(state.songs.map(s => s.performer || 'Unknown Artist')).size;
  elements.statArtists.textContent = artists;

  // Assuming albums aren't available, we show Tracks and repeat song count
  elements.statAlbums.textContent = songs;

  const totalSeconds = state.songs.reduce((acc, song) => acc + (song.duration || 0), 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  elements.statDuration.textContent = `${hours}h ${minutes}m`;

  elements.allSongsCount.textContent = state.filteredSongs.length;
}

function renderRecentlyAdded() {
  const recentSongs = state.songs.slice(0, 8); // Assuming first 8 are recently added

  const gradients = [
    'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)',
    'linear-gradient(135deg, #2d1b33, #11998e, #38ef7d)',
    'linear-gradient(135deg, #373B44, #4286f4)',
    'linear-gradient(135deg, #c94b4b, #4b134f)',
    'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
    'linear-gradient(135deg, #1d2671, #c33764)',
    'linear-gradient(135deg, #434343, #000000)',
    'linear-gradient(135deg, #005c97, #363795)'
  ];

  elements.recentlyAddedStrip.innerHTML = recentSongs.map((song, idx) => {
    const bg = gradients[idx % gradients.length];

    // Find the actual index of this song in filteredSongs so clicking works correctly
    const filteredIndex = state.filteredSongs.findIndex(s => s.file_id === song.file_id);

    return `
      <div class="thumbnail-card" data-index="${filteredIndex > -1 ? filteredIndex : ''}">
        <div class="thumbnail-art" style="background: ${bg}; opacity: ${filteredIndex > -1 ? 1 : 0.5}">
          <div class="hover-overlay">
            <div class="hover-overlay-icon">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
        </div>
        <div class="thumbnail-title">${escapeHtml(song.title)}</div>
        <div class="thumbnail-artist">${escapeHtml(song.performer || 'Unknown Artist')}</div>
      </div>
    `;
  }).join('');
}

function renderSongs() {
  updateStats();
  renderRecentlyAdded();

  const currentSong = getCurrentSong();

  elements.songList.innerHTML = state.filteredSongs.map((song, index) => {
    const isActive = currentSong?.file_id === song.file_id;
    const buttonIcon = isActive && !elements.audio.paused ? '❚❚' : '▶';

    return `
      <article class="song-row ${isActive ? 'active' : ''}" data-index="${index}" tabindex="0" role="button" aria-label="Play ${escapeHtml(song.title)} by ${escapeHtml(song.performer || 'Unknown Artist')}">
        <div class="song-index">${index + 1}</div>
        <div class="song-details">
          <strong class="song-title">${escapeHtml(song.title)}</strong>
          <div class="song-artist-sub">${escapeHtml(song.performer || 'Unknown Artist')}</div>
        </div>
        <div class="song-artist-col">${escapeHtml(song.performer || 'Unknown Artist')}</div>
        <div class="song-duration">${formatDuration(song.duration)}</div>
        <button class="song-play-button" type="button" aria-label="Play ${escapeHtml(song.title)}" tabindex="-1">
          ${buttonIcon === '▶' ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' : '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'}
        </button>
      </article>
    `;
  }).join('');

  if (!state.filteredSongs.length) {
    setStatus('No songs found. Upload audio to your Telegram channel then tap Refresh.');
    elements.contentWrapper.hidden = true;
  } else {
    hideStatus();
    elements.contentWrapper.hidden = false;
  }
}

function showSkeletonLoading() {
  elements.songList.innerHTML = Array(5).fill(0).map(() => '<article class="skeleton-row"></article>').join('');
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function filterSongs() {
  const query = normalizeText(elements.searchInput.value);

  state.filteredSongs = query
    ? state.songs.filter((song) => `${song.title} ${song.performer}`.toLowerCase().includes(query))
    : [...state.songs];

  renderSongs();
}

async function loadSongs({ refresh = false } = {}) {
  setStatus(refresh ? 'Refreshing songs from Telegram…' : 'Loading songs from Telegram…', { loading: true });
  showSkeletonLoading();
  elements.refreshButton.disabled = true;

  try {
    const response = await fetch(`/api/songs${refresh ? '?refresh=1' : ''}`, {
      headers: { Accept: 'application/json' },
      cache: refresh ? 'no-store' : 'default'
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error || 'Unable to load songs.');
    }

    state.songs = Array.isArray(payload) ? payload : [];
    filterSongs();

    if (!state.songs.length) {
      setStatus('No audio messages were found. Make sure the bot can read channel posts and that the channel contains audio files.');
    }
  } catch (error) {
    setStatus(error.message || 'Unable to load songs from Telegram.', { error: true });
  } finally {
    elements.refreshButton.disabled = false;
  }
}

function updateNowPlaying(song) {
  if (!song) {
    elements.nowTitle.textContent = 'Select a song';
    elements.nowArtist.textContent = 'Ready to play';
    elements.desktopNowTitle.textContent = '';
    elements.desktopNowArtist.textContent = '';
    elements.totalTime.textContent = '0:00';
    return;
  }

  elements.nowTitle.textContent = song.title;
  elements.nowArtist.textContent = song.performer || 'Unknown Artist';
  elements.desktopNowTitle.textContent = song.title;
  elements.desktopNowArtist.textContent = song.performer || 'Unknown Artist';
  elements.totalTime.textContent = formatDuration(song.duration);
}

function initShuffleQueue() {
  unplayedIndices = Array.from({ length: state.queue.length }, (_, i) => i);
  // Remove current playing so we don't immediately play it again
  if (state.currentIndex >= 0 && state.currentIndex < state.queue.length) {
    unplayedIndices.splice(state.currentIndex, 1);
  }
}

function getRandomUnplayedIndex() {
  if (unplayedIndices.length === 0) {
    initShuffleQueue(); // Reshuffle
  }
  if (unplayedIndices.length === 0) return state.currentIndex; // Fallback

  const randIdx = Math.floor(Math.random() * unplayedIndices.length);
  const queueIndex = unplayedIndices[randIdx];
  unplayedIndices.splice(randIdx, 1);
  return queueIndex;
}

async function playSongFromFilteredIndex(filteredIndex) {
  const song = state.filteredSongs[filteredIndex];
  if (!song) return;

  state.queue = [...state.filteredSongs];
  state.currentIndex = filteredIndex;
  if (isShuffle) initShuffleQueue();
  await startCurrentSong();
}

function toggleShuffle() {
  isShuffle = !isShuffle;
  elements.shuffleButton.classList.toggle('is-active', isShuffle);
  elements.shuffleButton.setAttribute('aria-pressed', String(isShuffle));
  if (isShuffle) {
    initShuffleQueue();
  }
}

function toggleRepeat() {
  repeatMode = (repeatMode + 1) % 3;

  if (repeatMode === 0) {
    elements.repeatButton.classList.remove('is-active');
    elements.repeatBadge.style.display = 'none';
    elements.repeatButton.setAttribute('aria-label', 'Repeat off');
  } else if (repeatMode === 1) {
    elements.repeatButton.classList.add('is-active');
    elements.repeatBadge.style.display = 'none';
    elements.repeatButton.setAttribute('aria-label', 'Repeat all');
  } else if (repeatMode === 2) {
    elements.repeatButton.classList.add('is-active');
    elements.repeatBadge.style.display = 'block';
    elements.repeatButton.setAttribute('aria-label', 'Repeat one');
  }
}

function setPlayerPlayingState(isPlaying) {
  if (isPlaying) {
    elements.player.classList.add('player--playing');
    elements.bottomSeparator.style.display = 'none';

    // Only apply top offset dynamically on mobile
    if (window.innerWidth < 900) {
      const headerHeight = elements.header.offsetHeight;
      const sepHeight = 14;
      const playerTop = headerHeight + sepHeight;
      elements.player.style.top = playerTop + 'px';

      requestAnimationFrame(() => {
          const playingPlayerHeight = elements.player.offsetHeight;
          document.querySelector('.library').style.paddingTop = (playingPlayerHeight + 14) + 'px';
      });
    }

    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  } else if (!getCurrentSong()) {
    // Only go completely IDLE if stopped
    elements.player.classList.remove('player--playing');
    elements.bottomSeparator.style.display = 'block';
    elements.player.style.top = 'auto';
    document.querySelector('.library').style.paddingTop = '0';
  }
}

async function startCurrentSong() {
  const song = getCurrentSong();
  if (!song) return;

  updateNowPlaying(song);
  elements.audio.src = `/api/stream?file_id=${encodeURIComponent(song.file_id)}`;
  elements.audio.load();

  if (!audioCtx) setupWaveform();

  try {
    await elements.audio.play();
    setPlayerPlayingState(true);

    // Smooth scroll to active song
    const activeRow = elements.songList.querySelector('.song-row.active');
    if (activeRow) {
      activeRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  } catch (error) {
    setStatus('Tap the play button to start playback. Mobile browsers may block autoplay until you interact with the page.');
  }

  updatePlayButton();
  renderSongs();
}

function togglePlayPause() {
  if (!getCurrentSong()) {
    if (state.filteredSongs.length) {
      playSongFromFilteredIndex(0);
    }
    return;
  }

  if (elements.audio.paused) {
    elements.audio.play().catch(() => {
      setStatus('Playback could not start. Please try selecting the song again.', { error: true });
    });
  } else {
    elements.audio.pause();
  }
}

function playRelative(offset) {
  if (!state.queue.length) {
    if (state.filteredSongs.length) playSongFromFilteredIndex(0);
    return;
  }

  if (offset > 0 && isShuffle) {
    state.currentIndex = getRandomUnplayedIndex();
  } else {
    state.currentIndex = (state.currentIndex + offset + state.queue.length) % state.queue.length;
  }
  startCurrentSong();
}

function handleSongEnded() {
  if (repeatMode === 2) {
    // Repeat one
    elements.audio.currentTime = 0;
    elements.audio.play();
  } else if (repeatMode === 1) {
    // Repeat all
    playRelative(1);
  } else {
    // Off
    if (isShuffle) {
      if (unplayedIndices.length === 0) {
         // Stop
         return;
      }
      playRelative(1);
    } else {
      if (state.currentIndex === state.queue.length - 1) {
        // Stop
        return;
      }
      playRelative(1);
    }
  }
}

function updatePlayButton() {
  const isPlaying = !elements.audio.paused && !elements.audio.ended;
  elements.playButton.innerHTML = isPlaying
    ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
    : '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  elements.playButton.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
  renderSongs();
}

function updateProgress() {
  if (state.isSeeking) return;

  const duration = elements.audio.duration || getCurrentSong()?.duration || 0;
  const current = elements.audio.currentTime || 0;
  const percent = duration ? (current / duration) * 100 : 0;

  elements.progressBar.value = String(percent);
  elements.currentTime.textContent = formatDuration(current);
  elements.totalTime.textContent = formatDuration(duration);
}

function seekToProgress() {
  const duration = elements.audio.duration || getCurrentSong()?.duration || 0;
  if (!duration) return;

  elements.audio.currentTime = (Number(elements.progressBar.value) / 100) * duration;
  state.isSeeking = false;
  updateProgress();
}

function bindEvents() {
  elements.searchInput.addEventListener('input', filterSongs);
  elements.searchToggle.addEventListener('click', toggleSearch);
  elements.refreshButton.addEventListener('click', () => loadSongs({ refresh: true }));

  if (elements.btnRecentlyAdded) {
    elements.btnRecentlyAdded.addEventListener('click', () => {
      document.querySelector('#all-songs-section').scrollIntoView({ behavior: 'smooth' });
    });
  }

  const handleSongClick = (event) => {
    const item = event.target.closest('.song-row, .thumbnail-card');
    if (!item) return;

    const indexAttr = item.dataset.index;
    if (indexAttr === undefined || indexAttr === '') return;

    const filteredIndex = Number(indexAttr);
    const selectedSong = state.filteredSongs[filteredIndex];
    const currentSong = getCurrentSong();

    if (currentSong?.file_id === selectedSong?.file_id) {
      togglePlayPause();
      return;
    }

    playSongFromFilteredIndex(filteredIndex);
  };

  elements.songList.addEventListener('click', handleSongClick);
  elements.recentlyAddedStrip.addEventListener('click', handleSongClick);

  elements.playButton.addEventListener('click', togglePlayPause);
  elements.prevButton.addEventListener('click', () => playRelative(-1));
  elements.nextButton.addEventListener('click', () => playRelative(1));
  elements.shuffleButton.addEventListener('click', toggleShuffle);
  elements.repeatButton.addEventListener('click', toggleRepeat);

  elements.audio.addEventListener('play', updatePlayButton);
  elements.audio.addEventListener('pause', updatePlayButton);
  elements.audio.addEventListener('ended', handleSongEnded);
  elements.audio.addEventListener('timeupdate', updateProgress);
  elements.audio.addEventListener('loadedmetadata', updateProgress);
  elements.audio.addEventListener('error', () => {
    setStatus('This track could not be streamed. Refresh the library and try again.', { error: true });
  });

  elements.progressBar.addEventListener('input', () => {
    state.isSeeking = true;
    const duration = elements.audio.duration || getCurrentSong()?.duration || 0;
    elements.currentTime.textContent = formatDuration((Number(elements.progressBar.value) / 100) * duration);
  });
  elements.progressBar.addEventListener('change', seekToProgress);

  // Volume Knob Events
  elements.volumeKnob.addEventListener('mousedown', handleKnobStart);
  elements.volumeKnob.addEventListener('touchstart', handleKnobStart, { passive: false });
  document.addEventListener('mousemove', handleKnobMove);
  document.addEventListener('touchmove', handleKnobMove, { passive: false });
  document.addEventListener('mouseup', handleKnobEnd);
  document.addEventListener('touchend', handleKnobEnd);

  // Keyboard accessibility
  document.addEventListener('keydown', (e) => {
    // Only handle if not typing in search
    if (document.activeElement === elements.searchInput) return;

    if (e.code === 'Space') {
      e.preventDefault();
      togglePlayPause();
    } else if (e.code === 'ArrowLeft') {
      elements.audio.currentTime = Math.max(0, elements.audio.currentTime - 5);
      updateProgress();
    } else if (e.code === 'ArrowRight') {
      elements.audio.currentTime = Math.min(elements.audio.duration || 0, elements.audio.currentTime + 5);
      updateProgress();
    }
  });
}

function init() {
  updateVolumeFromRotation();
  bindEvents();
  loadSongs();
}

init();
