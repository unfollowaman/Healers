const state = {
    songs: [],
    filteredSongs: [],
    queue: [],
    currentIndex: -1,
    isSeeking: false,
    activeView: 'home',
    preSearchView: 'home',
    favorites: JSON.parse(localStorage.getItem('murex_favorites') || '[]'),
    recentlyPlayed: JSON.parse(localStorage.getItem('murex_recently_played') || '[]'),
    playCounts: JSON.parse(localStorage.getItem('murex_play_counts') || '{}'),
    playlists: JSON.parse(localStorage.getItem('murex_playlists') || '{}')
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
    statSongsMobile: document.querySelector('#stat-songs-mobile'),
    statArtistsMobile: document.querySelector('#stat-artists-mobile'),
    statAlbumsMobile: document.querySelector('#stat-albums-mobile'),
    statDurationMobile: document.querySelector('#stat-duration-mobile'),
    mobileNowPlayingFullscreen: document.querySelector('#mobile-nowplaying-fullscreen'),
    mobileQueueList: document.querySelector('#mobile-queue-list'),
    mobileMiniPlayer: document.querySelector('#mobile-mini-player'),
    miniTitle: document.querySelector('#mini-title'),
    miniArtist: document.querySelector('#mini-artist'),
    miniPlayButton: document.querySelector('#mini-play-button'),
    recentlyAddedStrip: document.querySelector('#recently-added-strip'),
    allSongsCount: document.querySelector('#all-songs-count'),
    btnRecentlyAdded: document.querySelector('#btn-recently-added'),
    btnRecentlyAddedMobile: document.querySelector('#btn-recently-added-mobile'),
    mobileShuffleAll: document.querySelector('#mobile-shuffle-all'),
    mobileArtistList: document.querySelector('#mobile-artist-list'),
    mobileHomeQueueCard: document.querySelector('#mobile-home-queue-card'),
    desktopQueueTable: document.querySelector('#desktop-queue-table'),
    desktopShuffleAll: document.querySelector('#desktop-shuffle-all'),
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
    volumeSlider: document.querySelector('#volume-slider'),
    muteButton: document.querySelector('#mute-button'),
    fullVolumeButton: document.querySelector('#full-volume-button'),
    waveformCanvasMobile: document.querySelector('#waveform-canvas-mobile'),
    waveformCanvasDesktop: document.querySelector('#waveform-canvas-desktop'),
    desktopNowTitle: document.querySelector('#desktop-now-title'),
    desktopNowArtist: document.querySelector('#desktop-now-artist'),
    navItems: document.querySelectorAll('.nav-item'),
    tabButtons: document.querySelectorAll('.tab-btn'),
    playingQueue: document.querySelector('#playing-queue'),
    allSongsSection: document.querySelector('#all-songs-section'),
    recentlyAddedSection: document.querySelector('#recently-added-section'),
    sectionTitle: document.querySelector('.all-songs-section .section-title')
};

let isShuffle = false;
let repeatMode = 0; // 0: off, 1: all, 2: one
let unplayedIndices = [];

// Search toggle logic
let isSearchExpanded = false;

function toggleSearch() {
    if (window.innerWidth >= 900) {
        // Desktop is hover-based / focus-within based styling.
        // We just toggle focus to force it open or close for tap support.
        if (document.activeElement === elements.searchInput) {
            elements.searchInput.blur();
        } else {
            elements.searchInput.focus();
        }
        return;
    }

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

// --- Progress Track Styling ---
function updateRangeStyle(slider) {
    const percent = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.background = `linear-gradient(to right, #CC0000 ${percent}%, var(--surface) ${percent}%)`;
}

// --- Volume Slider Logic ---
function updateVolume() {
    const volume = Number(elements.volumeSlider.value) / 100;
    elements.audio.volume = Math.max(0, Math.min(1, volume));
    updateRangeStyle(elements.volumeSlider);
}

// Initial volume state setup
elements.audio.volume = 0.85;
updateRangeStyle(elements.volumeSlider);

// --- Waveform Canvas Logic ---
let audioCtx;
let analyser;
let source;
let dataArray;
let canvasCtxMobile;
let canvasCtxDesktop;

let cachedWaveformBg, cachedWaveformBar, cachedWaveformIdle;
function setupWaveform() {
    canvasCtxMobile = elements.waveformCanvasMobile.getContext('2d');
    canvasCtxDesktop = elements.waveformCanvasDesktop.getContext('2d');

    audioCtx = new(window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    source = audioCtx.createMediaElementSource(elements.audio);

    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    const rootStyles = getComputedStyle(document.documentElement);
    const bgStr = rootStyles.getPropertyValue("--waveform-bg").trim();
    cachedWaveformBg = bgStr.startsWith("var(") ? rootStyles.getPropertyValue(bgStr.substring(4, bgStr.length-1)).trim() : bgStr;
    if (!cachedWaveformBg) cachedWaveformBg = "#111111";
    const barStr = rootStyles.getPropertyValue("--waveform-bar").trim();
    cachedWaveformBar = barStr.startsWith("var(") ? rootStyles.getPropertyValue(barStr.substring(4, barStr.length-1)).trim() : barStr;
    if (!cachedWaveformBar) cachedWaveformBar = "#CC0000";
    const idleStr = rootStyles.getPropertyValue("--waveform-idle").trim();
    cachedWaveformIdle = idleStr.startsWith("var(") ? rootStyles.getPropertyValue(idleStr.substring(4, idleStr.length-1)).trim() : idleStr;
    if (!cachedWaveformIdle) cachedWaveformIdle = "#444444";
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

    ctx.fillStyle = cachedWaveformBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const barCount = 64;
    const gap = 3;
    const barWidth = (canvas.width - (barCount - 1) * gap) / barCount;
    const idleHeight = 4;

    ctx.fillStyle = cachedWaveformIdle;
    for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + gap);
        ctx.fillRect(x, canvas.height - idleHeight, barWidth, idleHeight);
    }
}

function drawActiveBarsForCanvas(canvas, ctx) {
    if (canvas.offsetWidth === 0) return;

    ctx.fillStyle = cachedWaveformBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const barCount = 64;
    const gap = 3;
    const barWidth = (canvas.width - (barCount - 1) * gap) / barCount;

    for (let i = 0; i < barCount; i++) {
        const value = dataArray[i];
        const barHeight = (value / 255) * canvas.height * 0.9;
        const x = i * (barWidth + gap);
        const y = canvas.height - barHeight;


        ctx.fillStyle = cachedWaveformBar;
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

function setStatus(message, {
    loading = false,
    error = false
} = {}) {
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
    if (elements.statSongsMobile) elements.statSongsMobile.textContent = songs;

    const artists = new Set(state.songs.map(s => s.performer || 'Unknown Artist')).size;
    elements.statArtists.textContent = artists;
    if (elements.statArtistsMobile) elements.statArtistsMobile.textContent = artists;

    // Assuming albums aren't available, we show Tracks and repeat song count
    elements.statAlbums.textContent = songs;
    if (elements.statAlbumsMobile) elements.statAlbumsMobile.textContent = songs;

    const totalSeconds = state.songs.reduce((acc, song) => acc + (song.duration || 0), 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    elements.statDuration.textContent = `${hours}h ${minutes}m`;
    if (elements.statDurationMobile) elements.statDurationMobile.textContent = `${hours}h ${minutes}m`;

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
        <div class="thumbnail-art" style="opacity: ${filteredIndex > -1 ? 1 : 0.5}">
          <button class="icon-button fav-button" data-fileid="${song.file_id}" type="button" aria-label="Favorite" style="width: 20px; height: 20px; position: absolute; top: 4px; right: 4px; display: block; background: transparent; box-shadow: none; z-index: 2;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="${state.favorites.includes(song.file_id) ? 'var(--accent)' : 'none'}" stroke="${state.favorites.includes(song.file_id) ? 'var(--accent)' : 'var(--text-muted)'}" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </button>
          <div class="hover-overlay">
            <div class="hover-overlay-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play"><polygon points="6 3 20 12 6 21 6 3"/></svg>
            </div>
          </div>
        </div>
        <div class="thumbnail-title">${escapeHtml(song.title)}</div>
        <div class="thumbnail-artist">${escapeHtml(song.performer || 'Unknown Artist')}</div>
      </div>
    `;
    }).join('');
}

function getArtistSummaries(limit = 4) {
    const artistMap = {};
    state.songs.forEach(song => {
        const names = (song.performer || 'Unknown Artist').split(',').map(name => name.trim()).filter(Boolean);
        (names.length ? names : ['Unknown Artist']).forEach(name => {
            artistMap[name] = (artistMap[name] || 0) + 1;
        });
    });

    return Object.entries(artistMap)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, limit)
        .map(([name, count]) => ({ name, count }));
}

function getArtworkGradient(song, index = 0) {
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
    const globalIdx = song ? state.songs.findIndex(s => s.file_id === song.file_id) : index;
    return gradients[Math.max(0, globalIdx) % gradients.length];
}

function renderDesktopHomePanels() {
    if (window.innerWidth < 900) return;

    if (elements.mobileArtistList) {
        const artists = getArtistSummaries(4);
        elements.mobileArtistList.innerHTML = artists.length ? artists.map(({ name, count }) => `
            <button class="mobile-artist-row" type="button" data-artist="${escapeHtml(name)}">
                <span class="artist-avatar">${escapeHtml(name.charAt(0).toUpperCase())}</span>
                <span class="artist-row-copy">
                    <strong>${escapeHtml(name)}</strong>
                    <span>${count} track${count !== 1 ? 's' : ''}</span>
                </span>
                <span class="artist-chevron" aria-hidden="true">›</span>
            </button>
        `).join('') : '<div class="mobile-empty-row">Artists will appear here after your library loads.</div>';
    }

    if (elements.desktopQueueTable) {
        const queueList = state.queue.length ? state.queue : state.songs.slice(0, 8);
        if (!queueList.length) {
            const totalSongsEl = document.getElementById('queue-total-songs');
            const totalDurationEl = document.getElementById('queue-total-duration');
            if (totalSongsEl) totalSongsEl.textContent = '0';
            if (totalDurationEl) totalDurationEl.textContent = '0:00';
            elements.desktopQueueTable.innerHTML = '<div class="desktop-empty-row">Your queue is ready when your library loads.</div>';
            return;
        }

        const totalSongsEl = document.getElementById('queue-total-songs');
        const totalDurationEl = document.getElementById('queue-total-duration');
        if (totalSongsEl) totalSongsEl.textContent = queueList.length;
        if (totalDurationEl) totalDurationEl.textContent = formatDuration(queueList.reduce((acc, song) => acc + (song.duration || 0), 0));

        elements.desktopQueueTable.innerHTML = `
            <div class="desktop-queue-head">
                <span>#</span><span>Song</span><span>Artist</span><span>Album</span><span>Duration</span><span>Added</span><span></span>
            </div>
            ${queueList.map((song, index) => {
                const isActive = getCurrentSong()?.file_id === song.file_id ? 'active' : '';
                return `
                <div class="desktop-queue-row ${isActive}" data-fileid="${song.file_id}">
                    <span class="desktop-queue-index">${index + 1}</span>
                    <span class="desktop-queue-song"><span class="desktop-queue-art" style="background: ${getArtworkGradient(song, index)}"></span><strong>${escapeHtml(song.title)}</strong></span>
                    <span>${escapeHtml(song.performer || 'Unknown Artist')}</span>
                    <span>${escapeHtml(song.album || `${song.title} - Single`)}</span>
                    <span>${formatDuration(song.duration)}</span>
                    <span>${index * 3 + 2} mins ago</span>
                    <button class="desktop-queue-menu" type="button" aria-label="More options">⋮</button>
                </div>
            `;
            }).join('')}
        `;
    }
}

function renderMobileHomePreviews() {
    if (elements.mobileArtistList) {
        const artists = getArtistSummaries(3);
        elements.mobileArtistList.innerHTML = artists.length ? artists.map(({ name, count }) => `
            <button class="mobile-artist-row" type="button" data-artist="${escapeHtml(name)}">
                <span class="artist-avatar">${escapeHtml(name.charAt(0).toUpperCase())}</span>
                <span class="artist-row-copy">
                    <strong>${escapeHtml(name)}</strong>
                    <span>${count} track${count !== 1 ? 's' : ''}</span>
                </span>
                <span class="artist-chevron" aria-hidden="true">›</span>
            </button>
        `).join('') : '<div class="mobile-empty-row">Artists will appear here after your library loads.</div>';
    }

    if (elements.mobileHomeQueueCard) {
        const song = getCurrentSong() || state.queue[0] || state.songs[0];
        if (!song) {
            elements.mobileHomeQueueCard.innerHTML = '<div class="mobile-empty-row">Your queue is ready when you are.</div>';
            return;
        }

        const globalIdx = Math.max(0, state.songs.findIndex(s => s.file_id === song.file_id));
        const gradients = [
            'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)',
            'linear-gradient(135deg, #2d1b33, #11998e, #38ef7d)',
            'linear-gradient(135deg, #373B44, #4286f4)'
        ];

        elements.mobileHomeQueueCard.innerHTML = `
            <div class="queue-preview-art" style="background: ${gradients[globalIdx % gradients.length]}"></div>
            <div class="queue-preview-copy">
                <strong>${escapeHtml(song.title)}</strong>
                <span>${escapeHtml(song.performer || 'Unknown Artist')}</span>
            </div>
            <button class="queue-overflow" type="button" aria-label="More queue options">⋮</button>
        `;
    }
}

function renderSongs() {
    updateStats();
    renderRecentlyAdded();
    renderMobileHomePreviews();
    renderDesktopHomePanels();

    if (window.innerWidth >= 900) {
        renderQueue();
    }

    const currentSong = getCurrentSong();
    const query = normalizeText(elements.searchInput.value);

    // If we are in Artists view
    if (!query && state.activeView === 'artists') {
        const artistMap = {};
        state.songs.forEach(s => {
            const perfs = (s.performer || 'Unknown Artist').split(',').map(p => p.trim());
            perfs.forEach(p => {
                if (!artistMap[p]) artistMap[p] = 0;
                artistMap[p]++;
            });
        });
        const artistKeys = Object.keys(artistMap).sort();

        // We will render them as cards, reusing the song-row styles somewhat or creating a simple grid.
        // The prompt says: "grid of artist cards... same neumorphic card style as a song row"
        elements.songList.innerHTML = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; padding: 16px;">' +
            artistKeys.map(artist => `
        <div class="song-row artist-card" style="margin: 0; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 4px;" data-artist="${escapeHtml(artist)}">
          <strong class="song-title">${escapeHtml(artist)}</strong>
          <span class="song-artist-sub" style="display:block">${artistMap[artist]} song${artistMap[artist] !== 1 ? 's' : ''}</span>
        </div>
      `).join('') + '</div>';

        hideStatus();
        elements.contentWrapper.hidden = false;
        return;
    }

    // If we are in Playlists view
    if (!query && state.activeView === 'playlists') {
        const plKeys = Object.keys(state.playlists).sort();
        elements.songList.innerHTML = `
      <div style="padding: 0 16px 16px 16px; display: flex; gap: 10px;">
        <input id="new-playlist-input" type="text" placeholder="New Playlist Name" style="flex: 1; border: none; background: var(--surface); box-shadow: var(--shadow-in-sm); border-radius: var(--radius-md); padding: 10px 16px; color: var(--ink); font-size: 14px; outline: none;">
        <button id="create-playlist-btn" class="quick-access-btn" style="flex-shrink: 0; padding: 10px 20px;">Create</button>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; padding: 0 16px 16px 16px;">
        ${plKeys.map(pl => `
          <div class="song-row playlist-card" style="margin: 0; display: flex; align-items: center; justify-content: space-between; gap: 8px;" data-playlist="${escapeHtml(pl)}">
            <div style="display: flex; flex-direction: column;">
               <strong class="song-title">${escapeHtml(pl)}</strong>
               <span class="song-artist-sub" style="display:block">${state.playlists[pl].length} song${state.playlists[pl].length !== 1 ? 's' : ''}</span>
            </div>
            <button class="icon-button delete-playlist-btn" type="button" aria-label="Delete Playlist" style="width: 24px; height: 24px; display: none; background: transparent; box-shadow: none;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="color: var(--text-muted);"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          </div>
        `).join('')}
      </div>
    `;
        hideStatus();
        elements.contentWrapper.hidden = false;
        return;
    }

    // If we are in Albums view
    if (!query && state.activeView === 'albums') {
        let hasAlbums = state.songs.some(s => s.album);
        if (!hasAlbums) {
            elements.songList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 14px; padding: 40px;">Album data isn't available from Telegram metadata yet.</div>`;
        } else {
            // Just in case
            elements.songList.innerHTML = '';
        }
        hideStatus();
        elements.contentWrapper.hidden = false;
        return;
    }

    // Empty states for Favorites / Recently Played / Most Played
    if (!query && state.filteredSongs.length === 0) {
        if (state.activeView === 'favorites') {
            elements.songList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 14px; padding: 40px;">No favorites yet. Tap the heart on any song to add it.</div>`;
            hideStatus();
            elements.contentWrapper.hidden = false;
            return;
        } else if (state.activeView === 'recently-played' || state.activeView === 'most-played') {
            elements.songList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 14px; padding: 40px;">Nothing played yet.</div>`;
            hideStatus();
            elements.contentWrapper.hidden = false;
            return;
        }
    }

    elements.songList.innerHTML = state.filteredSongs.map((song, index) => {
        const isActive = currentSong?.file_id === song.file_id;
        const buttonIcon = isActive && !elements.audio.paused ? '❚❚' : '▶';
        const isFav = state.favorites.includes(song.file_id);

        return `
      <article class="song-row ${isActive ? 'active' : ''}" data-index="${index}" tabindex="0" role="button" aria-label="Play ${escapeHtml(song.title)} by ${escapeHtml(song.performer || 'Unknown Artist')}">
        <div class="song-index">${index + 1}</div>
        <div class="song-details">
          <strong class="song-title">${escapeHtml(song.title)}</strong>
          <div class="song-artist-sub">${escapeHtml(song.performer || 'Unknown Artist')}</div>
        </div>
        <div class="song-artist-col">${escapeHtml(song.performer || 'Unknown Artist')}</div>
        <div class="song-duration">${formatDuration(song.duration)}</div>

        <button class="icon-button fav-button" data-fileid="${song.file_id}" type="button" aria-label="Favorite" style="width: 32px; height: 32px; position: absolute; right: 56px; display: none; background: transparent; box-shadow: none;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="${isFav ? 'var(--accent)' : 'none'}" stroke="${isFav ? 'var(--accent)' : 'var(--text-muted)'}" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        </button>

        ${state.activeView === 'playlist-filtered' ? `
          <button class="icon-button remove-playlist-btn" data-fileid="${song.file_id}" type="button" aria-label="Remove from Playlist" style="width: 28px; height: 28px; position: absolute; right: 90px; display: none; background: var(--bg); box-shadow: var(--shadow-out-sm);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color: var(--ink-soft)"><path d="M19 13H5v-2h14v2z"/></svg>
          </button>
        ` : `
          <button class="icon-button add-playlist-btn" data-fileid="${song.file_id}" type="button" aria-label="Add to Playlist" style="width: 28px; height: 28px; position: absolute; right: 90px; display: none; background: var(--bg); box-shadow: var(--shadow-out-sm); z-index: 5;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color: var(--ink-soft)"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          </button>
        `}


        <button class="song-play-button" type="button" aria-label="Play ${escapeHtml(song.title)}" tabindex="-1">
          ${buttonIcon === '▶' ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play"><polygon points="6 3 20 12 6 21 6 3"/></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pause"><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></svg>'}
        </button>
      </article>
    `;
    }).join('');

    if (!state.filteredSongs.length && state.songs.length === 0) {
        setStatus('No songs found. Upload audio to your Telegram channel then tap Refresh.');
        elements.contentWrapper.hidden = true;
    } else {
        hideStatus();
        elements.contentWrapper.hidden = false;
    }
}

function renderQueue() {
    const currentSong = getCurrentSong();

    // Desktop queue
    if (elements.playingQueue) {
        let queueList = state.filteredSongs;
        if (state.activeView === 'home' && !elements.searchInput.value) {
            queueList = state.songs;
        }

        elements.playingQueue.innerHTML = queueList.map((song, idx) => {
            const isActive = currentSong?.file_id === song.file_id;

            return `
        <div class="queue-row ${isActive ? 'active' : ''}" data-fileid="${song.file_id}">
            <div class="queue-thumbnail placeholder-flat"></div>
            <div class="queue-info">
            <div class="queue-title">${escapeHtml(song.title)}</div>
            <div class="queue-artist">${escapeHtml(song.performer || 'Unknown Artist')}</div>
            </div>
        </div>
        `;
        }).join('');

        renderDesktopHomePanels(); // Update the right column desktop queue too
    }

    // Mobile queue peek
    if (elements.mobileQueueList && state.queue.length > 0) {
        let upcoming = [];
        if (isShuffle) {
            upcoming = unplayedIndices.slice(0, 2).map(idx => state.queue[idx]);
        } else {
            let nextIdx1 = (state.currentIndex + 1) % state.queue.length;
            let nextIdx2 = (state.currentIndex + 2) % state.queue.length;

            if (state.currentIndex === state.queue.length - 1 && repeatMode === 0) {
                upcoming = []; // No more songs
            } else if (state.currentIndex === state.queue.length - 1 && repeatMode === 1) {
                upcoming = [state.queue[0], state.queue[1]].filter(Boolean);
            } else if (state.currentIndex === state.queue.length - 2 && repeatMode === 0) {
                upcoming = [state.queue[nextIdx1]];
            } else {
                upcoming = [state.queue[nextIdx1], state.queue[nextIdx2]].filter(Boolean);
            }
        }

        if (upcoming.length === 0) {
            elements.mobileQueueList.innerHTML = `<div style="color: var(--text-muted); font-size: 13px;">No songs in queue</div>`;
        } else {
            elements.mobileQueueList.innerHTML = upcoming.map((song) => {
                // Find index to be able to click and play
                const qIdx = state.queue.findIndex(s => s.file_id === song.file_id);
                return `
                <div class="mobile-queue-row" data-queueindex="${qIdx}">
                    <div class="mobile-queue-art" aria-hidden="true">
                        <span></span>
                    </div>
                    <div class="mobile-queue-copy">
                        <div class="mobile-queue-title">${escapeHtml(song.title)}</div>
                        <div class="mobile-queue-artist">${escapeHtml(song.performer || 'Unknown Artist')}</div>
                    </div>
                    <div class="mobile-queue-reorder" aria-hidden="true">
                        <span></span><span></span><span></span>
                    </div>
                </div>
                `;
            }).join('');
        }
    } else if (elements.mobileQueueList) {
        elements.mobileQueueList.innerHTML = `<div style="color: var(--text-muted); font-size: 13px;">No songs in queue</div>`;
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

    if (query) {
        // Treat as temporary Search Results view
        elements.sectionTitle.textContent = 'Search Results';
        elements.recentlyAddedSection.style.display = 'none';
        elements.allSongsSection.style.display = 'block';
        state.filteredSongs = state.songs.filter((song) => `${song.title} ${song.performer}`.toLowerCase().includes(query));
    } else {
        // Return to active nav view
        applyViewFilter();
    }

    renderSongs();
}

function applyViewFilter() {
    const view = state.activeView;
    let showRecent = false;
    let title = 'All Songs';
    let filtered = [...state.songs];

    if (view === 'home') {
        showRecent = true;
        title = 'All Songs';
    } else if (view === 'all-songs') {
        title = 'All Songs';
    } else if (view === 'artists') {
        // We will handle artist card rendering separately inside renderSongs
        title = 'Artists';
    } else if (view === 'albums') {
        title = 'Albums';
    } else if (view === 'playlists') {
        title = 'Playlists';
    } else if (view === 'favorites') {
        title = 'Favorites';
        filtered = state.songs.filter(s => state.favorites.includes(s.file_id));
    } else if (view === 'recently-played') {
        title = 'Recently Played';
        // Map file_ids to actual songs, in order of state.recentlyPlayed
        filtered = state.recentlyPlayed.map(entry => state.songs.find(s => s.file_id === entry.file_id)).filter(Boolean);
    } else if (view === 'most-played') {
        title = 'Most Played';
        filtered = state.songs.filter(s => state.playCounts[s.file_id] > 0)
            .sort((a, b) => state.playCounts[b.file_id] - state.playCounts[a.file_id]);
    }

    if (view === 'artist-filtered') {
        title = `Songs by ${state.selectedArtist}`;
        filtered = state.songs.filter(s => {
            const perfs = (s.performer || 'Unknown Artist').split(',').map(p => p.trim());
            return perfs.includes(state.selectedArtist);
        });
    }

    if (view === 'playlist-filtered') {
        title = `Playlist: ${state.selectedPlaylist}`;
        const plSongs = state.playlists[state.selectedPlaylist] || [];
        filtered = plSongs.map(id => state.songs.find(s => s.file_id === id)).filter(Boolean);
    }

    elements.sectionTitle.textContent = title;

    if (window.innerWidth >= 900) {
        elements.recentlyAddedSection.style.display = showRecent ? 'block' : 'none';
    } else {
        elements.recentlyAddedSection.style.display = 'block'; // Always visible on mobile
    }

    state.filteredSongs = filtered;
}

function switchNavView(viewName) {
    if (elements.searchInput.value) {
        elements.searchInput.value = '';
        elements.searchInput.classList.remove('expanded');
        isSearchExpanded = false;
    }

    state.activeView = viewName;

    elements.navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewName);
    });

    applyViewFilter();
    renderSongs();
}


async function loadSongs({
    refresh = false
} = {}) {
    setStatus(refresh ? 'Refreshing songs from Telegram…' : 'Loading songs from Telegram…', {
        loading: true
    });
    showSkeletonLoading();
    elements.refreshButton.disabled = true;

    try {
        const response = await fetch(`/api/songs${refresh ? '?refresh=1' : ''}`, {
            headers: {
                Accept: 'application/json'
            },
            cache: refresh ? 'no-store' : 'default'
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok || payload?.error) {
            if (payload?.error === 'Catalog store unavailable') {
                throw new Error('Could not reach catalog storage — try again shortly');
            }
            throw new Error(payload?.error || 'Unable to load songs.');
        }

        state.songs = Array.isArray(payload) ? payload : [];
        filterSongs();

        if (!state.songs.length) {
            setStatus('No audio messages were found. Make sure the bot can read channel posts and that the channel contains audio files.');
        }
    } catch (error) {
        setStatus(error.message || 'Unable to load songs from Telegram.', {
            error: true
        });
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
        if (elements.miniTitle) elements.miniTitle.textContent = 'Select a song';
        if (elements.miniArtist) elements.miniArtist.textContent = 'Ready to play';
        elements.totalTime.textContent = '0:00';
        return;
    }

    elements.nowTitle.textContent = song.title;
    elements.nowArtist.textContent = song.performer || 'Unknown Artist';
    elements.desktopNowTitle.textContent = song.title;
    elements.desktopNowArtist.textContent = song.performer || 'Unknown Artist';
    if (elements.miniTitle) elements.miniTitle.textContent = song.title;
    if (elements.miniArtist) elements.miniArtist.textContent = song.performer || 'Unknown Artist';
    elements.totalTime.textContent = formatDuration(song.duration);
}

function initShuffleQueue() {
    unplayedIndices = Array.from({
        length: state.queue.length
    }, (_, i) => i);
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

        if (window.innerWidth >= 900) {
            document.body.classList.add('is-playback-mode');
        }

        // Only apply top offset dynamically on mobile
        if (window.innerWidth < 900) {
            const headerHeight = elements.header.offsetHeight;
            const sepHeight = 14;
            const playerTop = headerHeight + sepHeight;
            elements.player.style.top = playerTop + 'px';

            requestAnimationFrame(() => {
                const playingPlayerHeight = elements.player.offsetHeight;
                // padding applied centrally based on mini player
            });
        }

        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        if (elements.mobileMiniPlayer) {
            elements.mobileMiniPlayer.style.display = 'flex';
        }
    } else if (!getCurrentSong()) {
        // Only go completely IDLE if stopped
        elements.player.classList.remove('player--playing');
        elements.bottomSeparator.style.display = 'block';
        elements.player.style.top = 'auto';
        // padding removed centrally

        if (elements.mobileMiniPlayer) {
            elements.mobileMiniPlayer.style.display = 'none';
        }

        document.body.classList.remove('is-playback-mode');
    }
}

async function startCurrentSong() {
    const song = getCurrentSong();
    if (!song) return;

    // Track Recent + Most Played
    state.recentlyPlayed = state.recentlyPlayed.filter(s => s.file_id !== song.file_id);
    state.recentlyPlayed.unshift({
        file_id: song.file_id,
        timestamp: Date.now()
    });
    if (state.recentlyPlayed.length > 50) state.recentlyPlayed.length = 50;
    localStorage.setItem('murex_recently_played', JSON.stringify(state.recentlyPlayed));

    state.playCounts[song.file_id] = (state.playCounts[song.file_id] || 0) + 1;
    localStorage.setItem('murex_play_counts', JSON.stringify(state.playCounts));

    if (state.activeView === 'recently-played' || state.activeView === 'most-played') {
        applyViewFilter(); // Immediate re-render
    }

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
            activeRow.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
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
            setStatus('Playback could not start. Please try selecting the song again.', {
                error: true
            });
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

    // Note: we now have an img inside elements.playButton
    // We can either replace its src, or replace the innerHTML.
    elements.playButton.innerHTML = isPlaying ?
        '<img id="play-icon-img" src="/assets/icons/pause.png" alt="Pause" width="28" height="28">' :
        '<img id="play-icon-img" src="/assets/icons/play.png" alt="Play" width="28" height="28">';

    elements.playButton.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');

    if (elements.miniPlayButton) {
        elements.miniPlayButton.innerHTML = isPlaying ?
            '<img src="/assets/icons/pause.png" alt="Pause" width="16" height="16">' :
            '<img src="/assets/icons/play.png" alt="Play" width="16" height="16">';
        elements.miniPlayButton.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
    }

    if (elements.mobileMiniPlayer) {
        if (isPlaying) {
            elements.mobileMiniPlayer.classList.add('is-playing');
        } else {
            elements.mobileMiniPlayer.classList.remove('is-playing');
        }
    }

    renderSongs();
}

function updateProgress() {
    if (state.isSeeking) return;

    const duration = elements.audio.duration || getCurrentSong()?.duration || 0;
    const current = elements.audio.currentTime || 0;
    const percent = duration ? (current / duration) * 100 : 0;

    elements.progressBar.value = String(percent);
    updateRangeStyle(elements.progressBar);
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
    if (elements.navItems) {
        elements.navItems.forEach(item => {
            item.addEventListener('click', () => {
                switchNavView(item.dataset.view);
            });
        });
    }

    if (elements.tabButtons) {
        elements.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;

                // Update active class on tab buttons
                elements.tabButtons.forEach(b => b.classList.remove('tab-active'));
                btn.classList.add('tab-active');

                // Switch mobile views
                document.querySelectorAll('.mobile-view').forEach(v => {
                    v.style.display = 'none';
                    v.classList.remove('active-view');
                });

                const targetView = document.getElementById(`mobile-view-${tab}`);
                if (targetView) {
                    targetView.style.display = 'block';
                    targetView.classList.add('active-view');
                }

                if (tab === 'home') switchNavView('home');
                else if (tab === 'songs') switchNavView('all-songs');
                else if (tab === 'artists') switchNavView('artists');
                else if (tab === 'library') switchNavView('albums');
                else if (tab === 'more') switchNavView('playlists');
            });
        });
    }

    if (elements.desktopShuffleAll) {
        elements.desktopShuffleAll.addEventListener('click', () => {
            if (!state.songs.length) return;
            state.queue = [...state.songs];
            state.filteredSongs = [...state.songs];
            isShuffle = true;
            if (elements.shuffleButton) {
                elements.shuffleButton.classList.add('is-active');
                elements.shuffleButton.setAttribute('aria-pressed', 'true');
            }
            state.currentIndex = Math.floor(Math.random() * state.queue.length);
            initShuffleQueue();
            startCurrentSong();
        });
    }

    if (elements.mobileShuffleAll) {
        elements.mobileShuffleAll.addEventListener('click', () => {
            if (!state.songs.length) return;
            state.queue = [...state.songs];
            state.filteredSongs = [...state.songs];
            isShuffle = true;
            if (elements.shuffleButton) {
                elements.shuffleButton.classList.add('is-active');
                elements.shuffleButton.setAttribute('aria-pressed', 'true');
            }
            state.currentIndex = Math.floor(Math.random() * state.queue.length);
            initShuffleQueue();
            startCurrentSong();
        });
    }

    const btnClearQueue = document.getElementById('desktop-clear-queue-btn');
    if (btnClearQueue) {
        btnClearQueue.addEventListener('click', () => {
            state.queue = [];
            state.currentIndex = -1;
            elements.audio.pause();
            elements.audio.currentTime = 0;
            setPlayerPlayingState(false);
            renderSongs();
        });
    }
    const btnSaveQueue = document.getElementById('desktop-save-queue-btn');
    if (btnSaveQueue) {
        btnSaveQueue.addEventListener('click', () => alert('Save as Playlist clicked'));
    }

    if (elements.btnRecentlyAddedMobile) {
        elements.btnRecentlyAddedMobile.addEventListener('click', () => {
            document.querySelector('#recently-added-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    document.querySelectorAll('[data-mobile-target]').forEach(link => {
        link.addEventListener('click', () => {
            document.querySelector(`.tab-btn[data-tab="${link.dataset.mobileTarget}"]`)?.click();
        });
    });

    if (elements.mobileArtistList) {
        elements.mobileArtistList.addEventListener('click', (e) => {
            const row = e.target.closest('.mobile-artist-row');
            if (!row) return;
            state.selectedArtist = row.dataset.artist;
            state.activeView = 'artist-filtered';
            applyViewFilter();
            renderSongs();
        });
    }

    if (elements.mobileQueueList) {
        elements.mobileQueueList.addEventListener('click', (e) => {
            const row = e.target.closest('.mobile-queue-row');
            if (!row) return;
            const qIdx = Number(row.dataset.queueindex);
            if (!isNaN(qIdx) && qIdx >= 0 && qIdx < state.queue.length) {
                state.currentIndex = qIdx;
                startCurrentSong();
            }
        });
    }

    // Mini Player Events
    if (elements.mobileMiniPlayer) {
        elements.mobileMiniPlayer.addEventListener('click', (e) => {
            // Check if play/pause button was clicked
            if (e.target.closest('#mini-play-button')) {
                e.stopPropagation();
                togglePlayPause();
            } else if (elements.mobileNowPlayingFullscreen) {
                elements.mobileNowPlayingFullscreen.classList.add('is-open');
            }
        });
    }

    if (elements.playingQueue) {
        elements.playingQueue.addEventListener('click', (e) => {
            const row = e.target.closest('.queue-row');
            if (!row) return;
            const fileId = row.dataset.fileid;

            let targetList = state.filteredSongs;
            if (state.activeView === 'home' && !elements.searchInput.value) {
                targetList = state.songs;
            }

            const idx = targetList.findIndex(s => s.file_id === fileId);
            if (idx !== -1) {
                // We need to set state queue and index
                if (getCurrentSong()?.file_id === fileId) {
                    togglePlayPause();
                    return;
                }
                state.queue = [...targetList];
                state.currentIndex = idx;
                if (isShuffle) initShuffleQueue();
                startCurrentSong();
            }
        });
    }

    elements.searchInput.addEventListener('input', filterSongs);
    elements.searchInput.addEventListener('transitionend', (e) => {
        if (window.innerWidth >= 900 && e.propertyName === 'width') {
            const width = parseFloat(getComputedStyle(elements.searchInput).width);
            if (width < 10) {
                elements.searchInput.value = '';
                filterSongs();
            }
        }
    });

    elements.searchToggle.addEventListener('click', toggleSearch);
    elements.refreshButton.addEventListener('click', () => loadSongs({
        refresh: true
    }));

    if (elements.btnRecentlyAdded) {
        elements.btnRecentlyAdded.addEventListener('click', () => {
            document.querySelector('#all-songs-section').scrollIntoView({
                behavior: 'smooth'
            });
        });
    }

    const handleSongClick = (event) => {
        // Handle playlist create button before we check for rows/cards
        if (event.target.closest('#create-playlist-btn')) {
            const input = document.getElementById('new-playlist-input');
            const name = input.value.trim();
            if (name && !state.playlists[name]) {
                state.playlists[name] = [];
                localStorage.setItem('murex_playlists', JSON.stringify(state.playlists));
                applyViewFilter();
                renderSongs();
            }
            return;
        }

        const item = event.target.closest('.song-row, .thumbnail-card');
        if (!item) return;

        if (item.classList.contains('artist-card')) {
            state.activeView = 'artist-filtered';
            state.selectedArtist = item.dataset.artist;
            applyViewFilter();
            renderSongs();
            return;
        }


        // Playlist interactions

        if (item.classList.contains('playlist-card')) {
            if (event.target.closest('.delete-playlist-btn')) {
                event.stopPropagation();
                const plName = item.dataset.playlist;
                if (confirm(`Delete playlist "${plName}"?`)) {
                    delete state.playlists[plName];
                    localStorage.setItem('murex_playlists', JSON.stringify(state.playlists));
                    applyViewFilter();
                    renderSongs();
                }
                return;
            }
            state.activeView = 'playlist-filtered';
            state.selectedPlaylist = item.dataset.playlist;
            applyViewFilter();
            renderSongs();
            return;
        }

        if (event.target.closest('.remove-playlist-btn')) {
            event.stopPropagation();
            const fileId = event.target.closest('.remove-playlist-btn').dataset.fileid;
            const plName = state.selectedPlaylist;
            state.playlists[plName] = state.playlists[plName].filter(id => id !== fileId);
            localStorage.setItem('murex_playlists', JSON.stringify(state.playlists));
            applyViewFilter();
            renderSongs();
            return;
        }

        if (event.target.closest('.add-playlist-btn')) {
            event.stopPropagation();

            // Close any existing dropdowns
            document.querySelectorAll('.playlist-dropdown').forEach(el => el.remove());

            const btn = event.target.closest('.add-playlist-btn');
            const fileId = btn.dataset.fileid;
            const plKeys = Object.keys(state.playlists).sort();

            const dropdown = document.createElement('div');
            dropdown.className = 'playlist-dropdown';
            dropdown.innerHTML = plKeys.map(pl => `
        <div class="playlist-dropdown-item" data-action="add" data-playlist="${escapeHtml(pl)}">${escapeHtml(pl)}</div>
      `).join('') + `<div class="playlist-dropdown-item" data-action="new">New playlist...</div>`;

            dropdown.addEventListener('click', (e) => {
                e.stopPropagation();
                const option = e.target.closest('.playlist-dropdown-item');
                if (!option) return;

                if (option.dataset.action === 'add') {
                    const plName = option.dataset.playlist;
                    if (!state.playlists[plName].includes(fileId)) {
                        state.playlists[plName].push(fileId);
                        localStorage.setItem('murex_playlists', JSON.stringify(state.playlists));
                    }
                    dropdown.remove();
                } else if (option.dataset.action === 'new') {
                    const name = prompt("Enter new playlist name:");
                    if (name && name.trim()) {
                        const trimmed = name.trim();
                        if (!state.playlists[trimmed]) state.playlists[trimmed] = [];
                        if (!state.playlists[trimmed].includes(fileId)) {
                            state.playlists[trimmed].push(fileId);
                        }
                        localStorage.setItem('murex_playlists', JSON.stringify(state.playlists));
                    }
                    dropdown.remove();
                }
            });

            btn.parentElement.appendChild(dropdown);

            // Close on outside click
            setTimeout(() => {
                const closeHandler = () => {
                    dropdown.remove();
                    document.removeEventListener('click', closeHandler);
                };
                document.addEventListener('click', closeHandler);
            }, 0);

            return;
        }

        if (event.target.closest('.fav-button')) {
            event.stopPropagation();
            const fileId = event.target.closest('.fav-button').dataset.fileid;
            if (state.favorites.includes(fileId)) {
                state.favorites = state.favorites.filter(id => id !== fileId);
            } else {
                state.favorites.push(fileId);
            }
            localStorage.setItem('murex_favorites', JSON.stringify(state.favorites));

            if (state.activeView === 'favorites') {
                applyViewFilter();
            }
            renderSongs();
            return;
        }
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
        setStatus('This track could not be streamed. Refresh the library and try again.', {
            error: true
        });
    });

    elements.progressBar.addEventListener('input', () => {
        state.isSeeking = true;
        updateRangeStyle(elements.progressBar);
        const duration = elements.audio.duration || getCurrentSong()?.duration || 0;
        elements.currentTime.textContent = formatDuration((Number(elements.progressBar.value) / 100) * duration);
    });
    elements.progressBar.addEventListener('change', seekToProgress);

    // Volume Slider Events
    elements.volumeSlider.addEventListener('input', updateVolume);

    if (elements.muteButton) {
        elements.muteButton.addEventListener('click', () => {
            elements.volumeSlider.value = 0;
            updateVolume();
        });
    }

    if (elements.fullVolumeButton) {
        elements.fullVolumeButton.addEventListener('click', () => {
            elements.volumeSlider.value = 100;
            updateVolume();
        });
    }

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


function updateSidebarOffset() {
    if (window.innerWidth >= 900) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && elements.header) {
            const headerHeight = elements.header.offsetHeight;
            const sepHeight = 14; // The top separator
            const offset = headerHeight + sepHeight;
            sidebar.style.top = offset + 'px';
            sidebar.style.height = 'calc(100vh - ' + offset + 'px - 20px)';
        }
    }
}
window.addEventListener('resize', updateSidebarOffset);
// Call once on init

function init() {
    updateSidebarOffset();
    updateVolume();
    bindEvents();
    loadSongs();
}

init();
