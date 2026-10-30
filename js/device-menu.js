(function () {
    'use strict';

    function initDeviceMenu() {
        var panel = document.getElementById('device-panel');
        var hamburgerBtn = document.getElementById('hamburger-button');
        var deviceViews = document.getElementById('device-views');
        var settingsView = document.getElementById('device-settings-view');

        var songsOverlay = document.getElementById('songs-overlay');
        var playlistOverlay = document.getElementById('playlist-overlay');
        var artistsOverlay = document.getElementById('artists-overlay');
        var statsOverlay = document.getElementById('stats-overlay');

        var songsBackBtn = document.getElementById('songs-back-button');
        var playlistsBackBtn = document.getElementById('playlists-back-btn');
        var artistsBackBtn = document.getElementById('artists-back-btn');
        var refreshBtn = document.getElementById('refresh-songs-btn');

        var tabSongs = document.getElementById('tab-songs');
        var tabPlaylists = document.getElementById('tab-playlists');
        var tabArtists = document.getElementById('tab-artists');
        var tabSettings = document.getElementById('tab-settings');
        var tabs = [tabSongs, tabPlaylists, tabArtists, tabSettings].filter(Boolean);

        var queueContainer = document.getElementById('queue-container');
        var queueBtn = document.getElementById('queue-button');

        // A. Re-parenting & permanently hiding legacy elements
        if (deviceViews) {
            if (songsOverlay) deviceViews.appendChild(songsOverlay);
            if (playlistOverlay) deviceViews.appendChild(playlistOverlay);
            if (artistsOverlay) deviceViews.appendChild(artistsOverlay);
            if (queueContainer) deviceViews.appendChild(queueContainer);
        }

        if (settingsView && refreshBtn) {
            settingsView.appendChild(refreshBtn);
        }

        if (statsOverlay) {
            statsOverlay.classList.add('device-hidden-legacy');
        }

        var statsNavItem = document.querySelector('.nav-menu-item[data-option="stats"]');
        if (statsNavItem) {
            statsNavItem.classList.add('device-hidden-legacy');
        }

        var activeTabName = 'songs';

        function closeOpenOverlays() {
            if (songsOverlay && !songsOverlay.classList.contains('hidden')) {
                if (songsBackBtn) songsBackBtn.click();
            }
            if (playlistOverlay && !playlistOverlay.classList.contains('hidden')) {
                if (playlistsBackBtn) playlistsBackBtn.click();
            }
            if (artistsOverlay && !artistsOverlay.classList.contains('hidden')) {
                if (artistsBackBtn) artistsBackBtn.click();
            }
        }

        function clickNavItem(dataOption) {
            var navItem = document.querySelector('.nav-menu-item[data-option="' + dataOption + '"]');
            if (navItem) {
                var btn = navItem.querySelector('.nav-menu-btn') || navItem.querySelector('button') || navItem;
                if (btn) btn.click();
            }
        }

        function switchTab(targetView) {
            activeTabName = targetView;

            tabs.forEach(function (t) {
                var viewName = t.getAttribute('data-view');
                var isSelected = viewName === targetView;
                t.setAttribute('aria-selected', isSelected ? 'true' : 'false');
            });

            closeOpenOverlays();

            if (settingsView) {
                settingsView.hidden = true;
            }

            if (targetView === 'songs') {
                clickNavItem('all-songs');
            } else if (targetView === 'playlists') {
                clickNavItem('playlists');
            } else if (targetView === 'artists') {
                clickNavItem('artists');
            } else if (targetView === 'settings') {
                if (settingsView) {
                    settingsView.hidden = false;
                }
            }
        }

        function openPanel() {
            if (!panel) return;
            panel.classList.add('is-open');
            if (hamburgerBtn) {
                hamburgerBtn.classList.add('is-open');
                hamburgerBtn.setAttribute('aria-expanded', 'true');
            }
            document.body.classList.add('device-menu-open');
            panel.setAttribute('aria-hidden', 'false');

            switchTab('songs');

            if (tabSongs) {
                tabSongs.focus();
            }
        }

        function closePanel() {
            if (!panel) return;

            if (queueContainer && !queueContainer.classList.contains('hidden') && queueBtn) {
                queueBtn.click();
            }

            panel.classList.remove('is-open');
            if (hamburgerBtn) {
                hamburgerBtn.classList.remove('is-open');
                hamburgerBtn.setAttribute('aria-expanded', 'false');
            }
            document.body.classList.remove('device-menu-open');
            panel.setAttribute('aria-hidden', 'true');

            closeOpenOverlays();
            if (settingsView) {
                settingsView.hidden = true;
            }

            if (hamburgerBtn) {
                hamburgerBtn.focus();
            }
        }

        function togglePanel() {
            if (!panel) return;
            if (panel.classList.contains('is-open')) {
                closePanel();
            } else {
                openPanel();
            }
        }

        // B. Hamburger capture phase listener
        document.addEventListener('click', function (e) {
            var target = e.target;
            if (target && target.closest && target.closest('#hamburger-button')) {
                e.stopPropagation();
                e.preventDefault();
                togglePanel();
            }
        }, true);

        // D. Tab click handlers
        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                if (queueContainer && !queueContainer.classList.contains('hidden') && queueBtn) {
                    queueBtn.click();
                }
                var view = tab.getAttribute('data-view');
                if (view) {
                    switchTab(view);
                }
            });
        });

        // E. Escape key handling
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                var searchOverlay = document.getElementById('search-overlay');
                var isSearchOpen = searchOverlay && !searchOverlay.classList.contains('hidden');
                if (!isSearchOpen && panel && panel.classList.contains('is-open')) {
                    closePanel();
                }
            }
        });

        // F. Step 1 — Sideways Search Pill Observer & Positioning
        var searchOverlay = document.getElementById('search-overlay');
        var searchButton = document.getElementById('search-button');

        function updateSearchPosition() {
            if (!searchOverlay || !searchButton) return;
            if (searchOverlay.classList.contains('hidden')) return;

            var rect = searchButton.getBoundingClientRect();
            var sbTop = rect.top;
            var sbRight = window.innerWidth - rect.right;
            var sbSize = rect.height;

            searchOverlay.style.setProperty('--sb-top', sbTop + 'px');
            searchOverlay.style.setProperty('--sb-right', sbRight + 'px');
            searchOverlay.style.setProperty('--sb-size', sbSize + 'px');
        }

        if (searchOverlay && searchButton) {
            var searchObserver = new MutationObserver(function () {
                if (!searchOverlay.classList.contains('hidden')) {
                    updateSearchPosition();
                }
            });
            searchObserver.observe(searchOverlay, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] });

            window.addEventListener('resize', function () {
                if (!searchOverlay.classList.contains('hidden')) {
                    updateSearchPosition();
                }
            });
        }

        // G. Step 2 — Queue Observer inside panel
        if (queueContainer) {
            var queueObserver = new MutationObserver(function () {
                var isQueueVisible = !queueContainer.classList.contains('hidden');
                if (isQueueVisible) {
                    if (panel && !panel.classList.contains('is-open')) {
                        panel.classList.add('is-open');
                        if (hamburgerBtn) {
                            hamburgerBtn.classList.add('is-open');
                            hamburgerBtn.setAttribute('aria-expanded', 'true');
                        }
                        document.body.classList.add('device-menu-open');
                        panel.setAttribute('aria-hidden', 'false');
                    }

                    tabs.forEach(function (t) {
                        t.setAttribute('aria-selected', 'false');
                    });

                    closeOpenOverlays();
                    if (settingsView) {
                        settingsView.hidden = true;
                    }
                } else {
                    if (panel && panel.classList.contains('is-open')) {
                        var songsHidden = !songsOverlay || songsOverlay.classList.contains('hidden');
                        var playlistHidden = !playlistOverlay || playlistOverlay.classList.contains('hidden');
                        var artistsHidden = !artistsOverlay || artistsOverlay.classList.contains('hidden');
                        var settingsHidden = !settingsView || settingsView.hidden;

                        if (songsHidden && playlistHidden && artistsHidden && settingsHidden) {
                            switchTab('songs');
                        }
                    }
                }
            });
            queueObserver.observe(queueContainer, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
        }

        // H. Step 3 — Height Fit
        var playerContainer = document.getElementById('player-container');
        var deviceBody = document.querySelector('.device-body');
        var fitRafId = null;

        function fitDevice() {
            if (!playerContainer || !deviceBody) return;

            playerContainer.style.setProperty('--dv-zoom', '1');
            var natural = deviceBody.offsetHeight;
            var isDesktop = window.innerWidth >= 900;
            var avail = window.innerHeight - (isDesktop ? 48 : 168);
            var scale = Math.min(1, Math.max(0.55, avail / natural));
            var rounded = Math.round(scale * 1000) / 1000;

            playerContainer.style.setProperty('--dv-zoom', rounded.toString());
        }

        function debouncedFitDevice() {
            if (fitRafId !== null) return;
            fitRafId = requestAnimationFrame(function () {
                fitRafId = null;
                fitDevice();
            });
        }

        fitDevice();

        window.addEventListener('load', fitDevice);
        window.addEventListener('resize', debouncedFitDevice);
        window.addEventListener('orientationchange', fitDevice);

        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(fitDevice).catch(function () {});
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDeviceMenu);
    } else {
        initDeviceMenu();
    }
})();
