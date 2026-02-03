/**
 * Signal - Canvas Manager
 *
 * Handles canvas operations for visual signal transmission.
 * - Full-screen overlay rendering
 * - Grid pattern drawing
 * - QR code display
 * - Visualization helpers
 */

import {
  GRID_ROWS,
  GRID_COLS,
  QR_SIZE_RATIO,
} from '../constants/index.js';

/**
 * Signal Overlay
 *
 * Manages full-screen overlay for visual channel transmission.
 */
export class SignalOverlay {
  private overlay: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private statusElement: HTMLDivElement;
  private cancelButton: HTMLButtonElement;
  private onCancel: (() => void) | null = null;

  constructor() {
    // Create overlay container
    this.overlay = document.createElement('div');
    this.overlay.className = 'signal-overlay hidden';
    this.overlay.innerHTML = `
      <canvas class="signal-overlay-canvas"></canvas>
      <button class="signal-overlay-cancel">キャンセル</button>
      <div class="signal-overlay-status"></div>
    `;

    this.canvas = this.overlay.querySelector('.signal-overlay-canvas')!;
    this.ctx = this.canvas.getContext('2d')!;
    this.statusElement = this.overlay.querySelector('.signal-overlay-status')!;
    this.cancelButton = this.overlay.querySelector('.signal-overlay-cancel')!;

    this.cancelButton.addEventListener('click', () => {
      if (this.onCancel) {
        this.onCancel();
      }
    });

    // Handle resize
    window.addEventListener('resize', () => this.handleResize());

    // Append to body
    document.body.appendChild(this.overlay);
  }

  /**
   * Show overlay
   */
  show(onCancel?: () => void): void {
    this.onCancel = onCancel || null;
    this.handleResize();
    this.overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  /**
   * Hide overlay
   */
  hide(): void {
    this.overlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  /**
   * Check if visible
   */
  isVisible(): boolean {
    return !this.overlay.classList.contains('hidden');
  }

  /**
   * Set status text
   */
  setStatus(message: string): void {
    this.statusElement.textContent = message;
  }

  /**
   * Fill with solid color
   */
  fillColor(color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw 4×4 grid pattern
   * @param bits Array of 16 bits (0 = black, 1 = white)
   */
  drawGrid(bits: number[]): void {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const cellWidth = width / GRID_COLS;
    const cellHeight = height / GRID_ROWS;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const index = row * GRID_COLS + col;
        this.ctx.fillStyle = bits[index] ? '#FFFFFF' : '#000000';
        this.ctx.fillRect(
          Math.floor(col * cellWidth),
          Math.floor(row * cellHeight),
          Math.ceil(cellWidth),
          Math.ceil(cellHeight)
        );
      }
    }
  }

  /**
   * Draw QR code
   * @param modules 2D array of QR modules (true = black)
   * @param moduleCount Size of QR code
   */
  drawQR(modules: boolean[][], moduleCount: number): void {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const minDim = Math.min(width, height);
    const qrSize = minDim * QR_SIZE_RATIO;
    const moduleSize = qrSize / moduleCount;
    const offsetX = (width - qrSize) / 2;
    const offsetY = (height - qrSize) / 2;

    // White background
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(offsetX, offsetY, qrSize, qrSize);

    // Black modules
    this.ctx.fillStyle = '#000000';
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (modules[row][col]) {
          this.ctx.fillRect(
            offsetX + col * moduleSize,
            offsetY + row * moduleSize,
            moduleSize,
            moduleSize
          );
        }
      }
    }
  }

  /**
   * Get canvas for custom drawing
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Get context for custom drawing
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   * Handle window resize
   */
  private handleResize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.ctx.scale(dpr, dpr);
  }

  /**
   * Destroy overlay (remove from DOM)
   */
  destroy(): void {
    this.overlay.remove();
  }
}

/**
 * Spectrum Visualizer
 *
 * Draws FFT spectrum for audio channel visualization.
 */
export class SpectrumVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private highlightFrequencies: { freq: number; color: string }[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  /**
   * Set frequencies to highlight
   */
  setHighlightFrequencies(frequencies: { freq: number; color: string }[]): void {
    this.highlightFrequencies = frequencies;
  }

  /**
   * Draw spectrum
   * @param frequencyData FFT data (Float32Array)
   * @param sampleRate Audio sample rate
   * @param fftSize FFT size
   * @param minFreq Minimum frequency to display
   * @param maxFreq Maximum frequency to display
   */
  draw(
    frequencyData: Float32Array,
    sampleRate: number,
    fftSize: number,
    minFreq: number = 0,
    maxFreq: number = 22000
  ): void {
    const { width, height } = this.canvas;
    const binCount = frequencyData.length;
    const freqResolution = sampleRate / fftSize;

    // Clear
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, width, height);

    // Calculate bin range
    const minBin = Math.floor(minFreq / freqResolution);
    const maxBin = Math.min(Math.ceil(maxFreq / freqResolution), binCount);
    const binRange = maxBin - minBin;

    // Draw bars
    const barWidth = width / binRange;
    const minDb = -100;
    const maxDb = -30;
    const dbRange = maxDb - minDb;

    for (let i = minBin; i < maxBin; i++) {
      const db = frequencyData[i];
      const normalizedDb = Math.max(0, Math.min(1, (db - minDb) / dbRange));
      const barHeight = normalizedDb * height;

      const x = (i - minBin) * barWidth;
      const y = height - barHeight;

      // Check if this frequency should be highlighted
      const freq = i * freqResolution;
      let color = '#4361ee';

      for (const highlight of this.highlightFrequencies) {
        if (Math.abs(freq - highlight.freq) < freqResolution * 2) {
          color = highlight.color;
          break;
        }
      }

      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
    }

    // Draw frequency labels
    this.ctx.fillStyle = '#8d99ae';
    this.ctx.font = '10px sans-serif';
    this.ctx.textAlign = 'center';

    const labelFreqs = [1000, 5000, 10000, 15000, 20000].filter(
      (f) => f >= minFreq && f <= maxFreq
    );
    for (const freq of labelFreqs) {
      const x = ((freq - minFreq) / (maxFreq - minFreq)) * width;
      this.ctx.fillText(`${freq / 1000}k`, x, height - 2);
    }
  }
}

/**
 * Wave Animation
 *
 * Draws wave animation for transmission visualization.
 */
export class WaveAnimation {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private phase: number = 0;
  private animationId: number | null = null;
  private frequency: number = 1;
  private color: string = '#FDD94B';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  /**
   * Set wave parameters
   */
  setParams(frequency: number, color: string): void {
    this.frequency = frequency;
    this.color = color;
  }

  /**
   * Start animation
   */
  start(): void {
    if (this.animationId !== null) return;

    const animate = () => {
      this.draw();
      this.phase += 0.1;
      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  }

  /**
   * Stop animation
   */
  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Draw wave
   */
  private draw(): void {
    const { width, height } = this.canvas;
    const centerY = height / 2;

    // Clear
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, width, height);

    // Draw wave
    this.ctx.strokeStyle = this.color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();

    for (let x = 0; x < width; x++) {
      const y = centerY + Math.sin((x * this.frequency * 0.02) + this.phase) * (height * 0.3);
      if (x === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }

    this.ctx.stroke();
  }
}

/**
 * Progress Bar
 *
 * Draws progress indicator.
 */
export class ProgressBar {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  /**
   * Draw progress bar
   * @param progress Value between 0 and 1
   * @param color Bar color
   * @param bgColor Background color
   */
  draw(progress: number, color: string = '#FDD94B', bgColor: string = '#1f3460'): void {
    const { width, height } = this.canvas;

    // Background
    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, width, height);

    // Progress
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, width * Math.min(1, Math.max(0, progress)), height);
  }
}

/**
 * Create checkerboard pattern for grid channel end marker
 */
export function createCheckerboardPattern(): number[] {
  const bits: number[] = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      bits.push((row + col) % 2);
    }
  }
  return bits;
}

/**
 * Create all-white pattern for grid channel pilot
 */
export function createAllWhitePattern(): number[] {
  return new Array(GRID_ROWS * GRID_COLS).fill(1);
}

/**
 * Create all-black pattern for grid channel gap
 */
export function createAllBlackPattern(): number[] {
  return new Array(GRID_ROWS * GRID_COLS).fill(0);
}
