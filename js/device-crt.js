(function () {
    'use strict';

    function initCRT() {
        var canvas = document.querySelector('#crt-screen');
        var audio = document.querySelector('#audio-player');

        if (!canvas) return;

        var ctx = canvas.getContext('2d');
        if (!ctx) return;

        var COLS = 48;
        var ROWS = 30;
        var TOTAL_CELLS = COLS * ROWS; // 1440

        // Fixed RGB palette
        var PALETTE = [
            [255, 62, 165],  // #FF3EA5 (pink)
            [192, 75, 255],  // #C04BFF (purple)
            [110, 107, 255], // #6E6BFF (indigo)
            [56, 182, 255],  // #38B6FF (blue)
            [46, 230, 214],  // #2EE6D6 (cyan)
            [255, 138, 61]   // #FF8A3D (orange)
        ];

        // Allocate buffers once
        var activeBrightness = new Float32Array(TOTAL_CELLS);
        var activeColorIndex = new Float32Array(TOTAL_CELLS);
        var incomingBrightness = new Float32Array(TOTAL_CELLS);
        var incomingColorIndex = new Float32Array(TOTAL_CELLS);
        var sparkleGrid = new Float32Array(TOTAL_CELLS);

        // Canvas sizing & pixel ratio
        var cell = 0;
        var dpr = 1;

        function updateCanvasSize() {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            var rect = canvas.getBoundingClientRect();
            var cssW = rect.width || 600;
            var cssH = rect.height || 360;

            canvas.width = Math.round(cssW * dpr);
            canvas.height = Math.round(cssH * dpr);

            cell = canvas.width / COLS;
        }

        if (window.ResizeObserver) {
            var ro = new ResizeObserver(function () {
                updateCanvasSize();
                if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                    renderStaticFrame();
                }
            });
            ro.observe(canvas);
        } else {
            window.addEventListener('resize', function () {
                updateCanvasSize();
                if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                    renderStaticFrame();
                }
            });
        }
        updateCanvasSize();

        // Audio state
        var currentState = 'idle'; // 'idle', 'playing', 'paused'
        var timeScaleTarget = 1.0;
        var timeScaleCurrent = 1.0;
        var brightnessMultTarget = 0.55;
        var brightnessMultCurrent = 0.55;

        // Shuffle bag pattern rotation
        var PATTERN_COUNT = 6;
        var bag = [];
        var lastPatternOfOldBag = -1;

        function getNextPattern() {
            if (bag.length === 0) {
                var newBag = [0, 1, 2, 3, 4, 5];
                // Fisher-Yates shuffle
                for (var i = newBag.length - 1; i > 0; i--) {
                    var j = Math.floor(Math.random() * (i + 1));
                    var tmp = newBag[i];
                    newBag[i] = newBag[j];
                    newBag[j] = tmp;
                }
                if (newBag[0] === lastPatternOfOldBag && newBag.length > 1) {
                    var swapIdx = 1 + Math.floor(Math.random() * (newBag.length - 1));
                    var t = newBag[0];
                    newBag[0] = newBag[swapIdx];
                    newBag[swapIdx] = t;
                }
                bag = newBag;
            }
            var picked = bag.pop();
            if (bag.length === 0) {
                lastPatternOfOldBag = picked;
            }
            return picked;
        }

        function getRandomDuration() {
            return 7 + Math.random() * 5; // 7 to 12 seconds
        }

        var activePatternIndex = 4; // default sparkle in idle
        var activePatternTime = 0;
        var activePatternDuration = getRandomDuration();

        var inTransition = false;
        var transitionElapsed = 0;
        var TRANSITION_DURATION = 1.2;
        var incomingPatternIndex = -1;
        var incomingPatternTime = 0;

        // Helper hash for rain
        function hashCol(c) {
            var val = Math.sin(c * 12.9898 + 78.233) * 43758.5453123;
            return val - Math.floor(val);
        }

        // Compute patterns into target buffers
        function computePattern(patternIdx, t, bBuffer, cBuffer, isIdleState) {
            var col, row, idx, s1, s2, s3, v, speed, offset, head, dist, dr, y, bVal, cVal;

            if (patternIdx === 0) {
                // 1. Plasma
                for (row = 0; row < ROWS; row++) {
                    for (col = 0; col < COLS; col++) {
                        idx = row * COLS + col;
                        s1 = Math.sin(col * 0.30 + t);
                        s2 = Math.sin(row * 0.40 - t * 1.3);
                        s3 = Math.sin((col + row) * 0.20 + t * 0.7);
                        v = (s1 + s2 + s3) / 3.0;
                        bBuffer[idx] = 0.5 + 0.5 * v;
                        cBuffer[idx] = 0.1 + 0.3 * (s1 * 0.5 + 0.5) + 0.2 * (col / COLS);
                    }
                }
            } else if (patternIdx === 1) {
                // 2. Rain
                for (col = 0; col < COLS; col++) {
                    speed = 0.6 + 1.2 * hashCol(col * 1.1);
                    offset = hashCol(col * 2.3) * 30.0;
                    head = ((t * speed + offset) % 37) - 7;
                    for (row = 0; row < ROWS; row++) {
                        idx = row * COLS + col;
                        dist = row - head;
                        if (dist >= 0 && dist < 7) {
                            bBuffer[idx] = 1.0 - (dist / 7.0);
                        } else {
                            bBuffer[idx] = 0.0;
                        }
                        cBuffer[idx] = 0.05 + (col / COLS) * 0.45 + (row / ROWS) * 0.1;
                    }
                }
            } else if (patternIdx === 2) {
                // 3. Rings
                var cx = 23.5, cy = 14.5;
                for (row = 0; row < ROWS; row++) {
                    for (col = 0; col < COLS; col++) {
                        idx = row * COLS + col;
                        dist = Math.hypot(col - cx, row - cy);
                        dr = ((dist - t * 9.0) % 12.0 + 12.0) % 12.0;
                        if (dr < 2.2) {
                            bVal = (1.0 - dr / 2.2) * Math.max(0, 1.0 - dist / 40.0);
                        } else {
                            bVal = 0.0;
                        }
                        bBuffer[idx] = Math.min(1.0, Math.max(0.0, bVal));
                        cBuffer[idx] = 0.05 + (dist / 40.0) * 0.5;
                    }
                }
            } else if (patternIdx === 3) {
                // 4. Bars
                for (row = 0; row < ROWS; row++) {
                    y = ((row + t * 4.0) % 6.0 + 6.0) % 6.0;
                    bVal = y < 3.0 ? Math.sin((y / 3.0) * Math.PI) : 0.0;
                    for (col = 0; col < COLS; col++) {
                        idx = row * COLS + col;
                        bBuffer[idx] = bVal;
                        cBuffer[idx] = 0.15 + (row / ROWS) * 0.35 + Math.sin(t * 0.5) * 0.05;
                    }
                }
            } else if (patternIdx === 4) {
                // 5. Sparkle
                var igniteRate = isIdleState ? 0.006 : 0.02;
                for (idx = 0; idx < TOTAL_CELLS; idx++) {
                    sparkleGrid[idx] *= 0.90;
                    if (Math.random() < igniteRate) {
                        sparkleGrid[idx] = 1.0;
                    }
                    bBuffer[idx] = sparkleGrid[idx];
                    col = idx % COLS;
                    row = Math.floor(idx / COLS);
                    cBuffer[idx] = 0.05 + ((col * 3 + row * 7) % 10) * 0.04 + Math.sin(t * 0.3) * 0.05;
                }
            } else if (patternIdx === 5) {
                // 6. Checkerwave
                for (row = 0; row < ROWS; row++) {
                    for (col = 0; col < COLS; col++) {
                        idx = row * COLS + col;
                        if ((col + row) % 2 === 0) {
                            bBuffer[idx] = 0.5 + 0.5 * Math.sin(t * 2.0 + (col + row) * 0.5);
                        } else {
                            bBuffer[idx] = 0.1;
                        }
                        cBuffer[idx] = 0.10 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.5 + col * 0.1));
                    }
                }
            }
        }

        // Interpolate palette color into RGB
        function getPaletteRGB(pos, outRGB) {
            var norm = ((pos % 1.0) + 1.0) % 1.0;
            var idx = norm * 6.0;
            var i1 = Math.floor(idx) % 6;
            var i2 = (i1 + 1) % 6;
            var frac = idx - Math.floor(idx);

            var c1 = PALETTE[i1];
            var c2 = PALETTE[i2];

            outRGB[0] = Math.round(c1[0] + (c2[0] - c1[0]) * frac);
            outRGB[1] = Math.round(c1[1] + (c2[1] - c1[1]) * frac);
            outRGB[2] = Math.round(c1[2] + (c2[2] - c1[2]) * frac);
        }

        var rgbTemp = [0, 0, 0];

        // Draw current buffers to canvas
        function drawFrame() {
            ctx.fillStyle = '#0a0a0f';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            var rOff = cell * 0.36;
            var rGlow = cell * 0.5;

            var blendFactor = inTransition ? (transitionElapsed / TRANSITION_DURATION) : 0;
            if (blendFactor > 1) blendFactor = 1;

            var col, row, idx, b, cIndex, alpha;

            for (row = 0; row < ROWS; row++) {
                var cy = (row + 0.5) * cell;
                for (col = 0; col < COLS; col++) {
                    idx = row * COLS + col;
                    var cx = (col + 0.5) * cell;

                    if (inTransition) {
                        b = (1 - blendFactor) * activeBrightness[idx] + blendFactor * incomingBrightness[idx];
                        cIndex = (1 - blendFactor) * activeColorIndex[idx] + blendFactor * incomingColorIndex[idx];
                    } else {
                        b = activeBrightness[idx];
                        cIndex = activeColorIndex[idx];
                    }

                    b *= brightnessMultCurrent;

                    if (b <= 0.001) {
                        ctx.fillStyle = '#17131f';
                        ctx.beginPath();
                        ctx.arc(cx, cy, rOff, 0, Math.PI * 2);
                        ctx.fill();
                    } else {
                        getPaletteRGB(cIndex, rgbTemp);
                        alpha = 0.15 + 0.85 * b;

                        ctx.fillStyle = 'rgba(' + rgbTemp[0] + ',' + rgbTemp[1] + ',' + rgbTemp[2] + ',' + alpha.toFixed(3) + ')';
                        ctx.beginPath();
                        ctx.arc(cx, cy, rOff, 0, Math.PI * 2);
                        ctx.fill();

                        if (b > 0.7) {
                            ctx.fillStyle = 'rgba(' + rgbTemp[0] + ',' + rgbTemp[1] + ',' + rgbTemp[2] + ',0.18)';
                            ctx.beginPath();
                            ctx.arc(cx, cy, rGlow, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                }
            }
        }

        function renderStaticFrame() {
            computePattern(0, 3.0, activeBrightness, activeColorIndex, false);
            drawFrame();
        }

        // Loop control
        var animId = null;
        var lastTimestamp = 0;
        var loopFailed = false;

        function updateStateTargets(newState) {
            var prevState = currentState;
            currentState = newState;
            if (currentState === 'idle') {
                timeScaleTarget = 1.0;
                brightnessMultTarget = 0.55;
                activePatternIndex = 4; // forced sparkle
            } else if (currentState === 'playing') {
                timeScaleTarget = 1.0;
                brightnessMultTarget = 1.0;
                if (prevState === 'idle') {
                    // transition to first rotated pattern on play
                    activePatternIndex = getNextPattern();
                    activePatternTime = 0;
                    activePatternDuration = getRandomDuration();
                }
            } else if (currentState === 'paused') {
                timeScaleTarget = 0.25;
                brightnessMultTarget = 0.40;
            }

            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                renderStaticFrame();
            }
        }

        function frame(timestamp) {
            try {
                if (loopFailed) return;

                if (lastTimestamp !== 0) {
                    var elapsed = timestamp - lastTimestamp;
                    if (elapsed < 32.0) { // cap to ~30 fps
                        animId = requestAnimationFrame(frame);
                        return;
                    }
                }

                var dt = lastTimestamp === 0 ? 0.033 : Math.min((timestamp - lastTimestamp) / 1000.0, 0.1);
                lastTimestamp = timestamp;

                // Exponential smoothing towards targets (~0.4s)
                var smoothFactor = 1.0 - Math.exp(-dt / 0.4);
                timeScaleCurrent += (timeScaleTarget - timeScaleCurrent) * smoothFactor;
                brightnessMultCurrent += (brightnessMultTarget - brightnessMultCurrent) * smoothFactor;

                var patternDt = dt * timeScaleCurrent;

                if (currentState === 'idle') {
                    activePatternIndex = 4; // forced sparkle
                    activePatternTime += patternDt;
                    computePattern(activePatternIndex, activePatternTime, activeBrightness, activeColorIndex, true);
                    inTransition = false;
                } else {
                    // Playing or Paused
                    if (currentState !== 'paused') {
                        activePatternTime += patternDt;

                        if (inTransition) {
                            transitionElapsed += patternDt;
                            incomingPatternTime += patternDt;

                            computePattern(activePatternIndex, activePatternTime, activeBrightness, activeColorIndex, false);
                            computePattern(incomingPatternIndex, incomingPatternTime, incomingBrightness, incomingColorIndex, false);

                            if (transitionElapsed >= TRANSITION_DURATION) {
                                inTransition = false;
                                activePatternIndex = incomingPatternIndex;
                                activePatternTime = incomingPatternTime;
                                activePatternDuration = incomingPatternDuration;
                            }
                        } else {
                            computePattern(activePatternIndex, activePatternTime, activeBrightness, activeColorIndex, false);

                            if (activePatternTime >= activePatternDuration) {
                                inTransition = true;
                                transitionElapsed = 0;
                                incomingPatternIndex = getNextPattern();
                                incomingPatternTime = 0;
                                incomingPatternDuration = getRandomDuration();
                            }
                        }
                    } else {
                        // Paused: freeze pattern rotation, but compute current pattern frame with current time
                        if (inTransition) {
                            computePattern(activePatternIndex, activePatternTime, activeBrightness, activeColorIndex, false);
                            computePattern(incomingPatternIndex, incomingPatternTime, incomingBrightness, incomingColorIndex, false);
                        } else {
                            computePattern(activePatternIndex, activePatternTime, activeBrightness, activeColorIndex, false);
                        }
                    }
                }

                drawFrame();

                animId = requestAnimationFrame(frame);
            } catch (err) {
                loopFailed = true;
                console.warn('CRT Screen loop halted due to exception:', err);
                if (animId) {
                    cancelAnimationFrame(animId);
                    animId = null;
                }
            }
        }

        function startLoop() {
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                renderStaticFrame();
                return;
            }
            if (!animId && !loopFailed) {
                lastTimestamp = 0;
                animId = requestAnimationFrame(frame);
            }
        }

        function stopLoop() {
            if (animId) {
                cancelAnimationFrame(animId);
                animId = null;
            }
        }

        // Visibility handling
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                stopLoop();
            } else {
                startLoop();
            }
        });

        // Reduced motion query listener
        var motionMql = window.matchMedia('(prefers-reduced-motion: reduce)');
        function handleMotionChange(e) {
            if (e.matches) {
                stopLoop();
                renderStaticFrame();
            } else {
                startLoop();
            }
        }
        if (motionMql.addEventListener) {
            motionMql.addEventListener('change', handleMotionChange);
        } else if (motionMql.addListener) {
            motionMql.addListener(handleMotionChange);
        }

        // Audio event handling
        if (audio) {
            audio.addEventListener('play', function () {
                updateStateTargets('playing');
            });
            audio.addEventListener('playing', function () {
                updateStateTargets('playing');
            });
            audio.addEventListener('pause', function () {
                updateStateTargets('paused');
            });
            audio.addEventListener('ended', function () {
                updateStateTargets('paused');
            });
            audio.addEventListener('emptied', function () {
                if (!audio.src) {
                    updateStateTargets('idle');
                } else {
                    updateStateTargets('paused');
                }
            });
        }

        // Initial setup
        updateStateTargets('idle');
        startLoop();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCRT);
    } else {
        initCRT();
    }
})();
