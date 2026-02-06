/**
 * Signal - Color Channel
 *
 * Communication channel using screen colors (red/green).
 * Sender displays full-screen colors, receiver uses camera to detect.
 * - Pilot: Blue screen (700ms)
 * - Bit 0: Red screen
 * - Bit 1: Green screen
 * - Bit duration: 280ms
 */

import type { ChannelConfig, IVisualizer, ReceiverState } from '../types/index.js';
import {
  CHANNEL_CONFIGS,
  COLOR_BIT_MS,
  PILOT_MS,
  GAP_MS,
  COLOR_PILOT_COLOR,
  COLOR_BIT_0_COLOR,
  COLOR_BIT_1_COLOR,
  GAP_THRESHOLD_MULTIPLIER,
  MAX_BITS_TIMEOUT,
} from '../constants/index.js';
import { VisualChannelBase } from './base-channel.js';
import {
  CameraManager,
  VideoAnalyzer,
  getCenterRegion,
  calculateAverageRGB,
  detectBluePilot,
  detectColorBit,
} from '../infrastructure/video-manager.js';
import { SignalOverlay } from '../infrastructure/canvas-manager.js';
import { Protocol } from '../domain/protocol.js';

/**
 * Color Visualizer
 *
 * Shows camera preview with RGB indicator.
 */
class ColorVisualizer implements IVisualizer {
  private analyzer: VideoAnalyzer | null = null;
  private lastRGB = { r: 0, g: 0, b: 0 };

  setAnalyzer(analyzer: VideoAnalyzer): void {
    this.analyzer = analyzer;
  }

  setRGB(rgb: { r: number; g: number; b: number }): void {
    this.lastRGB = rgb;
  }

  draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
    // Draw camera preview
    if (this.analyzer) {
      this.analyzer.drawToCanvas(canvas);
    } else {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw RGB bars
    const barHeight = 8;
    const barWidth = (canvas.width - 20) / 3;
    const barY = canvas.height - barHeight - 5;

    // Red bar
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(5, barY, barWidth * (this.lastRGB.r / 255), barHeight);

    // Green bar
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(10 + barWidth, barY, barWidth * (this.lastRGB.g / 255), barHeight);

    // Blue bar
    ctx.fillStyle = '#0000FF';
    ctx.fillRect(15 + barWidth * 2, barY, barWidth * (this.lastRGB.b / 255), barHeight);

    // Detected state indicator
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';

    const isPilot = detectBluePilot(this.lastRGB);
    if (isPilot) {
      ctx.fillStyle = '#0088FF';
      ctx.fillText('PILOT', 5, barY - 5);
    } else {
      const bit = detectColorBit(this.lastRGB);
      ctx.fillStyle = bit === 1 ? '#00FF00' : '#FF0000';
      ctx.fillText(bit === 1 ? 'BIT:1' : 'BIT:0', 5, barY - 5);
    }
  }

  getPreferredHeight(): 'collapsed' | 'open' | 'expanded' {
    return 'expanded';
  }
}

/**
 * Color Channel
 *
 * Visual channel using screen colors for communication.
 * - Pilot: Blue screen (700ms)
 * - Gap: Black screen (300ms)
 * - Bit 0: Red, Bit 1: Green
 * - Bit duration: 280ms
 * - ~4 bps theoretical throughput
 */
export class ColorChannel extends VisualChannelBase {
  readonly config: ChannelConfig = CHANNEL_CONFIGS['color'];

  private camera: CameraManager | null = null;
  private analyzer: VideoAnalyzer | null = null;
  private overlay: SignalOverlay | null = null;

  private state: ReceiverState = 'idle';
  private bits: number[] = [];
  private gapStartTime = 0;
  private lastBitTime = 0;

  private readonly colorVisualizer: ColorVisualizer;
  private debugFrameCount = 0;

  constructor() {
    super();
    this.colorVisualizer = new ColorVisualizer();
    this.visualizer = this.colorVisualizer;
  }

  /**
   * Send a message via screen colors
   */
  async send(message: string): Promise<void> {
    if (this._isSending) {
      throw new Error('Already sending');
    }

    this._isSending = true;

    // Create overlay
    this.overlay = new SignalOverlay();

    let cancelled = false;
    this.overlay.show(() => {
      cancelled = true;
    });

    try {
      // Encode message to bits
      const bits = Protocol.encode(message);

      // 1. Pilot signal (blue)
      this.overlay.setStatus('パイロット信号送信中...');
      this.overlay.fillColor(COLOR_PILOT_COLOR);
      await this.sleep(PILOT_MS);
      if (cancelled) return;

      // 2. Gap (black)
      this.overlay.setStatus('ギャップ...');
      this.overlay.fillColor('#000000');
      await this.sleep(GAP_MS);
      if (cancelled) return;

      // 3. Data bits
      for (let i = 0; i < bits.length; i++) {
        if (cancelled) return;

        const color = bits[i] === 1 ? COLOR_BIT_1_COLOR : COLOR_BIT_0_COLOR;
        this.overlay.fillColor(color);
        this.overlay.setStatus(`送信中... ${i + 1}/${bits.length}`);
        await this.sleep(COLOR_BIT_MS);
      }

      this.overlay.setStatus('送信完了');
      await this.sleep(500);
    } finally {
      this._isSending = false;
      if (this.overlay) {
        this.overlay.hide();
        this.overlay.destroy();
        this.overlay = null;
      }
    }
  }

  /**
   * Start receiving color signals
   */
  async startReceive(): Promise<void> {
    if (this._isReceiving) {
      return;
    }

    // Start camera
    this.camera = new CameraManager();
    await this.camera.start('environment'); // Use back camera

    // Create analyzer
    this.analyzer = new VideoAnalyzer(this.camera);
    this.colorVisualizer.setAnalyzer(this.analyzer);

    // Start receiving
    this._isReceiving = true;
    this.state = 'idle';
    this.bits = [];
    this.notifyStatus({ state: 'idle' });

    this.startPolling(() => this.processFrame());
  }

  /**
   * Stop receiving
   */
  stopReceive(): void {
    super.stopReceive();

    this.state = 'idle';
    this.bits = [];

    if (this.camera) {
      this.camera.stop();
      this.camera = null;
    }
    this.analyzer = null;
  }

  /**
   * Process a camera frame
   */
  private processFrame(): void {
    if (!this.analyzer) return;

    const imageData = this.analyzer.captureFrame();
    const region = getCenterRegion(imageData.width, imageData.height);
    const rgb = calculateAverageRGB(imageData, region);

    this.colorVisualizer.setRGB(rgb);

    // Diagnostic logging for iOS debugging
    this.debugFrameCount++;
    if (this.debugFrameCount % 60 === 1 || this.state !== 'idle') {
      const isPilot = detectBluePilot(rgb);
      console.log(
        `[color] state=${this.state} r=${rgb.r.toFixed(1)} g=${rgb.g.toFixed(1)} b=${rgb.b.toFixed(1)} ` +
        `isPilot=${isPilot}`
      );
    }

    const now = performance.now();

    switch (this.state) {
      case 'idle':
        this.handleIdleState(rgb);
        break;

      case 'pilot':
        this.handlePilotState(rgb, now);
        break;

      case 'gap':
        this.handleGapState(now);
        break;

      case 'bits':
        this.handleBitsState(rgb, now);
        break;
    }
  }

  private handleIdleState(rgb: { r: number; g: number; b: number }): void {
    if (detectBluePilot(rgb)) {
      this.state = 'pilot';
      this.notifyStatus({ state: 'pilot' });
    }
  }

  private handlePilotState(rgb: { r: number; g: number; b: number }, now: number): void {
    if (!detectBluePilot(rgb)) {
      this.state = 'gap';
      this.gapStartTime = now;
      this.notifyStatus({ state: 'gap' });
    }
  }

  private handleGapState(now: number): void {
    const elapsed = now - this.gapStartTime;
    if (elapsed >= GAP_MS * GAP_THRESHOLD_MULTIPLIER) {
      this.state = 'bits';
      this.bits = [];
      this.lastBitTime = now;
      this.notifyStatus({ state: 'receiving', progress: 0 });
    }
  }

  private handleBitsState(rgb: { r: number; g: number; b: number }, now: number): void {
    const elapsed = now - this.lastBitTime;

    if (elapsed >= COLOR_BIT_MS) {
      const bit = detectColorBit(rgb);
      this.bits.push(bit);
      this.lastBitTime = now;

      // Update progress with partial decode
      const minBits = 24 + 8;
      const progress = Math.min(1, this.bits.length / minBits);
      let partialText: string | undefined;
      if (this.bits.length >= 32) {
        const partial = Protocol.decodePartial(this.bits);
        if (partial?.text) {
          partialText = partial.text;
        }
      }
      this.notifyStatus({ state: 'receiving', progress, partialText });

      // Try to decode
      if (this.bits.length >= 24) {
        const message = Protocol.decode(this.bits);
        if (message !== null) {
          this.notifyStatus({ state: 'success' });
          this.notifyMessage(message);
          this.resetState();
          return;
        }
      }

      // Timeout check
      if (this.bits.length > MAX_BITS_TIMEOUT) {
        this.notifyStatus({ state: 'error', message: 'timeout' });
        this.notifyError({ type: 'timeout', message: 'Receive timeout' });
        this.resetState();
      }
    }
  }

  private resetState(): void {
    this.state = 'idle';
    this.bits = [];
    this.notifyStatus({ state: 'idle' });
  }
}
