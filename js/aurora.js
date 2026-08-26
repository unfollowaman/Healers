/**
 * Aurora Background Animation Engine
 * Generates a soft, luminous, procedural aurora/light-field effect on canvas.
 */

const AURORA_CONFIG = {
    // Master controls
    baseHeightPercent: 0.62, // Base height position (~62% from top)
    speedMultiplier: 0.0003, // Slow, organic movement

    // Layer definitions (rendered back-to-front)
    layers: [
        {
            // Layer 1: Outer Deep Blue Atmospheric Waves
            speed: 0.7,
            baseOffset: -0.05,
            waves: [
                { wavelength: 0.0012, amplitude: 110, speed: 1.0, phase: 0.0 },
                { wavelength: 0.0022, amplitude: 65, speed: -0.6, phase: 2.1 },
                { wavelength: 0.0006, amplitude: 45, speed: 0.4, phase: 1.2 }
            ],
            stops: [
                { offset: 0.0, color: 'rgba(0, 0, 0, 0)' },
                { offset: 0.2, color: 'rgba(5, 30, 90, 0.45)' },
                { offset: 0.55, color: 'rgba(25, 90, 180, 0.6)' },
                { offset: 0.85, color: 'rgba(70, 160, 240, 0.8)' },
                { offset: 1.0, color: 'rgba(200, 235, 255, 0.95)' }
            ],
            composite: 'source-over'
        },
        {
            // Layer 2: Mid Icy Blue Flowing Waves
            speed: 0.95,
            baseOffset: -0.02,
            waves: [
                { wavelength: 0.0015, amplitude: 90, speed: -0.85, phase: 1.4 },
                { wavelength: 0.0028, amplitude: 50, speed: 1.1, phase: 0.5 },
                { wavelength: 0.0008, amplitude: 40, speed: -0.3, phase: 3.5 }
            ],
            stops: [
                { offset: 0.0, color: 'rgba(0, 0, 0, 0)' },
                { offset: 0.25, color: 'rgba(30, 110, 210, 0.5)' },
                { offset: 0.6, color: 'rgba(100, 190, 255, 0.75)' },
                { offset: 0.88, color: 'rgba(220, 245, 255, 0.9)' },
                { offset: 1.0, color: 'rgba(255, 255, 255, 1.0)' }
            ],
            composite: 'screen'
        },
        {
            // Layer 3: Dynamic Luminous White Core Waves
            speed: 1.2,
            baseOffset: 0.02,
            waves: [
                { wavelength: 0.0018, amplitude: 75, speed: 0.75, phase: 3.2 },
                { wavelength: 0.0009, amplitude: 55, speed: -0.9, phase: 1.1 },
                { wavelength: 0.0025, amplitude: 35, speed: 0.5, phase: 4.8 }
            ],
            stops: [
                { offset: 0.0, color: 'rgba(0, 0, 0, 0)' },
                { offset: 0.3, color: 'rgba(140, 215, 255, 0.6)' },
                { offset: 0.7, color: 'rgba(230, 245, 255, 0.88)' },
                { offset: 1.0, color: 'rgba(255, 255, 255, 1.0)' }
            ],
            composite: 'screen'
        }
    ],

    // Drifting luminous core glows at bottom
    coreGlows: [
        { xRatio: 0.2, speed: 0.4, radiusRatio: 0.4, color: 'rgba(200, 235, 255, 0.35)' },
        { xRatio: 0.55, speed: -0.3, radiusRatio: 0.45, color: 'rgba(255, 255, 255, 0.45)' },
        { xRatio: 0.85, speed: 0.5, radiusRatio: 0.38, color: 'rgba(150, 210, 255, 0.35)' }
    ]
};

class AuroraAnimation {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.animationFrameId = null;
        this.time = 0;
        this.isReducedMotion = false;

        this.init();
    }

    init() {
        this.checkReducedMotion();
        this.resize();
        this.bindEvents();
        this.start();
    }

    checkReducedMotion() {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.isReducedMotion = mediaQuery.matches;

        mediaQuery.addEventListener('change', (e) => {
            this.isReducedMotion = e.matches;
            if (this.isReducedMotion) {
                this.stop();
                this.renderFrame(0);
            } else {
                this.start();
            }
        });
    }

    resize() {
        // Limit DPR to 1 for high performance on retina displays
        const dpr = 1;
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;

        this.ctx.scale(dpr, dpr);

        if (this.isReducedMotion) {
            this.renderFrame(0);
        }
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resize());
    }

    getWaveHeight(x, layer, timestamp) {
        const baseH = this.height * (AURORA_CONFIG.baseHeightPercent + layer.baseOffset);
        let waveOffsetY = 0;

        layer.waves.forEach((w) => {
            const phase = w.phase + (timestamp * AURORA_CONFIG.speedMultiplier * w.speed * layer.speed);
            waveOffsetY += Math.sin(x * w.wavelength + phase) * w.amplitude;
        });

        return baseH + waveOffsetY;
    }

    renderFrame(timestamp) {
        const width = this.width;
        const height = this.height;

        this.ctx.clearRect(0, 0, width, height);

        // Black background in upper space
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, width, height);

        // Draw dynamic curved wave layers
        AURORA_CONFIG.layers.forEach((layer) => {
            this.ctx.globalCompositeOperation = layer.composite || 'source-over';

            const margin = 100;
            const step = Math.max(12, Math.floor((width + margin * 2) / 80));
            const points = [];

            let minY = height;

            for (let x = -margin; x <= width + margin + step; x += step) {
                const y = this.getWaveHeight(x, layer, timestamp);
                points.push({ x, y });
                if (y < minY) minY = y;
            }

            if (points.length < 2) return;

            // Build smooth curve along top of wave
            this.ctx.beginPath();
            this.ctx.moveTo(points[0].x, points[0].y);

            for (let i = 0; i < points.length - 1; i++) {
                const xc = (points[i].x + points[i + 1].x) / 2;
                const yc = (points[i].y + points[i + 1].y) / 2;
                this.ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
            }

            // Close shape down to bottom
            this.ctx.lineTo(width + margin, height + margin);
            this.ctx.lineTo(-margin, height + margin);
            this.ctx.closePath();

            // Vertical linear gradient: black (top of wave) -> deep blue -> light blue -> white (bottom)
            const gradient = this.ctx.createLinearGradient(0, minY, 0, height);
            layer.stops.forEach((stop) => {
                gradient.addColorStop(stop.offset, stop.color);
            });

            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        });

        // Drifting core glows near bottom
        this.ctx.globalCompositeOperation = 'screen';

        AURORA_CONFIG.coreGlows.forEach((glow, idx) => {
            const shift = Math.sin((timestamp * AURORA_CONFIG.speedMultiplier * glow.speed) + idx * 2) * (width * 0.2);
            const gx = (width * glow.xRatio) + shift;
            const gy = height * 0.95;
            const radius = width * glow.radiusRatio;

            const radialGrad = this.ctx.createRadialGradient(gx, gy, 0, gx, gy, radius);
            radialGrad.addColorStop(0, glow.color);
            radialGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            this.ctx.fillStyle = radialGrad;
            this.ctx.beginPath();
            this.ctx.arc(gx, gy, radius, 0, Math.PI * 2);
            this.ctx.fill();
        });

        this.ctx.globalCompositeOperation = 'source-over';
    }

    start() {
        if (this.isReducedMotion) {
            this.renderFrame(0);
            return;
        }

        const animate = (timestamp) => {
            this.time = timestamp;
            this.renderFrame(timestamp);
            this.animationFrameId = requestAnimationFrame(animate);
        };

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        this.animationFrameId = requestAnimationFrame(animate);
    }

    stop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.auroraInstance = new AuroraAnimation('aurora-canvas');
    });
} else {
    window.auroraInstance = new AuroraAnimation('aurora-canvas');
}

window.AURORA_CONFIG = AURORA_CONFIG;
