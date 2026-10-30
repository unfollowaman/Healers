(function () {
    function initDeviceUI() {
        var audio = document.querySelector('#audio-player');
        var progressBar = document.querySelector('#progress-bar');

        if (!audio || !progressBar) return;

        function syncProgress() {
            if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
                var pct = (audio.currentTime / audio.duration) * 100;
                progressBar.style.setProperty('--progress', pct + '%');
            } else {
                progressBar.style.setProperty('--progress', '0%');
            }
        }

        var audioEvents = ['timeupdate', 'loadedmetadata', 'durationchange', 'emptied', 'seeked'];
        for (var i = 0; i < audioEvents.length; i++) {
            audio.addEventListener(audioEvents[i], syncProgress);
        }

        progressBar.addEventListener('input', function () {
            if (progressBar && progressBar.value !== undefined) {
                progressBar.style.setProperty('--progress', progressBar.value + '%');
            }
        });

        syncProgress();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDeviceUI);
    } else {
        initDeviceUI();
    }
})();
