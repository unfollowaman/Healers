const state = {
    songs: [],
    currentIndex: -1,
    isSeeking: false,
    isMoreOpen: false,
    isShuffle: false,
    shuffledIndices: [],
    shuffleCurrentPos: -1,
    repeatMode: 'off', // 'off' | 'all' | 'one'
    isQueueOpen: false,
    isMuted: false,
    volume: 1
};

const elements = {
    bgVideo: document.querySelector('#bg-video'),
    audio: document.querySelector('#audio-player'),
    albumArtPlaceholder: document.querySelector('#album-art-placeholder'),
    nowTitle: document.querySelector('#now-title'),
    nowArtist: document.querySelector('#now-artist'),
    progressBar: document.querySelector('#progress-bar'),
    currentTime: document.querySelector('#current-time'),
    totalTime: document.querySelector('#total-time'),
    prevButton: document.querySelector('#prev-button'),
    playButton: document.querySelector('#play-button'),
    playIconImg: document.querySelector('#play-icon-img'),
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
    volumeBar: document.querySelector('#volume-bar')
};

// Video background setup
const bgVideos = ['bg1.mp4', 'bg2.mp4', 'bg3.mp4'];
let currentBgIndex = Math.floor(Math.random() * bgVideos.length);

function setBackgroundVideoSource(videoName) {
    if (!elements.bgVideo) return;
    elements.bgVideo.muted = true;
    const videoUrl = `/backgrounds/${videoName}`;
    if (elements.bgVideo.src !== window.location.origin + videoUrl && elements.bgVideo.getAttribute('src') !== videoUrl) {
        elements.bgVideo.src = videoUrl;
        elements.bgVideo.load();
    }
    const playPromise = elements.bgVideo.play();
    if (playPromise !== undefined) {
        playPromise.catch((err) => {
            console.warn('Background video play error:', err);
        });
    }
}

function initBackgroundVideo() {
    setBackgroundVideoSource(bgVideos[currentBgIndex]);
}

function cycleBackgroundVideo() {
    currentBgIndex = (currentBgIndex + 1) % bgVideos.length;
    setBackgroundVideoSource(bgVideos[currentBgIndex]);
}

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

function handleTrackEnded() {
    if (state.repeatMode === 'one') {
        if (elements.audio) {
            elements.audio.currentTime = 0;
            elements.audio.play().catch((err) => console.warn('Repeat one play error:', err));
        }
        return;
    }
    playNext();
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

    cycleBackgroundVideo();

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
    if (elements.playIconImg) {
        elements.playIconImg.src = isPlaying ? '/assets/icons_legacy/pause.png' : '/assets/icons_legacy/play.png';
        elements.playIconImg.alt = isPlaying ? 'Pause' : 'Play';
    }
    elements.playButton.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');

    if (elements.albumArtPlaceholder) {
        if (isPlaying) {
            elements.albumArtPlaceholder.classList.add('playing');
        } else {
            elements.albumArtPlaceholder.classList.remove('playing');
        }
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
    } catch (error) {
        elements.nowTitle.textContent = 'Error loading songs';
        elements.nowArtist.textContent = error.message || 'Check channel source';
    }
}

function bindEvents() {
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

    elements.audio.addEventListener('play', updatePlayButton);
    elements.audio.addEventListener('pause', updatePlayButton);
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
    initBackgroundVideo();
    updateRangeStyle(elements.progressBar);
    updateVolumeStyle();
    bindEvents();
    loadSongs();
}

init();
