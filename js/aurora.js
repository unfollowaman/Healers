/**
 * Aurora Background Animation Engine
 * Generates a soft, luminous, procedural aurora/light-field effect on canvas.
 */

const AURORA_CONFIG = {
    // Master controls
    baseHeightPercent: 0.65, // Base height position (~65% from top)
    speedMultiplier: 0.00025, // Slow, atmospheric movement

    // Layer definitions (rendered back-to-front)
    layers: [
        {
            // Layer 1: Deep Outer Atmospheric Glow
            speed: 0.6,
            baseOffset: -0.06,
            blur: 50,
            waves: [
                { wavelength: 0.0012, amplitude: 90, speed: 1.0, phase: 0.0 },
                { wavelength: 0.0022, amplitude: 50, speed: -0.6, phase: 2.1 },
                { wavelength: 0.0006, amplitude: 35, speed: 0.4, phase: 1.2 }
            ],
            stops: [
                { offset: 0.0, color: 'rgba(0, 0, 0, 0)' },
                { offset: 0.3, color: 'rgba(8, 32, 80, 0.35)' },
                { offset: 0.65, color: 'rgba(25, 85, 160, 0.5)' },
                { offset: 0.9, color: 'rgba(80, 160, 225, 0.65)' },
                { offset: 1.0, color: 'rgba(180, 225, 255, 0.8)' }
            ],
            composite: 'source-over'
        },
        {
            // Layer 2: Mid Icy Blue Flowing Mist
            speed: 0.85,
            baseOffset: -0.02,
            blur: 40,
            waves: [
                { wavelength: 0.0015, amplitude: 75, speed: -0.85, phase: 1.4 },
                { wavelength: 0.0028, amplitude: 40, speed: 1.1, phase: 0.5 },
                { wavelength: 0.0008, amplitude: 30, speed: -0.3, phase: 3.5 }
            ],
            stops: [
                { offset: 0.0, color: 'rgba(0, 0, 0, 0)' },
                { offset: 0.35, color: 'rgba(30, 95, 180, 0.35)' },
                { offset: 0.7, color: 'rgba(90, 175, 235, 0.55)' },
                { offset: 0.92, color: 'rgba(200, 235, 255, 0.75)' },
                { offset: 1.0, color: 'rgba(240, 250, 255, 0.85)' }
            ],
            composite: 'screen'
        },
        {
            // Layer 3: Soft Luminous Inner Light Stream
            speed: 1.1,
            baseOffset: 0.03,
            blur: 35,
            waves: [
                { wavelength: 0.0018, amplitude: 60, speed: 0.75, phase: 3.2 },
                { wavelength: 0.0009, amplitude: 40, speed: -0.9, phase: 1.1 },
                { wavelength: 0.0025, amplitude: 25, speed: 0.5, phase: 4.8 }
            ],
            stops: [
                { offset: 0.0, color: 'rgba(0, 0, 0, 0)' },
                { offset: 0.4, color: 'rgba(110, 190, 245, 0.45)' },
                { offset: 0.78, color: 'rgba(210, 240, 255, 0.75)' },
                { offset: 1.0, color: 'rgba(255, 255, 255, 0.9)' }
            ],
            composite: 'screen'
        }
    ],

    // Drifting luminous core glows near bottom
    coreGlows: [
        { xRatio: 0.25, speed: 0.35, radiusRatio: 0.45, color: 'rgba(180, 225, 255, 0.25)', blur: 60 },
        { xRatio: 0.55, speed: -0.25, radiusRatio: 0.5, color: 'rgba(235, 245, 255, 0.35)', blur: 70 },
        { xRatio: 0.82, speed: 0.4, radiusRatio: 0.4, color: 'rgba(140, 205, 255, 0.25)', blur: 60 }
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

        // Solid black background in upper space
        this.ctx.filter = 'none';
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, width, height);

        // Draw dynamic curved wave layers with heavy atmospheric blur
        AURORA_CONFIG.layers.forEach((layer) => {
            this.ctx.globalCompositeOperation = layer.composite || 'source-over';
            this.ctx.filter = `blur(${layer.blur || 40}px)`;

            const margin = 150;
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

            // Vertical linear gradient with smooth alpha fading
            const gradient = this.ctx.createLinearGradient(0, minY, 0, height);
            layer.stops.forEach((stop) => {
                gradient.addColorStop(stop.offset, stop.color);
            });

            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        });

        // Drifting core glows near bottom with blur
        AURORA_CONFIG.coreGlows.forEach((glow, idx) => {
            this.ctx.globalCompositeOperation = 'screen';
            this.ctx.filter = `blur(${glow.blur || 50}px)`;

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

        // Reset canvas context state
        this.ctx.filter = 'none';
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
