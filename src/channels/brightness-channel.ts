/**
 * Signal - Brightness Channel
 *
 * Communication channel using screen brightness (black/white).
 * Sender displays full-screen colors, receiver uses camera to detect.
 * - Pilot: White screen (700ms)
 * - Bit 0: Black screen
 * - Bit 1: White screen
 * - Bit duration: 250ms
 */

import type { ChannelConfig, IVisualizer, ReceiverState } from '../types/index.js';
import {
  CHANNEL_CONFIGS,
  BRIGHTNESS_BIT_MS,
  PILOT_MS,
  GAP_MS,
  BRIGHTNESS_PILOT_COLOR,
  BRIGHTNESS_BIT_0_COLOR,
  BRIGHTNESS_BIT_1_COLOR,
  GAP_THRESHOLD_MULTIPLIER,
  MAX_BITS_TIMEOUT,
} from '../constants/index.js';
import { VisualChannelBase } from './base-channel.js';
import {
  CameraManager,
  VideoAnalyzer,
  CalibrationManager,
  getCenterRegion,
  calculateLuminance,
} from '../infrastructure/video-manager.js';
import { SignalOverlay } from '../infrastructure/canvas-manager.js';
import { Protocol } from '../domain/protocol.js';

/**
 * Brightness Visualizer
 *
 * Shows camera preview with luminance indicator.
 */
class BrightnessVisualizer implements IVisualizer {
  private analyzer: VideoAnalyzer | null = null;
  private calibration: CalibrationManager | null = null;
  private lastLuminance = 0;

  setAnalyzer(analyzer: VideoAnalyzer): void {
    this.analyzer = analyzer;
  }

  setCalibration(calibration: CalibrationManager): void {
    this.calibration = calibration;
  }

  setLuminance(luminance: number): void {
    this.lastLuminance = luminance;
  }

  draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
    // Draw camera preview
    if (this.analyzer) {
      this.analyzer.drawToCanvas(canvas);
    } else {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw luminance bar
    const barHeight = 10;
    const barY = canvas.height - barHeight - 5;

    // Background
    ctx.fillStyle = '#333';
    ctx.fillRect(5, barY, canvas.width - 10, barHeight);

    // Luminance level
    const luminanceRatio = Math.min(1, this.lastLuminance / 255);
    ctx.fillStyle = luminanceRatio > 0.5 ? '#4ECB71' : '#FF6B6B';
    ctx.fillRect(5, barY, (canvas.width - 10) * luminanceRatio, barHeight);

    // Threshold marker
    if (this.calibration?.getIsCalibrated()) {
      const values = this.calibration.getValues();
      const thresholdX = 5 + (canvas.width - 10) * (values.brightnessThreshold / 255);
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(thresholdX, barY);
      ctx.lineTo(thresholdX, barY + barHeight);
      ctx.stroke();
    }
  }

  getPreferredHeight(): 'collapsed' | 'open' | 'expanded' {
    return 'expanded';
  }
}

/**
 * Brightness Channel
 *
 * Visual channel using screen brightness for communication.
 * - Pilot: White screen (700ms)
 * - Gap: Black screen (300ms)
 * - Bit 0: Black, Bit 1: White
 * - Bit duration: 250ms
 * - ~4 bps theoretical throughput
 */
export class BrightnessChannel extends VisualChannelBase {
  readonly config: ChannelConfig = CHANNEL_CONFIGS['brightness'];

  private camera: CameraManager | null = null;
  private analyzer: VideoAnalyzer | null = null;
  private calibration: CalibrationManager | null = null;
  private overlay: SignalOverlay | null = null;

  private state: ReceiverState = 'idle';
  private bits: number[] = [];
  private gapStartTime = 0;
  private lastBitTime = 0;

  private readonly brightnessVisualizer: BrightnessVisualizer;

  constructor() {
    super();
    this.brightnessVisualizer = new BrightnessVisualizer();
    this.visualizer = this.brightnessVisualizer;
  }

  /**
   * Send a message via screen brightness
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

      // 1. Pilot signal (white)
      this.overlay.setStatus('パイロット信号送信中...');
      this.overlay.fillColor(BRIGHTNESS_PILOT_COLOR);
      await this.sleep(PILOT_MS);
      if (cancelled) return;

      // 2. Gap (black)
      this.overlay.setStatus('ギャップ...');
      this.overlay.fillColor(BRIGHTNESS_BIT_0_COLOR);
      await this.sleep(GAP_MS);
      if (cancelled) return;

      // 3. Data bits
      for (let i = 0; i < bits.length; i++) {
        if (cancelled) return;

        const color = bits[i] === 1 ? BRIGHTNESS_BIT_1_COLOR : BRIGHTNESS_BIT_0_COLOR;
        this.overlay.fillColor(color);
        this.overlay.setStatus(`送信中... ${i + 1}/${bits.length}`);
        await this.sleep(BRIGHTNESS_BIT_MS);
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
   * Start receiving brightness signals
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
    this.brightnessVisualizer.setAnalyzer(this.analyzer);

    // Calibrate
    this.calibration = new CalibrationManager();
    await this.calibration.calibrate(this.analyzer);
    this.brightnessVisualizer.setCalibration(this.calibration);

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
    this.calibration = null;
  }

  /**
   * Process a camera frame
   */
  private processFrame(): void {
    if (!this.analyzer || !this.calibration) return;

    const imageData = this.analyzer.captureFrame();
    const region = getCenterRegion(imageData.width, imageData.height);
    const result = calculateLuminance(imageData, region);
    const luminance = result.average;

    this.brightnessVisualizer.setLuminance(luminance);

    const now = performance.now();

    switch (this.state) {
      case 'idle':
        this.handleIdleState(luminance);
        break;

      case 'pilot':
        this.handlePilotState(luminance, now);
        break;

      case 'gap':
        this.handleGapState(now);
        break;

      case 'bits':
        this.handleBitsState(luminance, now);
        break;
    }
  }

  private handleIdleState(luminance: number): void {
    if (this.calibration?.isPilot(luminance)) {
      this.state = 'pilot';
      this.notifyStatus({ state: 'pilot' });
    }
  }

  private handlePilotState(luminance: number, now: number): void {
    if (!this.calibration?.isPilot(luminance)) {
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

  private handleBitsState(luminance: number, now: number): void {
    const elapsed = now - this.lastBitTime;

    if (elapsed >= BRIGHTNESS_BIT_MS) {
      const bit = this.calibration?.isBright(luminance) ? 1 : 0;
      this.bits.push(bit);
      this.lastBitTime = now;

      // Update progress
      const minBits = 24 + 8;
      const progress = Math.min(1, this.bits.length / minBits);
      this.notifyStatus({ state: 'receiving', progress });

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
