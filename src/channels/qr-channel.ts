/**
 * Signal - QR Channel
 *
 * Communication channel using QR codes for burst transmission.
 * Sender displays QR code, receiver scans with camera.
 * - Single QR code contains entire message
 * - ~3 second display time
 * - Burst mode (not streaming)
 */

import type { ChannelConfig, IVisualizer } from '../types/index.js';
import {
  CHANNEL_CONFIGS,
  QR_DISPLAY_MS,
  QR_ERROR_CORRECTION,
} from '../constants/index.js';
import { VisualChannelBase } from './base-channel.js';
import {
  CameraManager,
  VideoAnalyzer,
} from '../infrastructure/video-manager.js';
import { SignalOverlay } from '../infrastructure/canvas-manager.js';
import { logger } from '../utils/index.js';

// QR library types (will be loaded dynamically)
declare function qrcode(typeNumber: number, errorCorrection: string): {
  addData(data: string): void;
  make(): void;
  getModuleCount(): number;
  isDark(row: number, col: number): boolean;
};

declare function jsQR(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options?: { inversionAttempts?: string }
): { data: string } | null;

/**
 * QR Visualizer
 *
 * Shows camera preview with QR detection indicator.
 */
class QRVisualizer implements IVisualizer {
  private analyzer: VideoAnalyzer | null = null;
  private lastDetected = false;

  setAnalyzer(analyzer: VideoAnalyzer): void {
    this.analyzer = analyzer;
  }

  setDetected(detected: boolean): void {
    this.lastDetected = detected;
  }

  draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
    // Draw camera preview
    if (this.analyzer) {
      this.analyzer.drawToCanvas(canvas);
    } else {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw scanning frame
    const frameSize = Math.min(canvas.width, canvas.height) * 0.7;
    const frameX = (canvas.width - frameSize) / 2;
    const frameY = (canvas.height - frameSize) / 2;
    const cornerLength = frameSize * 0.15;

    ctx.strokeStyle = this.lastDetected ? '#4ECB71' : '#FFD700';
    ctx.lineWidth = 3;

    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(frameX, frameY + cornerLength);
    ctx.lineTo(frameX, frameY);
    ctx.lineTo(frameX + cornerLength, frameY);
    ctx.stroke();

    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(frameX + frameSize - cornerLength, frameY);
    ctx.lineTo(frameX + frameSize, frameY);
    ctx.lineTo(frameX + frameSize, frameY + cornerLength);
    ctx.stroke();

    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(frameX, frameY + frameSize - cornerLength);
    ctx.lineTo(frameX, frameY + frameSize);
    ctx.lineTo(frameX + cornerLength, frameY + frameSize);
    ctx.stroke();

    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(frameX + frameSize - cornerLength, frameY + frameSize);
    ctx.lineTo(frameX + frameSize, frameY + frameSize);
    ctx.lineTo(frameX + frameSize, frameY + frameSize - cornerLength);
    ctx.stroke();

    // Status text
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = this.lastDetected ? '#4ECB71' : '#FFFFFF';
    ctx.fillText(
      this.lastDetected ? 'QRコード検出!' : 'QRコードをフレーム内に',
      canvas.width / 2,
      frameY + frameSize + 25
    );
  }

  getPreferredHeight(): 'collapsed' | 'open' | 'expanded' {
    return 'expanded';
  }
}

/**
 * QR Channel
 *
 * Visual channel using QR codes for burst communication.
 * - Full message in single QR code
 * - Display time: 3 seconds
 * - Uses qrcode-generator for encoding
 * - Uses jsQR for decoding
 */
export class QRChannel extends VisualChannelBase {
  readonly config: ChannelConfig = CHANNEL_CONFIGS['qr'];

  private camera: CameraManager | null = null;
  private analyzer: VideoAnalyzer | null = null;
  private overlay: SignalOverlay | null = null;
  private scanIntervalId: number | null = null;

  private readonly qrVisualizer: QRVisualizer;

  constructor() {
    super();
    this.qrVisualizer = new QRVisualizer();
    this.visualizer = this.qrVisualizer;
  }

  /**
   * Send a message via QR code
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
      // Generate QR code
      this.overlay.setStatus('QRコード生成中...');
      this.overlay.fillColor('#FFFFFF');

      const qr = this.generateQR(message);
      if (!qr) {
        throw new Error('Failed to generate QR code');
      }

      // Draw QR code
      const modules: boolean[][] = [];
      const moduleCount = qr.getModuleCount();
      for (let row = 0; row < moduleCount; row++) {
        modules[row] = [];
        for (let col = 0; col < moduleCount; col++) {
          modules[row][col] = qr.isDark(row, col);
        }
      }

      this.overlay.drawQR(modules, moduleCount);
      this.overlay.setStatus('QRコードを読み取ってください');

      // Wait for display time
      await this.sleep(QR_DISPLAY_MS);
      if (cancelled) return;

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
   * Start receiving QR codes
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
    this.qrVisualizer.setAnalyzer(this.analyzer);

    // Start receiving
    this._isReceiving = true;
    this.notifyStatus({ state: 'idle' });

    this.startPolling(() => this.processFrame());
  }

  /**
   * Stop receiving
   */
  stopReceive(): void {
    super.stopReceive();

    if (this.scanIntervalId !== null) {
      clearInterval(this.scanIntervalId);
      this.scanIntervalId = null;
    }

    if (this.camera) {
      this.camera.stop();
      this.camera = null;
    }
    this.analyzer = null;
  }

  /**
   * Process a camera frame for QR detection
   */
  private processFrame(): void {
    if (!this.analyzer) return;

    const imageData = this.analyzer.captureFrame();
    const result = this.scanQR(imageData);

    if (result) {
      this.qrVisualizer.setDetected(true);
      this.notifyStatus({ state: 'success' });
      this.notifyMessage(result);

      // Brief pause before resuming
      this._isReceiving = false;
      setTimeout(() => {
        if (this.camera) {
          this._isReceiving = true;
          this.qrVisualizer.setDetected(false);
          this.notifyStatus({ state: 'idle' });
          this.startPolling(() => this.processFrame());
        }
      }, 1000);
    } else {
      this.qrVisualizer.setDetected(false);
    }
  }

  /**
   * Generate QR code from message
   */
  private generateQR(message: string): ReturnType<typeof qrcode> | null {
    // Check if qrcode library is available
    if (typeof qrcode !== 'function') {
      logger.error('qrcode-generator library not loaded');
      return null;
    }

    try {
      // Auto-detect type number (0 = auto)
      const qr = qrcode(0, QR_ERROR_CORRECTION);
      qr.addData(message);
      qr.make();
      return qr;
    } catch (error) {
      logger.error('QR generation error:', error);
      return null;
    }
  }

  /**
   * Scan QR code from image data
   */
  private scanQR(imageData: ImageData): string | null {
    // Check if jsQR library is available
    if (typeof jsQR !== 'function') {
      logger.error('jsQR library not loaded');
      return null;
    }

    try {
      const result = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      return result?.data ?? null;
    } catch (error) {
      logger.error('QR scan error:', error);
      return null;
    }
  }
}
