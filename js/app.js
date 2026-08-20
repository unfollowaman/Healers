const state = {
    songs: [],
    currentIndex: -1,
    isSeeking: false
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
    nextButton: document.querySelector('#next-button')
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

function updateNowPlaying(song) {
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
    const nextIndex = (state.currentIndex + 1) % state.songs.length;
    cycleBackgroundVideo();
    startSong(nextIndex);
}

function playPrev() {
    if (!state.songs.length) return;
    const prevIndex = (state.currentIndex - 1 + state.songs.length) % state.songs.length;
    startSong(prevIndex);
}

function updatePlayButton() {
    const isPlaying = !elements.audio.paused && !elements.audio.ended;
    if (elements.playIconImg) {
        elements.playIconImg.src = isPlaying ? '/assets/icons_legacy/pause.png' : '/assets/icons_legacy/play.png';
        elements.playIconImg.alt = isPlaying ? 'Pause' : 'Play';
    }
    elements.playButton.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
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

    elements.audio.addEventListener('play', updatePlayButton);
    elements.audio.addEventListener('pause', updatePlayButton);
    elements.audio.addEventListener('ended', playNext);
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
    bindEvents();
    loadSongs();
}

init();
