/**
 * Signal - Grid Channel
 *
 * Communication channel using 4×4 grid pattern (16 bits per frame).
 * Sender displays grid patterns, receiver uses camera to detect.
 * - Pilot: All white grid (800ms)
 * - End marker: Checkerboard pattern
 * - Frame duration: 400ms
 * - 16 bits per frame = 40 bps theoretical
 */

import type { ChannelConfig, IVisualizer, ReceiverState } from '../types/index.js';
import {
  CHANNEL_CONFIGS,
  GRID_FRAME_MS,
  GRID_PILOT_MS,
  GRID_GAP_MS,
  GRID_CHECKERBOARD_MS,
  GAP_THRESHOLD_MULTIPLIER,
} from '../constants/index.js';
import { VisualChannelBase } from './base-channel.js';
import {
  CameraManager,
  VideoAnalyzer,
  GridAnalyzer,
} from '../infrastructure/video-manager.js';
import {
  SignalOverlay,
  createCheckerboardPattern,
  createAllWhitePattern,
  createAllBlackPattern,
} from '../infrastructure/canvas-manager.js';
import { GridProtocol } from '../domain/protocol.js';

/**
 * Grid Visualizer
 *
 * Shows camera preview with grid overlay.
 */
class GridVisualizer implements IVisualizer {
  private analyzer: VideoAnalyzer | null = null;
  private lastBits: number[] = [];

  setAnalyzer(analyzer: VideoAnalyzer): void {
    this.analyzer = analyzer;
  }

  setBits(bits: number[]): void {
    this.lastBits = bits;
  }

  draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
    // Draw camera preview
    if (this.analyzer) {
      this.analyzer.drawToCanvas(canvas);
    } else {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw grid overlay
    const gridSize = Math.min(canvas.width, canvas.height) * 0.8;
    const offsetX = (canvas.width - gridSize) / 2;
    const offsetY = (canvas.height - gridSize) / 2;
    const cellSize = gridSize / 4;

    ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
    ctx.lineWidth = 2;

    // Draw grid lines
    for (let i = 0; i <= 4; i++) {
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(offsetX + i * cellSize, offsetY);
      ctx.lineTo(offsetX + i * cellSize, offsetY + gridSize);
      ctx.stroke();

      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + i * cellSize);
      ctx.lineTo(offsetX + gridSize, offsetY + i * cellSize);
      ctx.stroke();
    }

    // Draw detected bits
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const index = row * 4 + col;
        const bit = this.lastBits[index] ?? 0;
        const x = offsetX + col * cellSize + cellSize / 2;
        const y = offsetY + row * cellSize + cellSize / 2;

        ctx.fillStyle = bit ? '#4ECB71' : '#FF6B6B';
        ctx.fillText(bit.toString(), x, y);
      }
    }
  }

  getPreferredHeight(): 'collapsed' | 'open' | 'expanded' {
    return 'expanded';
  }
}

/**
 * Grid Channel
 *
 * Visual channel using 4×4 grid for parallel communication.
 * - Pilot: All white (800ms)
 * - Gap: All black (400ms)
 * - End marker: Checkerboard (500ms)
 * - Frame duration: 400ms
 * - 16 bits per frame = ~40 bps theoretical
 */
export class GridChannel extends VisualChannelBase {
  readonly config: ChannelConfig = CHANNEL_CONFIGS['grid'];

  private camera: CameraManager | null = null;
  private analyzer: VideoAnalyzer | null = null;
  private gridAnalyzer: GridAnalyzer | null = null;
  private overlay: SignalOverlay | null = null;

  private state: ReceiverState = 'idle';
  private frames: number[][] = [];
  private gapStartTime = 0;
  private lastFrameTime = 0;

  private readonly gridVisualizer: GridVisualizer;

  constructor() {
    super();
    this.gridVisualizer = new GridVisualizer();
    this.visualizer = this.gridVisualizer;
  }

  /**
   * Send a message via grid patterns
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
      // Encode message to frames
      const frames = GridProtocol.encode(message);

      // 1. Pilot signal (all white)
      this.overlay.setStatus('パイロット信号送信中...');
      this.overlay.drawGrid(createAllWhitePattern());
      await this.sleep(GRID_PILOT_MS);
      if (cancelled) return;

      // 2. Gap (all black)
      this.overlay.setStatus('ギャップ...');
      this.overlay.drawGrid(createAllBlackPattern());
      await this.sleep(GRID_GAP_MS);
      if (cancelled) return;

      // 3. Data frames
      for (let i = 0; i < frames.length; i++) {
        if (cancelled) return;

        const cells = GridProtocol.frameToCells(frames[i]);
        this.overlay.drawGrid(cells);
        this.overlay.setStatus(`送信中... ${i + 1}/${frames.length}`);
        await this.sleep(GRID_FRAME_MS);
      }

      // 4. End marker (checkerboard)
      this.overlay.setStatus('終了マーカー送信中...');
      this.overlay.drawGrid(createCheckerboardPattern());
      await this.sleep(GRID_CHECKERBOARD_MS);

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
   * Start receiving grid patterns
   */
  async startReceive(): Promise<void> {
    if (this._isReceiving) {
      return;
    }

    // Start camera
    this.camera = new CameraManager();
    await this.camera.start('environment'); // Use back camera

    // Create analyzers
    this.analyzer = new VideoAnalyzer(this.camera);
    this.gridAnalyzer = new GridAnalyzer();
    this.gridVisualizer.setAnalyzer(this.analyzer);

    // Start receiving
    this._isReceiving = true;
    this.state = 'idle';
    this.frames = [];
    this.notifyStatus({ state: 'idle' });

    this.startPolling(() => this.processFrame());
  }

  /**
   * Stop receiving
   */
  stopReceive(): void {
    super.stopReceive();

    this.state = 'idle';
    this.frames = [];

    if (this.camera) {
      this.camera.stop();
      this.camera = null;
    }
    this.analyzer = null;
    this.gridAnalyzer = null;
  }

  /**
   * Process a camera frame
   */
  private processFrame(): void {
    if (!this.analyzer || !this.gridAnalyzer) return;

    const imageData = this.analyzer.captureFrame();
    const bits = this.gridAnalyzer.analyzeGrid(imageData);

    this.gridVisualizer.setBits(bits);

    const now = performance.now();

    switch (this.state) {
      case 'idle':
        this.handleIdleState(imageData);
        break;

      case 'pilot':
        this.handlePilotState(imageData, now);
        break;

      case 'gap':
        this.handleGapState(now);
        break;

      case 'bits':
        this.handleBitsState(bits, now);
        break;
    }
  }

  private handleIdleState(imageData: ImageData): void {
    if (this.gridAnalyzer?.isAllWhite(imageData)) {
      this.state = 'pilot';
      this.notifyStatus({ state: 'pilot' });
    }
  }

  private handlePilotState(imageData: ImageData, now: number): void {
    if (!this.gridAnalyzer?.isAllWhite(imageData)) {
      this.state = 'gap';
      this.gapStartTime = now;
      this.notifyStatus({ state: 'gap' });
    }
  }

  private handleGapState(now: number): void {
    const elapsed = now - this.gapStartTime;
    if (elapsed >= GRID_GAP_MS * GAP_THRESHOLD_MULTIPLIER) {
      this.state = 'bits';
      this.frames = [];
      this.lastFrameTime = now;
      this.notifyStatus({ state: 'receiving', progress: 0 });
    }
  }

  private handleBitsState(bits: number[], now: number): void {
    const elapsed = now - this.lastFrameTime;

    if (elapsed >= GRID_FRAME_MS) {
      // Check for end marker (checkerboard)
      if (this.gridAnalyzer?.isCheckerboard(bits)) {
        this.tryDecode();
        return;
      }

      // Store frame
      const frame = GridProtocol.cellsToFrame(bits);
      this.frames.push(frame);
      this.lastFrameTime = now;

      // Update progress (estimate based on typical message size)
      const progress = Math.min(1, this.frames.length / 10);
      this.notifyStatus({ state: 'receiving', progress });

      // Safety limit
      if (this.frames.length > 200) {
        this.notifyStatus({ state: 'error', message: 'too many frames' });
        this.notifyError({ type: 'timeout', message: 'Too many frames received' });
        this.resetState();
      }
    }
  }

  private tryDecode(): void {
    const message = GridProtocol.decode(this.frames);

    if (message !== null) {
      this.notifyStatus({ state: 'success' });
      this.notifyMessage(message);
    } else {
      this.notifyStatus({ state: 'error', message: 'decode failed' });
      this.notifyError({ type: 'checksum', message: 'Checksum verification failed' });
    }

    this.resetState();
  }

  private resetState(): void {
    this.state = 'idle';
    this.frames = [];
    this.notifyStatus({ state: 'idle' });
  }
}
