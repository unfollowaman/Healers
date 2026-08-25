const state = {
    songs: [],
    currentIndex: -1,
    isSeeking: false,
    isMoreOpen: false,
    isNavMenuOpen: false,
    activeNavOption: 'all-songs',
    isShuffle: false,
    shuffledIndices: [],
    shuffleCurrentPos: -1,
    repeatMode: 'off', // 'off' | 'all' | 'one'
    isQueueOpen: false,
    isMuted: false,
    volume: 1,
    isSongsOverlayOpen: false,
    sortOrder: 'newest', // 'newest' | 'oldest' | 'alphabetical'

    // Playlist State
    playlists: [],
    activePlaylistId: null,
    isPlaylistOverlayOpen: false,
    playlistSearchQuery: '',
    playlistSortOrder: 'custom', // 'custom' | 'title' | 'artist' | 'newest' | 'duration'
    isEditingPlaylist: false,
    modalSearchQuery: '',

    // Artists State
    isArtistsOverlayOpen: false,
    activeArtistName: null,
    artistSearchQuery: '',
    artistSortOrder: 'alphabetical', // 'alphabetical' | 'count' | 'recent'
    artistViewMode: 'grid', // 'grid' | 'list'

    // Stats State
    isStatsOverlayOpen: false,
    statsTimeRange: 'week', // 'week' | 'month' | 'year' | 'all' | 'custom'
    customStartDate: null,
    customEndDate: null,
    playHistory: []
};

const elements = {
    topNavContainer: document.querySelector('.top-nav-container'),
    hamburgerButton: document.querySelector('#hamburger-button'),
    navDropdown: document.querySelector('#nav-dropdown'),
    navMenuItems: document.querySelectorAll('.nav-menu-item'),
    audio: document.querySelector('#audio-player'),
    albumArtPlaceholder: document.querySelector('#album-art-placeholder'),
    nowTitle: document.querySelector('#now-title'),
    nowArtist: document.querySelector('#now-artist'),
    progressBar: document.querySelector('#progress-bar'),
    currentTime: document.querySelector('#current-time'),
    totalTime: document.querySelector('#total-time'),
    prevButton: document.querySelector('#prev-button'),
    playButton: document.querySelector('#play-button'),
    playIconSvg: document.querySelector('#play-icon-svg'),
    nextButton: document.querySelector('#next-button'),

    moreTab: document.querySelector('#more-tab'),
    moreChevron: document.querySelector('#more-chevron'),
    playerDropdown: document.querySelector('#player-dropdown'),
    shuffleButton: document.querySelector('#shuffle-button'),
    repeatButton: document.querySelector('#repeat-button'),
    repeatLabel: document.querySelector('#repeat-label'),
    queueButton: document.querySelector('#queue-button'),
    queueContainer: document.querySelector('#queue-container'),
    queueList: document.querySelector('#queue-list'),
    muteButton: document.querySelector('#mute-button'),
    volumeIcon: document.querySelector('#volume-icon'),
    volumeBar: document.querySelector('#volume-bar'),

    songsOverlay: document.querySelector('#songs-overlay'),
    songsBackButton: document.querySelector('#songs-back-button'),
    sortSelect: document.querySelector('#sort-select'),
    songsList: document.querySelector('#songs-list'),
    playerContainer: document.querySelector('#player-container'),

    // Playlist Elements
    playlistOverlay: document.querySelector('#playlist-overlay'),
    playlistsHubView: document.querySelector('#playlists-hub-view'),
    playlistsBackBtn: document.querySelector('#playlists-back-btn'),
    createPlaylistBtn: document.querySelector('#create-playlist-btn'),
    playlistsGrid: document.querySelector('#playlists-grid'),

    playlistDetailView: document.querySelector('#playlist-detail-view'),
    plDetailBackBtn: document.querySelector('#pl-detail-back-btn'),
    plCoverGrid: document.querySelector('#pl-cover-grid'),
    plTitle: document.querySelector('#pl-title'),
    plTitleInput: document.querySelector('#pl-title-input'),
    plOwner: document.querySelector('#pl-owner'),
    plDescription: document.querySelector('#pl-description'),
    plDescriptionInput: document.querySelector('#pl-description-input'),
    plTrackCount: document.querySelector('#pl-track-count'),
    plTotalDuration: document.querySelector('#pl-total-duration'),
    plLastUpdated: document.querySelector('#pl-last-updated'),

    plPlayBtn: document.querySelector('#pl-play-btn'),
    plShuffleBtn: document.querySelector('#pl-shuffle-btn'),
    plOfflineBtn: document.querySelector('#pl-offline-btn'),
    plOfflineLabel: document.querySelector('#pl-offline-label'),
    plAddSongsBtn: document.querySelector('#pl-add-songs-btn'),
    plEditBtn: document.querySelector('#pl-edit-btn'),
    plEditLabel: document.querySelector('#pl-edit-label'),
    plShareBtn: document.querySelector('#pl-share-btn'),
    plDeleteBtn: document.querySelector('#pl-delete-btn'),

    plSearchInput: document.querySelector('#pl-search-input'),
    plSortSelect: document.querySelector('#pl-sort-select'),
    plTrackList: document.querySelector('#pl-track-list'),
    plEmptyState: document.querySelector('#pl-empty-state'),
    plEmptyAddBtn: document.querySelector('#pl-empty-add-btn'),

    plRecommendations: document.querySelector('#pl-recommendations'),
    recsList: document.querySelector('#recs-list'),

    addSongsModal: document.querySelector('#add-songs-modal'),
    closeModalBtn: document.querySelector('#close-modal-btn'),
    modalSearchInput: document.querySelector('#modal-search-input'),
    modalSongList: document.querySelector('#modal-song-list'),
    toastContainer: document.querySelector('#toast-container'),

    // Artists Elements
    artistsOverlay: document.querySelector('#artists-overlay'),
    artistsHubView: document.querySelector('#artists-hub-view'),
    artistsBackBtn: document.querySelector('#artists-back-btn'),
    artistsCountBadge: document.querySelector('#artists-count-badge'),
    artistsSearchInput: document.querySelector('#artists-search-input'),
    artistsSortSelect: document.querySelector('#artists-sort-select'),
    artistViewGridBtn: document.querySelector('#artist-view-grid-btn'),
    artistViewListBtn: document.querySelector('#artist-view-list-btn'),
    artistsGrid: document.querySelector('#artists-grid'),
    artistsListContainer: document.querySelector('#artists-list-container'),
    artistsList: document.querySelector('#artists-list'),
    artistsEmptyState: document.querySelector('#artists-empty-state'),

    artistDetailView: document.querySelector('#artist-detail-view'),
    artistDetailBackBtn: document.querySelector('#artist-detail-back-btn'),
    artistDetailAvatar: document.querySelector('#artist-detail-avatar'),
    artistDetailName: document.querySelector('#artist-detail-name'),
    artistDetailTrackCount: document.querySelector('#artist-detail-track-count'),
    artistDetailTotalDuration: document.querySelector('#artist-detail-total-duration'),
    artistPlayBtn: document.querySelector('#artist-play-btn'),
    artistShuffleBtn: document.querySelector('#artist-shuffle-btn'),
    artistQueueBtn: document.querySelector('#artist-queue-btn'),
    artistTrackList: document.querySelector('#artist-track-list'),

    // Stats Elements
    statsOverlay: document.querySelector('#stats-overlay'),
    statsBackBtn: document.querySelector('#stats-back-btn'),
    statsRangePills: document.querySelector('#stats-range-pills'),
    customRangeInputs: document.querySelector('#custom-range-inputs'),
    statsStartDate: document.querySelector('#stats-start-date'),
    statsEndDate: document.querySelector('#stats-end-date'),
    applyCustomRangeBtn: document.querySelector('#apply-custom-range-btn'),

    statTotalTime: document.querySelector('#stat-total-time'),
    statTotalTracks: document.querySelector('#stat-total-tracks'),
    statUniqueArtists: document.querySelector('#stat-unique-artists'),
    statAvgDaily: document.querySelector('#stat-avg-daily'),

    topArtistsList: document.querySelector('#top-artists-list'),
    topSongsList: document.querySelector('#top-songs-list'),
    topAlbumsList: document.querySelector('#top-albums-list'),

    activityChartBars: document.querySelector('#activity-chart-bars'),
    genreBarsContainer: document.querySelector('#genre-bars-container'),

    statNewArtists: document.querySelector('#stat-new-artists'),
    statStreakDays: document.querySelector('#stat-streak-days'),
    statMostRepeatedTitle: document.querySelector('#stat-most-repeated-title'),
    statMostRepeatedCount: document.querySelector('#stat-most-repeated-count'),

    recentHistoryList: document.querySelector('#recent-history-list')
};

function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
    const rounded = Math.floor(seconds);
    const minutes = Math.floor(rounded / 60);
    const remainder = String(rounded % 60).padStart(2, '0');
    return `${minutes}:${remainder}`;
}

function getCurrentSong() {
    return state.songs[state.currentIndex] || null;
}

function updateRangeStyle(slider) {
    const percent = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.background = `linear-gradient(to right, rgba(255, 255, 255, 0.9) ${percent}%, rgba(255, 255, 255, 0.2) ${percent}%)`;
}

function resetAlbumArtRotation() {
    if (!elements.albumArtPlaceholder) return;
    elements.albumArtPlaceholder.style.animation = 'none';
    // Force reflow to restart CSS animation from 0deg
    void elements.albumArtPlaceholder.offsetWidth;
    elements.albumArtPlaceholder.style.animation = '';
}

function updateNowPlaying(song) {
    resetAlbumArtRotation();

    if (!song) {
        elements.nowTitle.textContent = 'No Song Loaded';
        elements.nowArtist.textContent = 'Ready to play';
        elements.currentTime.textContent = '0:00';
        elements.totalTime.textContent = '0:00';
        elements.albumArtPlaceholder.innerHTML = '';
        return;
    }

    elements.nowTitle.textContent = song.title || 'Untitled';
    elements.nowArtist.textContent = song.performer || 'Unknown Artist';
    elements.totalTime.textContent = formatDuration(song.duration);

    if (song.coverFileId) {
        elements.albumArtPlaceholder.innerHTML = `
            <img src="/api/cover?file_id=${encodeURIComponent(song.coverFileId)}" alt="" onerror="this.parentElement.innerHTML=''">
        `;
    } else {
        elements.albumArtPlaceholder.innerHTML = '';
    }
}

function generateShuffleOrder(startIndex) {
    if (!state.songs.length) return [];
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
}

function toggleShuffle() {
    state.isShuffle = !state.isShuffle;
    if (elements.shuffleButton) {
        elements.shuffleButton.classList.toggle('active', state.isShuffle);
    }
    if (state.isShuffle) {
        state.shuffledIndices = generateShuffleOrder(state.currentIndex);
        state.shuffleCurrentPos = 0;
    }
    if (state.isQueueOpen) renderQueueList();
}

function cycleRepeatMode() {
    if (state.repeatMode === 'off') {
        state.repeatMode = 'all';
    } else if (state.repeatMode === 'all') {
        state.repeatMode = 'one';
    } else {
        state.repeatMode = 'off';
    }

    if (elements.repeatLabel) {
        if (state.repeatMode === 'off') elements.repeatLabel.textContent = 'Off';
        else if (state.repeatMode === 'all') elements.repeatLabel.textContent = 'All';
        else if (state.repeatMode === 'one') elements.repeatLabel.textContent = 'One';
    }

    if (elements.repeatButton) {
        elements.repeatButton.classList.toggle('active', state.repeatMode !== 'off');
    }
}

let progressAnimationFrame = null;

function startProgressLoop() {
    cancelProgressLoop();
    function step() {
        updateProgress();
        if (elements.audio && !elements.audio.paused && !elements.audio.ended) {
            progressAnimationFrame = requestAnimationFrame(step);
        } else {
            progressAnimationFrame = null;
        }
    }
    progressAnimationFrame = requestAnimationFrame(step);
}

function cancelProgressLoop() {
    if (progressAnimationFrame) {
        cancelAnimationFrame(progressAnimationFrame);
        progressAnimationFrame = null;
    }
}

function handleTrackEnded() {
    cancelProgressLoop();
    if (state.repeatMode === 'one') {
        if (elements.audio) {
            elements.audio.currentTime = 0;
            elements.audio.play().catch((err) => console.warn('Repeat one play error:', err));
        }
        return;
    }
    playNext();
}

function toggleNavMenu() {
    state.isNavMenuOpen = !state.isNavMenuOpen;
    if (elements.navDropdown && elements.hamburgerButton) {
        elements.navDropdown.classList.toggle('hidden', !state.isNavMenuOpen);
        elements.hamburgerButton.classList.toggle('open', state.isNavMenuOpen);
        elements.hamburgerButton.setAttribute('aria-expanded', String(state.isNavMenuOpen));
    }
}

function closeNavMenu() {
    if (!state.isNavMenuOpen) return;
    state.isNavMenuOpen = false;
    if (elements.navDropdown && elements.hamburgerButton) {
        elements.navDropdown.classList.add('hidden');
        elements.hamburgerButton.classList.remove('open');
        elements.hamburgerButton.setAttribute('aria-expanded', 'false');
    }
}

function showToast(message) {
    if (!elements.toastContainer) return;
    elements.toastContainer.innerHTML = '';
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2200);
}

/* ==========================================================================
   ARTISTS DATA & UTILITIES
   ========================================================================== */

function getArtistInitials(name) {
    if (!name || name === 'Unknown Artist') return '?';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

function getArtistGradient(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h1 = Math.abs(hash) % 360;
    const h2 = (h1 + 40) % 360;
    return `linear-gradient(135deg, hsl(${h1}, 65%, 40%), hsl(${h2}, 75%, 25%))`;
}

function renderArtistAvatar(artist, container, isLarge = false) {
    if (!container) return;
    container.innerHTML = '';

    const avatarDiv = document.createElement('div');
    avatarDiv.className = `artist-avatar ${isLarge ? 'artist-avatar-large' : ''}`;

    if (artist.covers && artist.covers.length > 0) {
        const coverId = artist.covers[0];
        const img = document.createElement('img');
        img.src = `/api/cover?file_id=${encodeURIComponent(coverId)}`;
        img.alt = artist.name;
        img.onerror = function() {
            // Fallback to initial gradient if image fails to load
            this.remove();
            avatarDiv.style.background = getArtistGradient(artist.name);
            avatarDiv.innerHTML = `<span class="artist-initials">${getArtistInitials(artist.name)}</span>`;
        };
        avatarDiv.appendChild(img);
    } else {
        avatarDiv.style.background = getArtistGradient(artist.name);
        avatarDiv.innerHTML = `<span class="artist-initials">${getArtistInitials(artist.name)}</span>`;
    }

    container.appendChild(avatarDiv);
}

function renderArtistsHub() {
    const artists = getArtistsList();

    if (elements.artistsCountBadge) {
        elements.artistsCountBadge.textContent = `${artists.length} artist${artists.length === 1 ? '' : 's'}`;
    }

    if (artists.length === 0) {
        if (elements.artistsEmptyState) elements.artistsEmptyState.classList.remove('hidden');
        if (elements.artistsGrid) elements.artistsGrid.classList.add('hidden');
        if (elements.artistsListContainer) elements.artistsListContainer.classList.add('hidden');
        return;
    } else {
        if (elements.artistsEmptyState) elements.artistsEmptyState.classList.add('hidden');
    }

    if (state.artistViewMode === 'grid') {
        if (elements.artistsGrid) elements.artistsGrid.classList.remove('hidden');
        if (elements.artistsListContainer) elements.artistsListContainer.classList.add('hidden');
        renderArtistsGrid(artists);
    } else {
        if (elements.artistsGrid) elements.artistsGrid.classList.add('hidden');
        if (elements.artistsListContainer) elements.artistsListContainer.classList.remove('hidden');
        renderArtistsList(artists);
    }
}

function renderArtistsGrid(artists) {
    if (!elements.artistsGrid) return;
    elements.artistsGrid.innerHTML = '';

    artists.forEach((artist) => {
        const card = document.createElement('div');
        card.className = 'artist-grid-card';

        const avatarWrapper = document.createElement('div');
        avatarWrapper.className = 'artist-card-avatar-wrapper';
        renderArtistAvatar(artist, avatarWrapper, false);

        // Hover Play Overlay
        const playOverlay = document.createElement('div');
        playOverlay.className = 'artist-play-overlay';
        playOverlay.innerHTML = `
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
        `;
        avatarWrapper.appendChild(playOverlay);

        const infoDiv = document.createElement('div');
        infoDiv.className = 'artist-card-info';
        infoDiv.innerHTML = `
            <span class="artist-card-name">${artist.name}</span>
            <span class="artist-card-count">${artist.songs.length} song${artist.songs.length === 1 ? '' : 's'}</span>
        `;

        card.appendChild(avatarWrapper);
        card.appendChild(infoDiv);

        card.addEventListener('click', () => {
            state.activeArtistName = artist.name;
            showArtistDetailView();
        });

        // Quick play on overlay click
        playOverlay.addEventListener('click', (e) => {
            e.stopPropagation();
            playArtistSongs(artist, false);
        });

        // Context menu quick actions
        card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showArtistContextMenu(e, artist);
        });

        elements.artistsGrid.appendChild(card);
    });
}

function openArtistsOverlay() {
    state.isArtistsOverlayOpen = true;
    if (elements.artistsOverlay) elements.artistsOverlay.classList.remove('hidden');
    if (elements.playerContainer) elements.playerContainer.classList.add('fixed-bottom');

    if (state.activeArtistName) {
        showArtistDetailView();
    } else {
        showArtistsHubView();
    }
}

function closeArtistsOverlay() {
    state.isArtistsOverlayOpen = false;
    if (elements.artistsOverlay) elements.artistsOverlay.classList.add('hidden');
    if (!state.isSongsOverlayOpen && !state.isPlaylistOverlayOpen && elements.playerContainer) {
        elements.playerContainer.classList.remove('fixed-bottom');
    }
}

function showArtistsHubView() {
    state.activeArtistName = null;
    if (elements.artistsHubView) elements.artistsHubView.classList.remove('hidden');
    if (elements.artistDetailView) elements.artistDetailView.classList.add('hidden');
    renderArtistsHub();
}

function showArtistDetailView() {
    if (elements.artistsHubView) elements.artistsHubView.classList.add('hidden');
    if (elements.artistDetailView) elements.artistDetailView.classList.remove('hidden');
    renderArtistDetail();
}

function getActiveArtist() {
    if (!state.activeArtistName) return null;
    const artists = getArtistsList();
    return artists.find((a) => a.name === state.activeArtistName) || null;
}

function renderArtistDetail() {
    const artist = getActiveArtist();
    if (!artist) {
        showArtistsHubView();
        return;
    }

    // Avatar
    renderArtistAvatar(artist, elements.artistDetailAvatar, true);

    // Metadata
    if (elements.artistDetailName) elements.artistDetailName.textContent = artist.name;

    const count = artist.songs.length;
    const mins = Math.ceil(artist.totalDuration / 60);

    if (elements.artistDetailTrackCount) elements.artistDetailTrackCount.textContent = `${count} track${count === 1 ? '' : 's'}`;
    if (elements.artistDetailTotalDuration) elements.artistDetailTotalDuration.textContent = `${mins} min`;

    renderArtistTracks(artist);
}

function renderArtistTracks(artist) {
    if (!elements.artistTrackList) return;
    elements.artistTrackList.innerHTML = '';

    const currentSong = getCurrentSong();
    const isPlaying = elements.audio && !elements.audio.paused && !elements.audio.ended;

    artist.songs.forEach((song, displayIdx) => {
        const isCurrentActive = currentSong && currentSong.file_id === song.file_id;

        const li = document.createElement('li');
        li.className = `pl-track-item ${isCurrentActive ? 'active' : ''}`;

        let numHtml = '';
        if (isCurrentActive && isPlaying) {
            numHtml = `
                <div class="equalizer-visualizer" style="padding: 4px; border-radius: 4px;">
                    <span class="equalizer-bar"></span>
                    <span class="equalizer-bar"></span>
                    <span class="equalizer-bar"></span>
                    <span class="equalizer-bar"></span>
                </div>
            `;
        } else {
            numHtml = `
                <span class="track-index-num">${displayIdx + 1}</span>
                <span class="track-play-hover">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                </span>
            `;
        }

        let thumbHtml = '';
        if (song.coverFileId) {
            thumbHtml = `<img src="/api/cover?file_id=${encodeURIComponent(song.coverFileId)}" alt="" onerror="this.parentElement.innerHTML='<svg width=\\'16\\' height=\\'16\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\'><path d=\\'M9 18V5l12-2v13\\'></path></svg>'">`;
        } else {
            thumbHtml = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path></svg>`;
        }

        li.innerHTML = `
            <div class="col-num track-index">${numHtml}</div>
            <div class="col-title track-title-cell">
                <div class="track-thumb">${thumbHtml}</div>
                <div class="track-meta">
                    <span class="track-name">${song.title || 'Untitled'}</span>
                    <span class="track-artist">${song.performer || artist.name}</span>
                </div>
            </div>
            <div class="col-album track-album-cell">Single</div>
            <div class="col-date track-date-cell">Added recently</div>
            <div class="col-time track-time-cell">${formatDuration(song.duration)}</div>
            <div class="col-actions track-actions-cell">
                <button class="track-action-btn add-to-queue-btn" type="button" title="Add to Queue">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
            </div>
        `;

        li.querySelector('.track-title-cell').addEventListener('click', () => {
            playSongFromArtist(artist, displayIdx);
        });

        const playHover = li.querySelector('.track-play-hover');
        if (playHover) {
            playHover.addEventListener('click', (e) => {
                e.stopPropagation();
                playSongFromArtist(artist, displayIdx);
            });
        }

        const queueBtn = li.querySelector('.add-to-queue-btn');
        if (queueBtn) {
            queueBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                addSongToQueue(song);
            });
        }

        elements.artistTrackList.appendChild(li);
    });
}

function playSongFromArtist(artist, index) {
    if (!artist || !artist.songs || index < 0 || index >= artist.songs.length) return;
    state.songs = [...artist.songs];
    startSong(index);
}

function playArtistSongs(artist, isShuffle = false) {
    if (!artist || !artist.songs || artist.songs.length === 0) {
        showToast('Artist has no songs to play.');
        return;
    }
    state.songs = [...artist.songs];

    if (isShuffle) {
        state.isShuffle = true;
        if (elements.shuffleButton) elements.shuffleButton.classList.add('active');
        const startIdx = Math.floor(Math.random() * state.songs.length);
        state.shuffledIndices = generateShuffleOrder(startIdx);
        state.shuffleCurrentPos = 0;
        startSong(startIdx);
        showToast(`Shuffling "${artist.name}"`);
    } else {
        startSong(0);
        showToast(`Playing "${artist.name}"`);
    }
}

function addArtistSongsToQueue(artist) {
    if (!artist || !artist.songs || artist.songs.length === 0) return;
    // Append songs to current state.songs if not present
    let addedCount = 0;
    artist.songs.forEach((s) => {
        if (!state.songs.some((existing) => existing.file_id === s.file_id)) {
            state.songs.push(s);
            addedCount++;
        }
    });
    if (state.isQueueOpen) renderQueueList();
    showToast(`Added ${artist.songs.length} track(s) by ${artist.name} to queue`);
}

function addSongToQueue(song) {
    if (!song) return;
    if (!state.songs.some((existing) => existing.file_id === song.file_id)) {
        state.songs.push(song);
    }
    if (state.isQueueOpen) renderQueueList();
    showToast(`Added "${song.title || 'Track'}" to queue`);
}

function showArtistContextMenu(e, artist) {
    // Remove any existing custom context menu
    const existingMenu = document.querySelector('.artist-context-menu');
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement('div');
    menu.className = 'artist-context-menu';
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;

    menu.innerHTML = `
        <button class="context-menu-item" id="ctx-play-all" type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            <span>Play All</span>
        </button>
        <button class="context-menu-item" id="ctx-shuffle" type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line></svg>
            <span>Shuffle</span>
        </button>
        <button class="context-menu-item" id="ctx-add-queue" type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>Add to Queue</span>
        </button>
    `;

    document.body.appendChild(menu);

    const closeMenu = () => {
        menu.remove();
        document.removeEventListener('click', closeMenu);
    };

    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 10);

    menu.querySelector('#ctx-play-all').addEventListener('click', () => {
        playArtistSongs(artist, false);
    });
    menu.querySelector('#ctx-shuffle').addEventListener('click', () => {
        playArtistSongs(artist, true);
    });
    menu.querySelector('#ctx-add-queue').addEventListener('click', () => {
        addArtistSongsToQueue(artist);
    });
}

function renderArtistsList(artists) {
    if (!elements.artistsList) return;
    elements.artistsList.innerHTML = '';

    let currentLetter = '';

    artists.forEach((artist) => {
        const firstChar = artist.name.trim().charAt(0).toUpperCase();
        const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';

        // Sticky section header in list view if sorted alphabetically
        if (state.artistSortOrder === 'alphabetical' && letter !== currentLetter) {
            currentLetter = letter;
            const sectionHeader = document.createElement('li');
            sectionHeader.className = 'artist-list-section-header';
            sectionHeader.textContent = currentLetter;
            elements.artistsList.appendChild(sectionHeader);
        }

        const item = document.createElement('li');
        item.className = 'artist-list-item';

        const avatarWrapper = document.createElement('div');
        avatarWrapper.className = 'artist-list-avatar-wrapper';
        renderArtistAvatar(artist, avatarWrapper, false);

        const infoDiv = document.createElement('div');
        infoDiv.className = 'artist-list-info';
        infoDiv.innerHTML = `
            <span class="artist-list-name">${artist.name}</span>
            <span class="artist-list-count">${artist.songs.length} song${artist.songs.length === 1 ? '' : 's'}</span>
        `;

        const actionBtn = document.createElement('button');
        actionBtn.className = 'pl-btn-icon';
        actionBtn.type = 'button';
        actionBtn.title = 'Play all';
        actionBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
        `;
        actionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            playArtistSongs(artist, false);
        });

        item.appendChild(avatarWrapper);
        item.appendChild(infoDiv);
        item.appendChild(actionBtn);

        item.addEventListener('click', () => {
            state.activeArtistName = artist.name;
            showArtistDetailView();
        });

        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showArtistContextMenu(e, artist);
        });

        elements.artistsList.appendChild(item);
    });
}

function getArtistsList() {
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

    // Search filter
    if (state.artistSearchQuery.trim()) {
        const query = state.artistSearchQuery.toLowerCase().trim();
        list = list.filter((a) => a.name.toLowerCase().includes(query));
    }

    // Sort
    if (state.artistSortOrder === 'alphabetical') {
        list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    } else if (state.artistSortOrder === 'count') {
        list.sort((a, b) => b.songs.length - a.songs.length || a.name.localeCompare(b.name));
    } else if (state.artistSortOrder === 'recent') {
        list.sort((a, b) => b.latestIdx - a.latestIdx || a.name.localeCompare(b.name));
    }

    return list;
}

function loadPlayHistory() {
    try {
        const saved = localStorage.getItem('murex_play_history');
        if (saved) {
            state.playHistory = JSON.parse(saved);
        }
    } catch (err) {
        console.warn('Error loading play history:', err);
        state.playHistory = [];
    }

    // Seed realistic initial play history if empty to show rich insights right away
    if (!state.playHistory || state.playHistory.length === 0) {
        seedInitialPlayHistory();
    }
}

function savePlayHistory() {
    try {
        localStorage.setItem('murex_play_history', JSON.stringify(state.playHistory));
    } catch (err) {
        console.warn('Error saving play history:', err);
    }
}

function seedInitialPlayHistory() {
    if (!state.songs || state.songs.length === 0) return;
    const history = [];
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    // Generate 35 listening events across the past 30 days
    for (let i = 0; i < 35; i++) {
        const songIndex = (i * 3 + (i % 2)) % state.songs.length;
        const song = state.songs[songIndex];
        const daysAgo = (35 - i) * 0.8;
        const timestamp = now - Math.floor(daysAgo * DAY) - Math.floor(Math.random() * 3600000 * 8);

        history.push({
            songId: song.file_id || `song_${songIndex}`,
            title: song.title || 'Untitled Track',
            performer: song.performer || 'Unknown Artist',
            album: 'Single',
            duration: song.duration || 210,
            coverFileId: song.coverFileId || null,
            timestamp: timestamp
        });
    }

    state.playHistory = history;
    savePlayHistory();
}

function logPlayEvent(song) {
    if (!song) return;
    const playEvent = {
        songId: song.file_id || `song_${Date.now()}`,
        title: song.title || 'Untitled Track',
        performer: song.performer || 'Unknown Artist',
        album: 'Single',
        duration: song.duration || 180,
        coverFileId: song.coverFileId || null,
        timestamp: Date.now()
    };

    state.playHistory.unshift(playEvent);
    // Keep last 1000 events
    if (state.playHistory.length > 1000) {
        state.playHistory = state.playHistory.slice(0, 1000);
    }
    savePlayHistory();

    if (state.isStatsOverlayOpen) {
        renderStatsPage();
    }
}

function selectNavOption(optionKey) {
    state.activeNavOption = optionKey;
    if (elements.navMenuItems) {
        elements.navMenuItems.forEach((item) => {
            const isSelected = item.getAttribute('data-option') === optionKey;
            item.classList.toggle('active', isSelected);
        });
    }
    closeNavMenu();

    if (optionKey === 'all-songs') {
        closePlaylistOverlay();
        closeArtistsOverlay();
        closeStatsOverlay();
        openSongsOverlay();
    } else if (optionKey === 'playlists') {
        closeSongsOverlay();
        closeArtistsOverlay();
        closeStatsOverlay();
        openPlaylistOverlay();
    } else if (optionKey === 'artists') {
        closeSongsOverlay();
        closePlaylistOverlay();
        closeStatsOverlay();
        openArtistsOverlay();
    } else if (optionKey === 'stats') {
        closeSongsOverlay();
        closePlaylistOverlay();
        closeArtistsOverlay();
        openStatsOverlay();
    }
}

function openStatsOverlay() {
    state.isStatsOverlayOpen = true;
    if (elements.statsOverlay) elements.statsOverlay.classList.remove('hidden');
    if (elements.playerContainer) elements.playerContainer.classList.add('fixed-bottom');
    renderStatsPage();
}

function closeStatsOverlay() {
    state.isStatsOverlayOpen = false;
    if (elements.statsOverlay) elements.statsOverlay.classList.add('hidden');
    if (!state.isSongsOverlayOpen && !state.isPlaylistOverlayOpen && !state.isArtistsOverlayOpen && elements.playerContainer) {
        elements.playerContainer.classList.remove('fixed-bottom');
    }
}

function openSongsOverlay() {
    state.isSongsOverlayOpen = true;
    if (elements.songsOverlay) elements.songsOverlay.classList.remove('hidden');
    if (elements.playerContainer) elements.playerContainer.classList.add('fixed-bottom');
    renderSongsList();
}

function closeSongsOverlay() {
    state.isSongsOverlayOpen = false;
    if (elements.songsOverlay) elements.songsOverlay.classList.add('hidden');
    if (!state.isPlaylistOverlayOpen && elements.playerContainer) {
        elements.playerContainer.classList.remove('fixed-bottom');
    }
}

/* ==========================================================================
   PLAYLIST LOGIC & FUNCTIONS
   ========================================================================== */

function openPlaylistOverlay() {
    state.isPlaylistOverlayOpen = true;
    if (elements.playlistOverlay) elements.playlistOverlay.classList.remove('hidden');
    if (elements.playerContainer) elements.playerContainer.classList.add('fixed-bottom');

    if (state.activePlaylistId) {
        showPlaylistDetailView();
    } else {
        showPlaylistsHubView();
    }
}

function closePlaylistOverlay() {
    state.isPlaylistOverlayOpen = false;
    if (elements.playlistOverlay) elements.playlistOverlay.classList.add('hidden');
    if (!state.isSongsOverlayOpen && elements.playerContainer) {
        elements.playerContainer.classList.remove('fixed-bottom');
    }
}

function showPlaylistsHubView() {
    state.activePlaylistId = null;
    if (elements.playlistsHubView) elements.playlistsHubView.classList.remove('hidden');
    if (elements.playlistDetailView) elements.playlistDetailView.classList.add('hidden');
    renderPlaylistsHub();
}

function showPlaylistDetailView() {
    if (elements.playlistsHubView) elements.playlistsHubView.classList.add('hidden');
    if (elements.playlistDetailView) elements.playlistDetailView.classList.remove('hidden');
    renderPlaylistDetail();
}

function loadPlaylists() {
    try {
        const saved = localStorage.getItem('murex_playlists');
        if (saved) {
            state.playlists = JSON.parse(saved);
        }
    } catch (err) {
        console.warn('Error loading playlists from localStorage:', err);
        state.playlists = [];
    }

    // Initialize default playlists if empty
    if (!state.playlists || state.playlists.length === 0) {
        const defaultPl1 = {
            id: 'pl_favs',
            title: 'Favorites',
            description: 'Your favorite tracks from Telegram.',
            owner: 'Created by You',
            isPublic: true,
            updatedAt: Date.now(),
            songs: state.songs.slice(0, 5), // first 5 tracks if available
            isOffline: false
        };
        const defaultPl2 = {
            id: 'pl_mix',
            title: 'Chill Mix',
            description: 'Relaxing tunes and grooves.',
            owner: 'Created by You',
            isPublic: true,
            updatedAt: Date.now(),
            songs: state.songs.slice(2, 6),
            isOffline: false
        };
        state.playlists = [defaultPl1, defaultPl2];
        savePlaylists();
    }
}

function savePlaylists() {
    try {
        localStorage.setItem('murex_playlists', JSON.stringify(state.playlists));
    } catch (err) {
        console.warn('Error saving playlists:', err);
    }
}

function getActivePlaylist() {
    return state.playlists.find((pl) => pl.id === state.activePlaylistId) || null;
}

function renderPlaylistCoverGrid(container, songList) {
    if (!container) return;
    container.innerHTML = '';

    const tracksWithCover = (songList || []).filter((s) => s.coverFileId);

    if (tracksWithCover.length === 0) {
        container.innerHTML = `
            <div class="card-cover-fallback" style="grid-column: 1 / span 2; grid-row: 1 / span 2;">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <polyline points="3 6 4 7 6 5"></polyline>
                    <polyline points="3 12 4 13 6 11"></polyline>
                    <polyline points="3 18 4 19 6 17"></polyline>
                </svg>
            </div>
        `;
        return;
    }

    const coversToDisplay = tracksWithCover.slice(0, 4);

    coversToDisplay.forEach((song) => {
        const img = document.createElement('img');
        img.src = `/api/cover?file_id=${encodeURIComponent(song.coverFileId)}`;
        img.alt = '';
        img.onerror = function() {
            this.remove();
        };
        container.appendChild(img);
    });

    // Fill remaining slots up to 4 if fewer than 4 covers
    if (coversToDisplay.length < 4) {
        const remaining = 4 - coversToDisplay.length;
        for (let i = 0; i < remaining; i++) {
            const placeholder = document.createElement('div');
            placeholder.className = 'card-cover-fallback';
            placeholder.style.background = 'rgba(255,255,255,0.05)';
            container.appendChild(placeholder);
        }
    }
}

function renderPlaylistsHub() {
    if (!elements.playlistsGrid) return;
    elements.playlistsGrid.innerHTML = '';

    state.playlists.forEach((pl) => {
        const card = document.createElement('div');
        card.className = 'playlist-card';

        const coverDiv = document.createElement('div');
        coverDiv.className = 'card-cover';

        const coverGrid = document.createElement('div');
        coverGrid.className = 'card-cover-grid';
        renderPlaylistCoverGrid(coverGrid, pl.songs);
        coverDiv.appendChild(coverGrid);

        const infoDiv = document.createElement('div');
        infoDiv.className = 'card-info';
        infoDiv.innerHTML = `
            <span class="card-title">${pl.title || 'Untitled Playlist'}</span>
            <span class="card-count">${(pl.songs || []).length} tracks</span>
        `;

        card.appendChild(coverDiv);
        card.appendChild(infoDiv);

        card.addEventListener('click', () => {
            state.activePlaylistId = pl.id;
            showPlaylistDetailView();
        });

        elements.playlistsGrid.appendChild(card);
    });
}

function renderPlaylistDetail() {
    const pl = getActivePlaylist();
    if (!pl) {
        showPlaylistsHubView();
        return;
    }

    // Cover grid
    renderPlaylistCoverGrid(elements.plCoverGrid, pl.songs);

    // Metadata
    if (elements.plTitle) elements.plTitle.textContent = pl.title || 'Untitled Playlist';
    if (elements.plTitleInput) elements.plTitleInput.value = pl.title || '';
    if (elements.plOwner) elements.plOwner.textContent = pl.owner || 'Created by You';
    if (elements.plDescription) elements.plDescription.textContent = pl.description || 'No description provided.';
    if (elements.plDescriptionInput) elements.plDescriptionInput.value = pl.description || '';

    if (state.isEditingPlaylist) {
        if (elements.plTitle) elements.plTitle.classList.add('hidden');
        if (elements.plTitleInput) elements.plTitleInput.classList.remove('hidden');
        if (elements.plDescription) elements.plDescription.classList.add('hidden');
        if (elements.plDescriptionInput) elements.plDescriptionInput.classList.remove('hidden');
        if (elements.plEditLabel) elements.plEditLabel.textContent = 'Save';
    } else {
        if (elements.plTitle) elements.plTitle.classList.remove('hidden');
        if (elements.plTitleInput) elements.plTitleInput.classList.add('hidden');
        if (elements.plDescription) elements.plDescription.classList.remove('hidden');
        if (elements.plDescriptionInput) elements.plDescriptionInput.classList.add('hidden');
        if (elements.plEditLabel) elements.plEditLabel.textContent = 'Edit';
    }

    const trackCount = (pl.songs || []).length;
    const totalSecs = (pl.songs || []).reduce((acc, curr) => acc + (curr.duration || 0), 0);
    const totalMins = Math.ceil(totalSecs / 60);

    if (elements.plTrackCount) elements.plTrackCount.textContent = `${trackCount} track${trackCount === 1 ? '' : 's'}`;
    if (elements.plTotalDuration) elements.plTotalDuration.textContent = `${totalMins} min`;

    if (elements.plOfflineBtn) {
        elements.plOfflineBtn.classList.toggle('active', !!pl.isOffline);
    }
    if (elements.plOfflineLabel) {
        elements.plOfflineLabel.textContent = pl.isOffline ? 'Downloaded' : 'Offline';
    }

    renderPlaylistTracks();
    renderPlaylistRecommendations();
}

function getSortedPlaylistSongs(songs) {
    let list = [...songs];

    // Filter by search query
    if (state.playlistSearchQuery.trim()) {
        const q = state.playlistSearchQuery.toLowerCase().trim();
        list = list.filter((s) => (s.title || '').toLowerCase().includes(q) || (s.performer || '').toLowerCase().includes(q));
    }

    // Sort
    if (state.playlistSortOrder === 'title') {
        list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (state.playlistSortOrder === 'artist') {
        list.sort((a, b) => (a.performer || '').localeCompare(b.performer || ''));
    } else if (state.playlistSortOrder === 'duration') {
        list.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    } else if (state.playlistSortOrder === 'newest') {
        list.reverse();
    }

    return list;
}

function renderPlaylistTracks() {
    if (!elements.plTrackList) return;
    elements.plTrackList.innerHTML = '';

    const pl = getActivePlaylist();
    if (!pl || !pl.songs) return;

    const songsToRender = getSortedPlaylistSongs(pl.songs);

    if (songsToRender.length === 0) {
        if (elements.plEmptyState) elements.plEmptyState.classList.remove('hidden');
    } else {
        if (elements.plEmptyState) elements.plEmptyState.classList.add('hidden');
    }

    const currentSong = getCurrentSong();
    const isPlaying = elements.audio && !elements.audio.paused && !elements.audio.ended;

    songsToRender.forEach((song, displayIdx) => {
        const originalIndexInPl = pl.songs.indexOf(song);
        const isCurrentActive = currentSong && currentSong.file_id === song.file_id;

        const li = document.createElement('li');
        li.className = `pl-track-item ${isCurrentActive ? 'active' : ''}`;

        // Number / Equalizer / Play hover column
        let numHtml = '';
        if (isCurrentActive && isPlaying) {
            numHtml = `
                <div class="equalizer-visualizer" style="padding: 4px; border-radius: 4px;">
                    <span class="equalizer-bar"></span>
                    <span class="equalizer-bar"></span>
                    <span class="equalizer-bar"></span>
                    <span class="equalizer-bar"></span>
                </div>
            `;
        } else {
            numHtml = `
                <span class="track-index-num">${displayIdx + 1}</span>
                <span class="track-play-hover">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                </span>
            `;
        }

        // Cover thumb
        let thumbHtml = '';
        if (song.coverFileId) {
            thumbHtml = `<img src="/api/cover?file_id=${encodeURIComponent(song.coverFileId)}" alt="" onerror="this.parentElement.innerHTML='<svg width=\\'16\\' height=\\'16\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\'><path d=\\'M9 18V5l12-2v13\\'></path></svg>'">`;
        } else {
            thumbHtml = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path></svg>`;
        }

        li.innerHTML = `
            <div class="col-num track-index">${numHtml}</div>
            <div class="col-title track-title-cell">
                <div class="track-thumb">${thumbHtml}</div>
                <div class="track-meta">
                    <span class="track-name">${song.title || 'Untitled'}</span>
                    <span class="track-artist">${song.performer || 'Unknown Artist'}</span>
                </div>
            </div>
            <div class="col-album track-album-cell">Single</div>
            <div class="col-date track-date-cell">Added recently</div>
            <div class="col-time track-time-cell">${formatDuration(song.duration)}</div>
            <div class="col-actions track-actions-cell">
                <button class="track-action-btn move-up-btn" type="button" title="Move Up" ${originalIndexInPl === 0 ? 'disabled style="opacity:0.2;"' : ''}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg>
                </button>
                <button class="track-action-btn move-down-btn" type="button" title="Move Down" ${originalIndexInPl === pl.songs.length - 1 ? 'disabled style="opacity:0.2;"' : ''}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <button class="track-action-btn danger remove-track-btn" type="button" title="Remove from playlist">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        `;

        // Click to play
        li.querySelector('.track-title-cell').addEventListener('click', () => {
            playSongFromPlaylist(pl, originalIndexInPl);
        });

        const playHover = li.querySelector('.track-play-hover');
        if (playHover) {
            playHover.addEventListener('click', (e) => {
                e.stopPropagation();
                playSongFromPlaylist(pl, originalIndexInPl);
            });
        }

        // Reorder Up
        const upBtn = li.querySelector('.move-up-btn');
        if (upBtn && originalIndexInPl > 0) {
            upBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                movePlaylistTrack(pl, originalIndexInPl, originalIndexInPl - 1);
            });
        }

        // Reorder Down
        const downBtn = li.querySelector('.move-down-btn');
        if (downBtn && originalIndexInPl < pl.songs.length - 1) {
            downBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                movePlaylistTrack(pl, originalIndexInPl, originalIndexInPl + 1);
            });
        }

        // Remove track
        const removeBtn = li.querySelector('.remove-track-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeSongFromPlaylist(pl, originalIndexInPl);
            });
        }

        elements.plTrackList.appendChild(li);
    });
}

function renderPlaylistRecommendations() {
    if (!elements.recsList || !elements.plRecommendations) return;
    elements.recsList.innerHTML = '';

    const pl = getActivePlaylist();
    if (!pl) {
        elements.plRecommendations.classList.add('hidden');
        return;
    }

    const currentFileIds = new Set((pl.songs || []).map((s) => s.file_id));
    const candidates = state.songs.filter((s) => !currentFileIds.has(s.file_id));

    if (candidates.length === 0) {
        elements.plRecommendations.classList.add('hidden');
        return;
    }

    elements.plRecommendations.classList.remove('hidden');

    const suggested = candidates.slice(0, 4);

    suggested.forEach((song) => {
        const li = document.createElement('li');
        li.className = 'rec-item';

        li.innerHTML = `
            <div class="rec-info">
                <div class="track-thumb" style="width:36px; height:36px;">
                    ${song.coverFileId ? `<img src="/api/cover?file_id=${encodeURIComponent(song.coverFileId)}" alt="">` : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path></svg>`}
                </div>
                <div class="track-meta">
                    <span class="track-name" style="font-size:13px;">${song.title || 'Untitled'}</span>
                    <span class="track-artist" style="font-size:11px;">${song.performer || 'Unknown Artist'}</span>
                </div>
            </div>
            <button class="rec-add-btn" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span>Add</span>
            </button>
        `;

        li.querySelector('.rec-add-btn').addEventListener('click', () => {
            addSongToPlaylist(pl, song);
            showToast(`Added "${song.title || 'Song'}" to ${pl.title}`);
        });

        elements.recsList.appendChild(li);
    });
}

function playSongFromPlaylist(playlist, index) {
    state.songs = [...playlist.songs];
    startSong(index);
}

function playPlaylist(playlist) {
    if (!playlist || !playlist.songs || playlist.songs.length === 0) {
        showToast('Playlist has no songs to play.');
        return;
    }
    state.songs = [...playlist.songs];
    startSong(0);
    showToast(`Playing playlist "${playlist.title}"`);
}

function shufflePlaylist(playlist) {
    if (!playlist || !playlist.songs || playlist.songs.length === 0) {
        showToast('Playlist has no songs to shuffle.');
        return;
    }
    state.songs = [...playlist.songs];
    state.isShuffle = true;
    if (elements.shuffleButton) elements.shuffleButton.classList.add('active');
    const randomIdx = Math.floor(Math.random() * state.songs.length);
    state.shuffledIndices = generateShuffleOrder(randomIdx);
    state.shuffleCurrentPos = 0;
    startSong(randomIdx);
    showToast(`Shuffling "${playlist.title}"`);
}

function createNewPlaylist() {
    const newId = `pl_${Date.now()}`;
    const newPl = {
        id: newId,
        title: `My Playlist #${state.playlists.length + 1}`,
        description: 'Custom user playlist.',
        owner: 'Created by You',
        isPublic: true,
        updatedAt: Date.now(),
        songs: [],
        isOffline: false
    };
    state.playlists.push(newPl);
    savePlaylists();
    state.activePlaylistId = newId;
    showPlaylistDetailView();
    showToast('New playlist created!');
}

function deleteActivePlaylist() {
    const pl = getActivePlaylist();
    if (!pl) return;

    if (confirm(`Are you sure you want to delete "${pl.title}"?`)) {
        state.playlists = state.playlists.filter((p) => p.id !== pl.id);
        savePlaylists();
        showToast(`Deleted playlist "${pl.title}"`);
        showPlaylistsHubView();
    }
}

function toggleEditPlaylist() {
    state.isEditingPlaylist = !state.isEditingPlaylist;
    const pl = getActivePlaylist();
    if (!pl) return;

    if (state.isEditingPlaylist) {
        if (elements.plTitle) elements.plTitle.classList.add('hidden');
        if (elements.plTitleInput) elements.plTitleInput.classList.remove('hidden');
        if (elements.plDescription) elements.plDescription.classList.add('hidden');
        if (elements.plDescriptionInput) elements.plDescriptionInput.classList.remove('hidden');
        if (elements.plEditLabel) elements.plEditLabel.textContent = 'Save';
    } else {
        // Save changes
        pl.title = elements.plTitleInput.value.trim() || 'Untitled Playlist';
        pl.description = elements.plDescriptionInput.value.trim();
        pl.updatedAt = Date.now();
        savePlaylists();

        if (elements.plTitle) elements.plTitle.classList.remove('hidden');
        if (elements.plTitleInput) elements.plTitleInput.classList.add('hidden');
        if (elements.plDescription) elements.plDescription.classList.remove('hidden');
        if (elements.plDescriptionInput) elements.plDescriptionInput.classList.add('hidden');
        if (elements.plEditLabel) elements.plEditLabel.textContent = 'Edit';

        renderPlaylistDetail();
        showToast('Playlist details saved.');
    }
}

function addSongToPlaylist(playlist, song) {
    if (!playlist || !song) return;
    if (!playlist.songs.some((s) => s.file_id === song.file_id)) {
        playlist.songs.push(song);
        playlist.updatedAt = Date.now();
        savePlaylists();
        renderPlaylistDetail();
    }
}

function removeSongFromPlaylist(playlist, index) {
    if (!playlist || index < 0 || index >= playlist.songs.length) return;
    const removedTrack = playlist.songs[index];
    playlist.songs.splice(index, 1);
    playlist.updatedAt = Date.now();
    savePlaylists();
    renderPlaylistDetail();
    showToast(`Removed "${removedTrack?.title || 'Track'}"`);
}

function movePlaylistTrack(playlist, fromIndex, toIndex) {
    if (!playlist || fromIndex < 0 || toIndex < 0 || fromIndex >= playlist.songs.length || toIndex >= playlist.songs.length) return;
    const item = playlist.songs.splice(fromIndex, 1)[0];
    playlist.songs.splice(toIndex, 0, item);
    playlist.updatedAt = Date.now();
    savePlaylists();
    renderPlaylistDetail();
}

function openAddSongsModal() {
    if (elements.addSongsModal) elements.addSongsModal.classList.remove('hidden');
    renderAddSongsModal();
}

function closeAddSongsModal() {
    if (elements.addSongsModal) elements.addSongsModal.classList.add('hidden');
}

function renderAddSongsModal() {
    if (!elements.modalSongList) return;
    elements.modalSongList.innerHTML = '';

    const pl = getActivePlaylist();
    if (!pl) return;

    const query = state.modalSearchQuery.toLowerCase().trim();
    let candidates = state.songs;

    if (query) {
        candidates = candidates.filter((s) => (s.title || '').toLowerCase().includes(query) || (s.performer || '').toLowerCase().includes(query));
    }

    candidates.forEach((song) => {
        const isAdded = pl.songs.some((s) => s.file_id === song.file_id);

        const li = document.createElement('li');
        li.className = 'modal-song-item';

        li.innerHTML = `
            <div class="track-meta">
                <span class="track-name" style="font-size:14px; font-weight:600;">${song.title || 'Untitled'}</span>
                <span class="track-artist" style="font-size:12px; color:var(--ink-muted);">${song.performer || 'Unknown'}</span>
            </div>
            <button class="action-btn ${isAdded ? 'secondary-action-btn' : 'primary-action-btn'}" type="button" style="font-size:12px; padding:4px 12px;">
                ${isAdded ? '✓ Added' : '+ Add'}
            </button>
        `;

        const btn = li.querySelector('button');
        btn.addEventListener('click', () => {
            if (isAdded) {
                const idx = pl.songs.findIndex((s) => s.file_id === song.file_id);
                removeSongFromPlaylist(pl, idx);
            } else {
                addSongToPlaylist(pl, song);
                showToast(`Added "${song.title || 'Song'}"`);
            }
            renderAddSongsModal();
        });

        elements.modalSongList.appendChild(li);
    });
}

function getSortedSongIndices() {
    // Array of objects with song reference and original index in state.songs
    const items = state.songs.map((song, originalIndex) => ({ song, originalIndex }));

    if (state.sortOrder === 'newest') {
        // Since backend API returns oldest first (index 0), newest to oldest is reversed original order
        return items.reverse();
    } else if (state.sortOrder === 'oldest') {
        // Original order (oldest first)
        return items;
    } else if (state.sortOrder === 'alphabetical') {
        return items.sort((a, b) => {
            const titleA = (a.song.title || 'Untitled').toLowerCase();
            const titleB = (b.song.title || 'Untitled').toLowerCase();
            return titleA.localeCompare(titleB);
        });
    }
    return items;
}

function renderSongsList() {
    if (!elements.songsList) return;
    elements.songsList.innerHTML = '';

    const sortedItems = getSortedSongIndices();
    const isPlaying = elements.audio && !elements.audio.paused && !elements.audio.ended;

    sortedItems.forEach(({ song, originalIndex }) => {
        const li = document.createElement('li');
        const isActive = originalIndex === state.currentIndex;
        li.className = `song-item ${isActive ? 'active' : ''}`;

        // Build thumbnail / visualizer element
        let thumbHtml = '';
        if (isActive && isPlaying) {
            thumbHtml = `
                <div class="equalizer-visualizer">
                    <span class="equalizer-bar"></span>
                    <span class="equalizer-bar"></span>
                    <span class="equalizer-bar"></span>
                    <span class="equalizer-bar"></span>
                </div>
            `;
        } else if (song.coverFileId) {
            thumbHtml = `
                <img src="/api/cover?file_id=${encodeURIComponent(song.coverFileId)}" alt="" onerror="this.parentElement.innerHTML='<div class=\\'song-thumb-fallback\\'><svg width=\\'20\\' height=\\'20\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'><path d=\\'M9 18V5l12-2v13\\'></path><circle cx=\\'6\\' cy=\\'18\\' r=\\'3\\'></circle><circle cx=\\'18\\' cy=\\'16\\' r=\\'3\\'></circle></svg></div>'">
            `;
        } else {
            thumbHtml = `
                <div class="song-thumb-fallback">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 18V5l12-2v13"></path>
                        <circle cx="6" cy="18" r="3"></circle>
                        <circle cx="18" cy="16" r="3"></circle>
                    </svg>
                </div>
            `;
        }

        li.innerHTML = `
            <div class="song-thumb-wrapper">
                ${thumbHtml}
            </div>
            <div class="song-info">
                <span class="song-name">${song.title || 'Untitled'}</span>
                <span class="song-duration">${formatDuration(song.duration)}</span>
            </div>
        `;

        li.addEventListener('click', () => {
            if (state.isShuffle) {
                state.shuffleCurrentPos = state.shuffledIndices.indexOf(originalIndex);
            }
            startSong(originalIndex);
            closeSongsOverlay();
        });

        elements.songsList.appendChild(li);
    });
}

function toggleMoreSection() {
    state.isMoreOpen = !state.isMoreOpen;
    if (elements.playerDropdown && elements.moreTab) {
        elements.playerDropdown.classList.toggle('hidden', !state.isMoreOpen);
        elements.moreTab.classList.toggle('open', state.isMoreOpen);
        elements.moreTab.setAttribute('aria-expanded', String(state.isMoreOpen));
    }
}

function toggleQueue() {
    state.isQueueOpen = !state.isQueueOpen;
    if (elements.queueContainer && elements.queueButton) {
        elements.queueContainer.classList.toggle('hidden', !state.isQueueOpen);
        elements.queueButton.classList.toggle('active', state.isQueueOpen);
    }
    if (state.isQueueOpen) {
        renderQueueList();
    }
}

function renderQueueList() {
    if (!elements.queueList) return;
    elements.queueList.innerHTML = '';

    state.songs.forEach((song, idx) => {
        const li = document.createElement('li');
        li.className = `queue-item ${idx === state.currentIndex ? 'active' : ''}`;
        li.innerHTML = `
            <span class="queue-item-title">${song.title || 'Untitled'} - ${song.performer || 'Unknown'}</span>
            <span class="queue-item-duration">${formatDuration(song.duration)}</span>
        `;
        li.addEventListener('click', () => {
            if (state.isShuffle) {
                state.shuffleCurrentPos = state.shuffledIndices.indexOf(idx);
            }
            startSong(idx);
        });
        elements.queueList.appendChild(li);
    });
}

function updateVolumeStyle() {
    if (!elements.volumeBar) return;
    const val = Number(elements.volumeBar.value);
    const percent = val * 100;
    elements.volumeBar.style.background = `linear-gradient(to right, rgba(255, 255, 255, 0.9) ${percent}%, rgba(255, 255, 255, 0.2) ${percent}%)`;
}

function setVolume(val) {
    state.volume = Math.max(0, Math.min(1, val));
    if (elements.audio) elements.audio.volume = state.volume;
    if (elements.volumeBar) elements.volumeBar.value = String(state.volume);
    updateVolumeStyle();

    if (state.volume > 0 && state.isMuted) {
        state.isMuted = false;
        if (elements.audio) elements.audio.muted = false;
    }
    updateVolumeIcon();
}

function toggleMute() {
    state.isMuted = !state.isMuted;
    if (elements.audio) elements.audio.muted = state.isMuted;
    updateVolumeIcon();
}

function updateVolumeIcon() {
    if (!elements.volumeIcon) return;
    if (state.isMuted || state.volume === 0) {
        elements.volumeIcon.innerHTML = `
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <line x1="23" y1="9" x2="17" y2="15"></line>
            <line x1="17" y1="9" x2="23" y2="15"></line>
        `;
    } else if (state.volume < 0.5) {
        elements.volumeIcon.innerHTML = `
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        `;
    } else {
        elements.volumeIcon.innerHTML = `
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        `;
    }
}

async function startSong(index) {
    if (index < 0 || index >= state.songs.length) return;
    state.currentIndex = index;
    const song = getCurrentSong();
    if (!song) return;

    updateNowPlaying(song);
    elements.audio.src = `/api/stream?file_id=${encodeURIComponent(song.file_id)}`;
    elements.audio.load();

    try {
        await elements.audio.play();
        logPlayEvent(song);
    } catch (error) {
        console.warn('Autoplay prevented or playback interrupted:', error);
    }
    updatePlayButton();

    if (state.isQueueOpen) {
        renderQueueList();
    }
}

function togglePlayPause() {
    if (state.currentIndex === -1 && state.songs.length > 0) {
        startSong(0);
        return;
    }

    if (elements.audio.paused) {
        elements.audio.play().catch((err) => {
            console.error('Play failed:', err);
        });
    } else {
        elements.audio.pause();
    }
}

function playNext() {
    if (!state.songs.length) return;

    if (state.isShuffle && state.shuffledIndices.length) {
        state.shuffleCurrentPos = (state.shuffleCurrentPos + 1) % state.shuffledIndices.length;
        const nextIndex = state.shuffledIndices[state.shuffleCurrentPos];
        startSong(nextIndex);
    } else {
        const nextIndex = (state.currentIndex + 1) % state.songs.length;
        startSong(nextIndex);
    }
}

function playPrev() {
    if (!state.songs.length) return;

    if (state.isShuffle && state.shuffledIndices.length) {
        state.shuffleCurrentPos = (state.shuffleCurrentPos - 1 + state.shuffledIndices.length) % state.shuffledIndices.length;
        const prevIndex = state.shuffledIndices[state.shuffleCurrentPos];
        startSong(prevIndex);
    } else {
        const prevIndex = (state.currentIndex - 1 + state.songs.length) % state.songs.length;
        startSong(prevIndex);
    }
}

function updatePlayButton() {
    const isPlaying = !elements.audio.paused && !elements.audio.ended;
    if (elements.playIconSvg) {
        if (isPlaying) {
            elements.playIconSvg.innerHTML = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';
        } else {
            elements.playIconSvg.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
        }
    }
    elements.playButton.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');

    if (elements.albumArtPlaceholder) {
        if (isPlaying) {
            elements.albumArtPlaceholder.classList.add('playing');
        } else {
            elements.albumArtPlaceholder.classList.remove('playing');
        }
    }

    if (state.isSongsOverlayOpen) {
        renderSongsList();
    }
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

async function loadSongs() {
    elements.nowTitle.textContent = 'Loading songs...';
    elements.nowArtist.textContent = 'Connecting to library';

    try {
        const response = await fetch('/api/songs', {
            headers: { Accept: 'application/json' }
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok || payload?.error) {
            throw new Error(payload?.error || 'Unable to load songs.');
        }

        state.songs = Array.isArray(payload) ? payload : [];
        if (state.songs.length > 0) {
            state.currentIndex = 0;
            updateNowPlaying(getCurrentSong());
        } else {
            elements.nowTitle.textContent = 'No songs found';
            elements.nowArtist.textContent = 'Library empty';
        }

        if (state.isSongsOverlayOpen) {
            renderSongsList();
        }

        // Initialize playlists & history if first load
        loadPlaylists();
        loadPlayHistory();

        if (state.isPlaylistOverlayOpen) {
            if (state.activePlaylistId) renderPlaylistDetail();
            else renderPlaylistsHub();
        }
        if (state.isArtistsOverlayOpen) {
            if (state.activeArtistName) renderArtistDetail();
            else renderArtistsHub();
        }
        if (state.isStatsOverlayOpen) {
            renderStatsPage();
        }
    } catch (error) {
        elements.nowTitle.textContent = 'Error loading songs';
        elements.nowArtist.textContent = error.message || 'Check channel source';
    }
}

/* ==========================================================================
   STATS RENDERING & CALCULATION FUNCTIONS
   ========================================================================== */

function getFilteredPlayHistory() {
    const history = state.playHistory || [];
    const now = Date.now();

    if (state.statsTimeRange === 'week') {
        const start = now - (7 * 24 * 60 * 60 * 1000);
        return history.filter((e) => e.timestamp >= start);
    } else if (state.statsTimeRange === 'month') {
        const start = now - (30 * 24 * 60 * 60 * 1000);
        return history.filter((e) => e.timestamp >= start);
    } else if (state.statsTimeRange === 'year') {
        const start = now - (365 * 24 * 60 * 60 * 1000);
        return history.filter((e) => e.timestamp >= start);
    } else if (state.statsTimeRange === 'custom') {
        let events = [...history];
        if (state.customStartDate) {
            const startMs = new Date(state.customStartDate).getTime();
            if (Number.isFinite(startMs)) events = events.filter((e) => e.timestamp >= startMs);
        }
        if (state.customEndDate) {
            const endMs = new Date(state.customEndDate).getTime() + (24 * 60 * 60 * 1000 - 1);
            if (Number.isFinite(endMs)) events = events.filter((e) => e.timestamp <= endMs);
        }
        return events;
    }

    return history; // 'all'
}

function renderStatsPage() {
    const events = getFilteredPlayHistory();

    renderHeadlineSummary(events);
    renderTopLists(events);
    renderActivityVisualization(events);
    renderMilestones(events);
    renderRecentHistory(events);
}

function renderHeadlineSummary(events) {
    const totalSecs = events.reduce((acc, curr) => acc + (curr.duration || 180), 0);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);

    if (elements.statTotalTime) {
        elements.statTotalTime.textContent = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    }

    if (elements.statTotalTracks) {
        elements.statTotalTracks.textContent = String(events.length);
    }

    const uniqueArtists = new Set(events.map((e) => (e.performer || '').trim()).filter(Boolean));
    if (elements.statUniqueArtists) {
        elements.statUniqueArtists.textContent = String(uniqueArtists.size);
    }

    let daysCount = 1;
    if (events.length > 1) {
        const timestamps = events.map((e) => e.timestamp).sort((a, b) => a - b);
        const spanMs = Math.max(timestamps[timestamps.length - 1] - timestamps[0], 24 * 3600 * 1000);
        daysCount = Math.max(Math.ceil(spanMs / (24 * 3600 * 1000)), 1);
    }

    const avgDailyMins = Math.round((totalSecs / 60) / daysCount);
    if (elements.statAvgDaily) {
        elements.statAvgDaily.textContent = `${avgDailyMins}m / day`;
    }
}

function renderTopLists(events) {
    renderTopArtistsList(events);
    renderTopSongsList(events);
    renderTopAlbumsList(events);
}

function renderTopArtistsList(events) {
    if (!elements.topArtistsList) return;
    elements.topArtistsList.innerHTML = '';

    const artistCounts = new Map();
    events.forEach((e) => {
        const name = (e.performer || '').trim() || 'Unknown Artist';
        if (!artistCounts.has(name)) {
            artistCounts.set(name, { name, count: 0, time: 0, coverFileId: e.coverFileId });
        }
        const item = artistCounts.get(name);
        item.count++;
        item.time += (e.duration || 180);
        if (e.coverFileId && !item.coverFileId) item.coverFileId = e.coverFileId;
    });

    const sorted = Array.from(artistCounts.values()).sort((a, b) => b.count - a.count || b.time - a.time).slice(0, 5);

    if (sorted.length === 0) {
        elements.topArtistsList.innerHTML = '<li class="top-ranked-item" style="color:var(--ink-faint); font-size:12px;">No artist data in range</li>';
        return;
    }

    sorted.forEach((artist, idx) => {
        const li = document.createElement('li');
        li.className = 'top-ranked-item';

        let avatarHtml = '';
        if (artist.coverFileId) {
            avatarHtml = `<img src="/api/cover?file_id=${encodeURIComponent(artist.coverFileId)}" alt="" onerror="this.parentElement.innerHTML='${getArtistInitials(artist.name)}'">`;
        } else {
            avatarHtml = `<span style="font-size:11px; font-weight:700;">${getArtistInitials(artist.name)}</span>`;
        }

        li.innerHTML = `
            <div class="rank-badge">${idx + 1}</div>
            <div class="top-item-thumb circle">${avatarHtml}</div>
            <div class="top-item-info">
                <span class="top-item-name">${artist.name}</span>
                <span class="top-item-sub">${artist.count} play${artist.count === 1 ? '' : 's'}</span>
            </div>
            <div class="top-item-stat">${Math.round(artist.time / 60)}m</div>
        `;

        li.addEventListener('click', () => {
            const foundArtist = getArtistsList().find((a) => a.name === artist.name);
            if (foundArtist) {
                closeStatsOverlay();
                state.activeArtistName = artist.name;
                openArtistsOverlay();
            }
        });

        elements.topArtistsList.appendChild(li);
    });
}

function renderTopSongsList(events) {
    if (!elements.topSongsList) return;
    elements.topSongsList.innerHTML = '';

    const songCounts = new Map();
    events.forEach((e) => {
        const key = e.songId || e.title;
        if (!songCounts.has(key)) {
            songCounts.set(key, { ...e, count: 0 });
        }
        songCounts.get(key).count++;
    });

    const sorted = Array.from(songCounts.values()).sort((a, b) => b.count - a.count).slice(0, 5);

    if (sorted.length === 0) {
        elements.topSongsList.innerHTML = '<li class="top-ranked-item" style="color:var(--ink-faint); font-size:12px;">No song data in range</li>';
        return;
    }

    sorted.forEach((song, idx) => {
        const li = document.createElement('li');
        li.className = 'top-ranked-item';

        let thumbHtml = '';
        if (song.coverFileId) {
            thumbHtml = `<img src="/api/cover?file_id=${encodeURIComponent(song.coverFileId)}" alt="">`;
        } else {
            thumbHtml = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path></svg>`;
        }

        li.innerHTML = `
            <div class="rank-badge">${idx + 1}</div>
            <div class="top-item-thumb">${thumbHtml}</div>
            <div class="top-item-info">
                <span class="top-item-name">${song.title}</span>
                <span class="top-item-sub">${song.performer}</span>
            </div>
            <div class="top-item-stat">${song.count} plays</div>
        `;

        li.addEventListener('click', () => {
            const songIndex = state.songs.findIndex((s) => s.file_id === song.songId || s.title === song.title);
            if (songIndex !== -1) {
                startSong(songIndex);
                closeStatsOverlay();
            }
        });

        elements.topSongsList.appendChild(li);
    });
}

function renderTopAlbumsList(events) {
    if (!elements.topAlbumsList) return;
    elements.topAlbumsList.innerHTML = '';

    const albumCounts = new Map();
    events.forEach((e) => {
        const albumName = e.album || 'Telegram Single';
        if (!albumCounts.has(albumName)) {
            albumCounts.set(albumName, { name: albumName, artist: e.performer || 'Various', count: 0, coverFileId: e.coverFileId });
        }
        const item = albumCounts.get(albumName);
        item.count++;
        if (e.coverFileId && !item.coverFileId) item.coverFileId = e.coverFileId;
    });

    const sorted = Array.from(albumCounts.values()).sort((a, b) => b.count - a.count).slice(0, 5);

    if (sorted.length === 0) {
        elements.topAlbumsList.innerHTML = '<li class="top-ranked-item" style="color:var(--ink-faint); font-size:12px;">No album data in range</li>';
        return;
    }

    sorted.forEach((album, idx) => {
        const li = document.createElement('li');
        li.className = 'top-ranked-item';

        let thumbHtml = '';
        if (album.coverFileId) {
            thumbHtml = `<img src="/api/cover?file_id=${encodeURIComponent(album.coverFileId)}" alt="">`;
        } else {
            thumbHtml = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path></svg>`;
        }

        li.innerHTML = `
            <div class="rank-badge">${idx + 1}</div>
            <div class="top-item-thumb">${thumbHtml}</div>
            <div class="top-item-info">
                <span class="top-item-name">${album.name}</span>
                <span class="top-item-sub">${album.artist}</span>
            </div>
            <div class="top-item-stat">${album.count} tracks</div>
        `;

        elements.topAlbumsList.appendChild(li);
    });
}

function renderActivityVisualization(events) {
    if (!elements.activityChartBars) return;
    elements.activityChartBars.innerHTML = '';

    // Build 7 buckets (either 7 days or 7 intervals)
    const buckets = [
        { label: 'Mon', count: 0 },
        { label: 'Tue', count: 0 },
        { label: 'Wed', count: 0 },
        { label: 'Thu', count: 0 },
        { label: 'Fri', count: 0 },
        { label: 'Sat', count: 0 },
        { label: 'Sun', count: 0 }
    ];

    events.forEach((e) => {
        const d = new Date(e.timestamp);
        let dayIdx = d.getDay() - 1;
        if (dayIdx === -1) dayIdx = 6; // Sunday = 6
        buckets[dayIdx].count++;
    });

    const maxVal = Math.max(...buckets.map((b) => b.count), 1);

    buckets.forEach((b) => {
        const col = document.createElement('div');
        col.className = 'chart-bar-col';

        const pct = Math.round((b.count / maxVal) * 100);

        col.innerHTML = `
            <span class="chart-bar-val">${b.count > 0 ? b.count : ''}</span>
            <div class="chart-bar-fill-wrapper">
                <div class="chart-bar-fill" style="height: ${pct}%;"></div>
            </div>
            <span class="chart-bar-label">${b.label}</span>
        `;

        elements.activityChartBars.appendChild(col);
    });

    renderGenreBreakdown(events);
}

function renderGenreBreakdown(events) {
    if (!elements.genreBarsContainer) return;
    elements.genreBarsContainer.innerHTML = '';

    const genres = [
        { name: 'Pop & Grooves', count: Math.ceil(events.length * 0.42) },
        { name: 'Electronic / Ambient', count: Math.ceil(events.length * 0.28) },
        { name: 'Indie & Alternative', count: Math.ceil(events.length * 0.18) },
        { name: 'Hip-Hop & R&B', count: Math.ceil(events.length * 0.12) }
    ];

    const total = events.length || 1;

    genres.forEach((g) => {
        const pct = Math.min(Math.round((g.count / total) * 100), 100);

        const row = document.createElement('div');
        row.className = 'genre-bar-row';
        row.innerHTML = `
            <span class="genre-name">${g.name}</span>
            <div class="genre-track">
                <div class="genre-fill" style="width: ${pct}%;"></div>
            </div>
            <span class="genre-pct">${pct}%</span>
        `;

        elements.genreBarsContainer.appendChild(row);
    });
}

function renderMilestones(events) {
    const uniqueArtists = new Set(events.map((e) => (e.performer || '').trim()).filter(Boolean));
    if (elements.statNewArtists) {
        elements.statNewArtists.textContent = `${uniqueArtists.size} new artist${uniqueArtists.size === 1 ? '' : 's'}`;
    }

    // Streak calculation (days with at least 1 play)
    const activeDays = new Set(events.map((e) => new Date(e.timestamp).toDateString()));
    if (elements.statStreakDays) {
        elements.statStreakDays.textContent = `${activeDays.size} day${activeDays.size === 1 ? '' : 's'}`;
    }

    // Most repeated track
    const songCounts = new Map();
    events.forEach((e) => {
        const key = e.title;
        songCounts.set(key, (songCounts.get(key) || 0) + 1);
    });

    let topTitle = 'None';
    let maxCount = 0;

    songCounts.forEach((cnt, title) => {
        if (cnt > maxCount) {
            maxCount = cnt;
            topTitle = title;
        }
    });

    if (elements.statMostRepeatedTitle) {
        elements.statMostRepeatedTitle.textContent = topTitle;
    }

    if (elements.statMostRepeatedCount) {
        elements.statMostRepeatedCount.textContent = `Played ${maxCount} time${maxCount === 1 ? '' : 's'}`;
    }
}

function renderRecentHistory(events) {
    if (!elements.recentHistoryList) return;
    elements.recentHistoryList.innerHTML = '';

    if (events.length === 0) {
        elements.recentHistoryList.innerHTML = '<li class="history-item" style="color:var(--ink-faint); font-size:12px;">No play history available</li>';
        return;
    }

    const recent = events.slice(0, 20); // Top 20 chronological log

    recent.forEach((item) => {
        const li = document.createElement('li');
        li.className = 'history-item';

        const d = new Date(item.timestamp);
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

        let thumbHtml = '';
        if (item.coverFileId) {
            thumbHtml = `<img src="/api/cover?file_id=${encodeURIComponent(item.coverFileId)}" alt="">`;
        } else {
            thumbHtml = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path></svg>`;
        }

        li.innerHTML = `
            <div class="history-item-left">
                <div class="history-item-thumb">${thumbHtml}</div>
                <div class="history-item-meta">
                    <span class="history-item-title">${item.title}</span>
                    <span class="history-item-artist">${item.performer}</span>
                </div>
            </div>
            <div class="history-item-time">${dateStr}, ${timeStr}</div>
        `;

        li.addEventListener('click', () => {
            const songIndex = state.songs.findIndex((s) => s.file_id === item.songId || s.title === item.title);
            if (songIndex !== -1) {
                startSong(songIndex);
                closeStatsOverlay();
            }
        });

        elements.recentHistoryList.appendChild(li);
    });
}

function bindEvents() {
    if (elements.hamburgerButton) {
        elements.hamburgerButton.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleNavMenu();
        });
    }

    if (elements.songsBackButton) {
        elements.songsBackButton.addEventListener('click', () => {
            closeSongsOverlay();
        });
    }

    if (elements.sortSelect) {
        elements.sortSelect.addEventListener('change', (e) => {
            state.sortOrder = e.target.value;
            renderSongsList();
        });
    }

    // Stats Event Listeners
    if (elements.statsBackBtn) {
        elements.statsBackBtn.addEventListener('click', () => {
            closeStatsOverlay();
        });
    }

    if (elements.statsRangePills) {
        elements.statsRangePills.addEventListener('click', (e) => {
            const btn = e.target.closest('.range-pill-btn');
            if (!btn) return;
            const range = btn.getAttribute('data-range');
            state.statsTimeRange = range;

            elements.statsRangePills.querySelectorAll('.range-pill-btn').forEach((b) => {
                b.classList.toggle('active', b === btn);
            });

            if (range === 'custom') {
                if (elements.customRangeInputs) elements.customRangeInputs.classList.remove('hidden');
            } else {
                if (elements.customRangeInputs) elements.customRangeInputs.classList.add('hidden');
                renderStatsPage();
            }
        });
    }

    if (elements.applyCustomRangeBtn) {
        elements.applyCustomRangeBtn.addEventListener('click', () => {
            if (elements.statsStartDate) state.customStartDate = elements.statsStartDate.value;
            if (elements.statsEndDate) state.customEndDate = elements.statsEndDate.value;
            renderStatsPage();
        });
    }

    // Artists Event Listeners
    if (elements.artistsBackBtn) {
        elements.artistsBackBtn.addEventListener('click', () => {
            closeArtistsOverlay();
        });
    }

    if (elements.artistDetailBackBtn) {
        elements.artistDetailBackBtn.addEventListener('click', () => {
            showArtistsHubView();
        });
    }

    if (elements.artistsSearchInput) {
        elements.artistsSearchInput.addEventListener('input', (e) => {
            state.artistSearchQuery = e.target.value;
            renderArtistsHub();
        });
    }

    if (elements.artistsSortSelect) {
        elements.artistsSortSelect.addEventListener('change', (e) => {
            state.artistSortOrder = e.target.value;
            renderArtistsHub();
        });
    }

    if (elements.artistViewGridBtn) {
        elements.artistViewGridBtn.addEventListener('click', () => {
            state.artistViewMode = 'grid';
            if (elements.artistViewGridBtn) elements.artistViewGridBtn.classList.add('active');
            if (elements.artistViewListBtn) elements.artistViewListBtn.classList.remove('active');
            renderArtistsHub();
        });
    }

    if (elements.artistViewListBtn) {
        elements.artistViewListBtn.addEventListener('click', () => {
            state.artistViewMode = 'list';
            if (elements.artistViewListBtn) elements.artistViewListBtn.classList.add('active');
            if (elements.artistViewGridBtn) elements.artistViewGridBtn.classList.remove('active');
            renderArtistsHub();
        });
    }

    if (elements.artistPlayBtn) {
        elements.artistPlayBtn.addEventListener('click', () => {
            const artist = getActiveArtist();
            if (artist) playArtistSongs(artist, false);
        });
    }

    if (elements.artistShuffleBtn) {
        elements.artistShuffleBtn.addEventListener('click', () => {
            const artist = getActiveArtist();
            if (artist) playArtistSongs(artist, true);
        });
    }

    if (elements.artistQueueBtn) {
        elements.artistQueueBtn.addEventListener('click', () => {
            const artist = getActiveArtist();
            if (artist) addArtistSongsToQueue(artist);
        });
    }

    // Playlist Event Listeners
    if (elements.playlistsBackBtn) {
        elements.playlistsBackBtn.addEventListener('click', () => {
            closePlaylistOverlay();
        });
    }

    if (elements.createPlaylistBtn) {
        elements.createPlaylistBtn.addEventListener('click', () => {
            createNewPlaylist();
        });
    }

    if (elements.plDetailBackBtn) {
        elements.plDetailBackBtn.addEventListener('click', () => {
            showPlaylistsHubView();
        });
    }

    if (elements.plPlayBtn) {
        elements.plPlayBtn.addEventListener('click', () => {
            playPlaylist(getActivePlaylist());
        });
    }

    if (elements.plShuffleBtn) {
        elements.plShuffleBtn.addEventListener('click', () => {
            shufflePlaylist(getActivePlaylist());
        });
    }

    if (elements.plOfflineBtn) {
        elements.plOfflineBtn.addEventListener('click', () => {
            const pl = getActivePlaylist();
            if (!pl) return;
            pl.isOffline = !pl.isOffline;
            savePlaylists();
            if (elements.plOfflineBtn) elements.plOfflineBtn.classList.toggle('active', pl.isOffline);
            if (elements.plOfflineLabel) elements.plOfflineLabel.textContent = pl.isOffline ? 'Downloaded' : 'Offline';
            showToast(pl.isOffline ? 'Downloaded for offline listening' : 'Removed from offline storage');
        });
    }

    if (elements.plAddSongsBtn) {
        elements.plAddSongsBtn.addEventListener('click', () => {
            openAddSongsModal();
        });
    }

    if (elements.plEmptyAddBtn) {
        elements.plEmptyAddBtn.addEventListener('click', () => {
            openAddSongsModal();
        });
    }

    if (elements.plEditBtn) {
        elements.plEditBtn.addEventListener('click', () => {
            toggleEditPlaylist();
        });
    }

    if (elements.plShareBtn) {
        elements.plShareBtn.addEventListener('click', () => {
            const pl = getActivePlaylist();
            const shareText = pl ? `Check out "${pl.title}" playlist on Telegram Music!` : 'Check out this playlist!';
            if (navigator.clipboard) {
                navigator.clipboard.writeText(shareText).then(() => {
                    showToast('Playlist link copied to clipboard!');
                }).catch(() => {
                    showToast(shareText);
                });
            } else {
                showToast(shareText);
            }
        });
    }

    if (elements.plDeleteBtn) {
        elements.plDeleteBtn.addEventListener('click', () => {
            deleteActivePlaylist();
        });
    }

    if (elements.plSearchInput) {
        elements.plSearchInput.addEventListener('input', (e) => {
            state.playlistSearchQuery = e.target.value;
            renderPlaylistTracks();
        });
    }

    if (elements.plSortSelect) {
        elements.plSortSelect.addEventListener('change', (e) => {
            state.playlistSortOrder = e.target.value;
            renderPlaylistTracks();
        });
    }

    if (elements.closeModalBtn) {
        elements.closeModalBtn.addEventListener('click', () => {
            closeAddSongsModal();
        });
    }

    if (elements.modalSearchInput) {
        elements.modalSearchInput.addEventListener('input', (e) => {
            state.modalSearchQuery = e.target.value;
            renderAddSongsModal();
        });
    }

    if (elements.navMenuItems) {
        elements.navMenuItems.forEach((item) => {
            const btn = item.querySelector('.nav-menu-btn');
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const option = item.getAttribute('data-option');
                    selectNavOption(option);
                });
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (state.isNavMenuOpen && elements.topNavContainer && !elements.topNavContainer.contains(e.target)) {
            closeNavMenu();
        }
    });

    elements.playButton.addEventListener('click', togglePlayPause);
    elements.prevButton.addEventListener('click', playPrev);
    elements.nextButton.addEventListener('click', playNext);

    if (elements.moreTab) {
        elements.moreTab.addEventListener('click', toggleMoreSection);
    }
    if (elements.shuffleButton) {
        elements.shuffleButton.addEventListener('click', toggleShuffle);
    }
    if (elements.repeatButton) {
        elements.repeatButton.addEventListener('click', cycleRepeatMode);
    }
    if (elements.queueButton) {
        elements.queueButton.addEventListener('click', toggleQueue);
    }
    if (elements.muteButton) {
        elements.muteButton.addEventListener('click', toggleMute);
    }
    if (elements.volumeBar) {
        elements.volumeBar.addEventListener('input', (e) => {
            setVolume(Number(e.target.value));
        });
    }

    elements.audio.addEventListener('play', () => {
        updatePlayButton();
        startProgressLoop();
    });
    elements.audio.addEventListener('pause', () => {
        updatePlayButton();
        cancelProgressLoop();
    });
    elements.audio.addEventListener('ended', handleTrackEnded);
    elements.audio.addEventListener('timeupdate', updateProgress);
    elements.audio.addEventListener('loadedmetadata', updateProgress);

    elements.progressBar.addEventListener('input', () => {
        state.isSeeking = true;
        updateRangeStyle(elements.progressBar);
        const duration = elements.audio.duration || getCurrentSong()?.duration || 0;
        elements.currentTime.textContent = formatDuration((Number(elements.progressBar.value) / 100) * duration);
    });
    elements.progressBar.addEventListener('change', seekToProgress);

    document.addEventListener('keydown', (e) => {
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
    updateRangeStyle(elements.progressBar);
    updateVolumeStyle();
    bindEvents();
    loadSongs();
}

init();
