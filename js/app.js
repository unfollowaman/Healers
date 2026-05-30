const state = {
  songs: [],
  filteredSongs: [],
  queue: [],
  currentIndex: -1,
  isSeeking: false
};

const elements = {
  searchInput: document.querySelector('#search-input'),
  refreshButton: document.querySelector('#refresh-button'),
  statusCard: document.querySelector('#status-card'),
  songList: document.querySelector('#song-list'),
  audio: document.querySelector('#audio-player'),
  nowTitle: document.querySelector('#now-title'),
  nowArtist: document.querySelector('#now-artist'),
  playButton: document.querySelector('#play-button'),
  prevButton: document.querySelector('#prev-button'),
  nextButton: document.querySelector('#next-button'),
  progressBar: document.querySelector('#progress-bar'),
  currentTime: document.querySelector('#current-time'),
  totalTime: document.querySelector('#total-time'),
  volumeSlider: document.querySelector('#volume-slider')
};

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
  elements.statusCard.innerHTML = `${loading ? '<div class="loader" aria-hidden="true"></div>' : ''}<p>${message}</p>`;
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

function renderSongs() {
  const currentSong = getCurrentSong();

  elements.songList.innerHTML = state.filteredSongs.map((song, index) => {
    const isActive = currentSong?.file_id === song.file_id;
    const buttonIcon = isActive && !elements.audio.paused ? '❚❚' : '▶';

    return `
      <article class="song-row ${isActive ? 'active' : ''}" data-index="${index}">
        <div class="song-details">
          <strong class="song-title">${escapeHtml(song.title)}</strong>
          <div class="song-artist">${escapeHtml(song.performer || 'Unknown Artist')}</div>
        </div>
        <span class="song-duration">${formatDuration(song.duration)}</span>
        <button class="song-play-button" type="button" aria-label="Play ${escapeHtml(song.title)}">${buttonIcon}</button>
      </article>
    `;
  }).join('');

  if (!state.filteredSongs.length) {
    setStatus('No songs match your search.');
  } else {
    hideStatus();
  }
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
    elements.totalTime.textContent = '0:00';
    return;
  }

  elements.nowTitle.textContent = song.title;
  elements.nowArtist.textContent = song.performer || 'Unknown Artist';
  elements.totalTime.textContent = formatDuration(song.duration);
}

async function playSongFromFilteredIndex(filteredIndex) {
  const song = state.filteredSongs[filteredIndex];
  if (!song) return;

  state.queue = [...state.filteredSongs];
  state.currentIndex = filteredIndex;
  await startCurrentSong();
}

async function startCurrentSong() {
  const song = getCurrentSong();
  if (!song) return;

  updateNowPlaying(song);
  elements.audio.src = `/api/stream?file_id=${encodeURIComponent(song.file_id)}`;
  elements.audio.load();

  try {
    await elements.audio.play();
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

  state.currentIndex = (state.currentIndex + offset + state.queue.length) % state.queue.length;
  startCurrentSong();
}

function updatePlayButton() {
  const isPlaying = !elements.audio.paused && !elements.audio.ended;
  elements.playButton.textContent = isPlaying ? '❚❚' : '▶';
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
  elements.refreshButton.addEventListener('click', () => loadSongs({ refresh: true }));

  elements.songList.addEventListener('click', (event) => {
    const row = event.target.closest('.song-row');
    if (!row) return;

    const filteredIndex = Number(row.dataset.index);
    const selectedSong = state.filteredSongs[filteredIndex];
    const currentSong = getCurrentSong();

    if (currentSong?.file_id === selectedSong?.file_id) {
      togglePlayPause();
      return;
    }

    playSongFromFilteredIndex(filteredIndex);
  });

  elements.playButton.addEventListener('click', togglePlayPause);
  elements.prevButton.addEventListener('click', () => playRelative(-1));
  elements.nextButton.addEventListener('click', () => playRelative(1));

  elements.audio.addEventListener('play', updatePlayButton);
  elements.audio.addEventListener('pause', updatePlayButton);
  elements.audio.addEventListener('ended', () => playRelative(1));
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

  elements.volumeSlider.addEventListener('input', () => {
    elements.audio.volume = Number(elements.volumeSlider.value);
  });
}

function init() {
  elements.audio.volume = Number(elements.volumeSlider.value);
  bindEvents();
  loadSongs();
}

init();
