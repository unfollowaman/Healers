(function () {
    'use strict';

    if (!('mediaSession' in navigator)) return;

    function initDeviceMedia() {
        var audio = document.getElementById('audio-player');
        var nowTitle = document.getElementById('now-title');
        var nowArtist = document.getElementById('now-artist');
        var albumArtPlaceholder = document.getElementById('album-art-placeholder');
        var playButton = document.getElementById('play-button');
        var prevButton = document.getElementById('prev-button');
        var nextButton = document.getElementById('next-button');

        var placeholderTexts = [
            'Loading...',
            'Please wait',
            'No Song Loaded',
            'Ready to play',
            'Loading songs...',
            'Connecting to library',
            'No songs found',
            'Library empty',
            'Error loading songs'
        ];

        var generatedCoverCache = new Map();
        var currentToken = 0;

        function getTitleHue(title) {
            var hash = 0;
            for (var i = 0; i < title.length; i++) {
                hash = title.charCodeAt(i) + ((hash << 5) - hash);
            }
            return Math.abs(hash) % 360;
        }

        function generateDefaultArtwork(title) {
            if (generatedCoverCache.has(title)) {
                return generatedCoverCache.get(title);
            }

            try {
                var canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 512;
                var ctx = canvas.getContext('2d');
                if (!ctx) return null;

                var hue = getTitleHue(title);

                ctx.fillStyle = 'hsl(' + hue + ', 45%, 32%)';
                ctx.fillRect(0, 0, 512, 512);

                var gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256 * Math.SQRT2);
                gradient.addColorStop(0, 'rgba(0,0,0,0)');
                gradient.addColorStop(1, 'rgba(0,0,0,0.35)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 512, 512);

                var firstChar = (title && title.trim().charAt(0) || '?').toUpperCase();
                ctx.font = '600 240px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#F0EDE5';
                ctx.fillText(firstChar, 256, 256);

                var dataUrl = canvas.toDataURL('image/png');
                var artwork = [{ src: dataUrl, sizes: '512x512', type: 'image/png' }];

                if (generatedCoverCache.size >= 50) {
                    var firstKey = generatedCoverCache.keys().next().value;
                    generatedCoverCache.delete(firstKey);
                }
                generatedCoverCache.set(title, artwork);
                return artwork;
            } catch (err) {
                console.warn('Failed to generate default artwork:', err);
                return null;
            }
        }

        function clamp(num, min, max) {
            return Math.min(Math.max(num, min), max);
        }

        function updateMetadata() {
            if (!nowTitle || !nowArtist || !audio) return;

            var titleText = (nowTitle.textContent || '').trim();
            var artistText = (nowArtist.textContent || '').trim();

            if (!audio.src || !titleText || placeholderTexts.indexOf(titleText) !== -1) {
                return;
            }

            var defaultArtwork = generateDefaultArtwork(titleText);
            var token = ++currentToken;

            try {
                if (window.MediaMetadata) {
                    navigator.mediaSession.metadata = new MediaMetadata({
                        title: titleText,
                        artist: artistText || 'Unknown Artist',
                        album: 'Healers',
                        artwork: defaultArtwork || []
                    });
                }
            } catch (err) {
                console.warn('MediaSession metadata set error:', err);
            }

            var coverImg = albumArtPlaceholder ? albumArtPlaceholder.querySelector('img') : null;
            var coverSrc = coverImg ? coverImg.getAttribute('src') : null;

            if (coverSrc) {
                var absUrl = new URL(coverSrc, window.location.href).href;
                var img = new Image();
                img.onload = function () {
                    if (token !== currentToken) return;
                    var w = img.naturalWidth || 512;
                    var h = img.naturalHeight || 512;
                    var type = 'image/jpeg';
                    if (absUrl.toLowerCase().indexOf('.png') !== -1) type = 'image/png';
                    else if (absUrl.toLowerCase().indexOf('.webp') !== -1) type = 'image/webp';

                    try {
                        if (window.MediaMetadata) {
                            navigator.mediaSession.metadata = new MediaMetadata({
                                title: titleText,
                                artist: artistText || 'Unknown Artist',
                                album: 'Healers',
                                artwork: [{ src: absUrl, sizes: w + 'x' + h, type: type }]
                            });
                        }
                    } catch (err) {
                        console.warn('MediaSession metadata upgrade error:', err);
                    }
                };
                img.onerror = function () {
                    // On error, default artwork is already set
                };
                img.src = absUrl;
            }
        }

        var debounceTimer = null;
        function debouncedUpdateMetadata() {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function () {
                debounceTimer = null;
                updateMetadata();
            }, 60);
        }

        if (nowTitle || nowArtist || albumArtPlaceholder) {
            var observer = new MutationObserver(debouncedUpdateMetadata);
            var obsOptions = { childList: true, characterData: true, subtree: true, attributes: true };
            if (nowTitle) observer.observe(nowTitle, obsOptions);
            if (nowArtist) observer.observe(nowArtist, obsOptions);
            if (albumArtPlaceholder) observer.observe(albumArtPlaceholder, obsOptions);
        }

        if (audio) {
            audio.addEventListener('loadedmetadata', updateMetadata);
            audio.addEventListener('play', updateMetadata);
        }

        function updatePlaybackState() {
            if (!audio) return;
            try {
                if (audio.paused) {
                    navigator.mediaSession.playbackState = 'paused';
                } else {
                    navigator.mediaSession.playbackState = 'playing';
                }
            } catch (err) {
                console.warn('MediaSession playbackState error:', err);
            }
        }

        function handleAudioEndedOrEmptied() {
            try {
                navigator.mediaSession.playbackState = 'none';
            } catch (err) {
                console.warn('MediaSession playbackState none error:', err);
            }
        }

        if (audio) {
            audio.addEventListener('play', updatePlaybackState);
            audio.addEventListener('playing', updatePlaybackState);
            audio.addEventListener('pause', updatePlaybackState);
            audio.addEventListener('ended', handleAudioEndedOrEmptied);
            audio.addEventListener('emptied', handleAudioEndedOrEmptied);
        }

        var lastSyncTime = 0;
        function syncPosition() {
            if (!audio) return;
            try {
                if (typeof navigator.mediaSession.setPositionState === 'function') {
                    if (Number.isFinite(audio.duration) && audio.duration > 0) {
                        navigator.mediaSession.setPositionState({
                            duration: audio.duration,
                            playbackRate: audio.playbackRate || 1,
                            position: clamp(audio.currentTime || 0, 0, audio.duration)
                        });
                    }
                }
            } catch (err) {
                console.warn('MediaSession setPositionState error:', err);
            }
        }

        function throttledSyncPosition() {
            var now = Date.now();
            if (now - lastSyncTime >= 1000) {
                lastSyncTime = now;
                syncPosition();
            }
        }

        if (audio) {
            audio.addEventListener('loadedmetadata', syncPosition);
            audio.addEventListener('durationchange', syncPosition);
            audio.addEventListener('seeked', syncPosition);
            audio.addEventListener('ratechange', syncPosition);
            audio.addEventListener('play', syncPosition);
            audio.addEventListener('pause', syncPosition);
            audio.addEventListener('timeupdate', throttledSyncPosition);
        }

        var actions = [
            ['play', function () {
                if (audio && audio.paused && playButton) {
                    playButton.click();
                }
            }],
            ['pause', function () {
                if (audio && !audio.paused && playButton) {
                    playButton.click();
                }
            }],
            ['previoustrack', function () {
                if (prevButton) prevButton.click();
            }],
            ['nexttrack', function () {
                if (nextButton) nextButton.click();
            }],
            ['seekto', function (details) {
                if (audio && details && Number.isFinite(details.seekTime)) {
                    var targetTime = details.seekTime;
                    if (details.fastSeek && typeof audio.fastSeek === 'function') {
                        audio.fastSeek(targetTime);
                    } else {
                        var maxDuration = audio.duration || targetTime;
                        audio.currentTime = clamp(targetTime, 0, maxDuration);
                    }
                    syncPosition();
                }
            }],
            ['stop', function () {
                if (audio && !audio.paused && playButton) {
                    playButton.click();
                }
            }]
        ];

        actions.forEach(function (pair) {
            var actionName = pair[0];
            var handler = pair[1];
            try {
                navigator.mediaSession.setActionHandler(actionName, handler);
            } catch (err) {
                console.warn('Failed to set mediaSession action handler for ' + actionName + ':', err);
            }
        });

        // Test whether the browser's default 10-second seek buttons can be hidden in the media notification.
        // Explicitly clearing seek actions signals to the browser that no custom seek intervals are supported.
        // Note: Default seek buttons may still appear if drawn unilaterally by the host browser or OS media UI (experiment).
        try {
            navigator.mediaSession.setActionHandler('seekbackward', null);
        } catch (err) {
            console.warn('Failed to clear seekbackward handler:', err);
        }

        try {
            navigator.mediaSession.setActionHandler('seekforward', null);
        } catch (err) {
            console.warn('Failed to clear seekforward handler:', err);
        }

        updateMetadata();
        syncPosition();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDeviceMedia);
    } else {
        initDeviceMedia();
    }
})();
