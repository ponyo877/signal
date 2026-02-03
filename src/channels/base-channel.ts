/**
 * Signal - Base Channel
 *
 * Abstract base class for all communication channels.
 * Provides common functionality and enforces the IChannel interface.
 */

import type {
  IChannel,
  IVisualizer,
  ChannelConfig,
  ReceiverCallbacks,
  ReceiverStatus,
} from '../types/index.js';

/**
 * Base Visualizer
 *
 * Default visualizer that draws nothing (for channels without visualization).
 */
export class BaseVisualizer implements IVisualizer {
  draw(_canvas: HTMLCanvasElement, _ctx: CanvasRenderingContext2D): void {
    // Default: clear canvas
  }

  getPreferredHeight(): 'collapsed' | 'open' | 'expanded' {
    return 'collapsed';
  }
}

/**
 * Abstract Base Channel
 *
 * Provides common functionality for all channels:
 * - State management (sending/receiving)
 * - Callback handling
 * - Lifecycle management
 */
export abstract class BaseChannel implements IChannel {
  abstract readonly config: ChannelConfig;

  protected _isSending = false;
  protected _isReceiving = false;
  protected callbacks: ReceiverCallbacks | null = null;
  protected visualizer: IVisualizer;

  constructor() {
    this.visualizer = new BaseVisualizer();
  }

  /**
   * Set receiver callbacks
   */
  setCallbacks(callbacks: ReceiverCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Send a message
   */
  abstract send(message: string): Promise<void>;

  /**
   * Start receiving
   */
  abstract startReceive(): Promise<void>;

  /**
   * Stop receiving
   */
  abstract stopReceive(): void;

  /**
   * Get visualizer for signal panel
   */
  getVisualizer(): IVisualizer {
    return this.visualizer;
  }

  /**
   * Check if currently receiving
   */
  isReceiving(): boolean {
    return this._isReceiving;
  }

  /**
   * Check if currently sending
   */
  isSending(): boolean {
    return this._isSending;
  }

  /**
   * Notify message received
   */
  protected notifyMessage(message: string): void {
    if (this.callbacks) {
      this.callbacks.onMessage(message);
    }
  }

  /**
   * Notify error
   */
  protected notifyError(error: { type: 'checksum' | 'timeout' | 'permission' | 'decode'; message: string }): void {
    if (this.callbacks) {
      this.callbacks.onError(error);
    }
  }

  /**
   * Notify status change
   */
  protected notifyStatus(status: ReceiverStatus): void {
    if (this.callbacks) {
      this.callbacks.onStatusChange(status);
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Audio Channel Base
 *
 * Base class for audio-based channels (ultrasonic, audible).
 * Provides common audio infrastructure.
 */
export abstract class AudioChannelBase extends BaseChannel {
  protected animationFrameId: number | null = null;

  /**
   * Stop receiving and cleanup
   */
  stopReceive(): void {
    this._isReceiving = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Start polling loop
   */
  protected startPolling(callback: () => void): void {
    const poll = () => {
      if (!this._isReceiving) return;
      callback();
      this.animationFrameId = requestAnimationFrame(poll);
    };
    poll();
  }
}

/**
 * Visual Channel Base
 *
 * Base class for visual-based channels (brightness, color, grid, qr).
 * Provides common visual infrastructure.
 */
export abstract class VisualChannelBase extends BaseChannel {
  protected animationFrameId: number | null = null;

  /**
   * Stop receiving and cleanup
   */
  stopReceive(): void {
    this._isReceiving = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Start polling loop
   */
  protected startPolling(callback: () => void): void {
    const poll = () => {
      if (!this._isReceiving) return;
      callback();
      this.animationFrameId = requestAnimationFrame(poll);
    };
    poll();
  }
}
