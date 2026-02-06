/**
 * Signal - Bit Receiver State Machine
 *
 * State transitions:
 *   idle → pilot → gap → bits → idle
 *
 * Uses requestAnimationFrame for polling and performance.now() for timing.
 */

import type { ReceiverState, ReceiverCallbacks, ReceiverStatus } from '../types/index.js';
import { GAP_MS, GAP_THRESHOLD_MULTIPLIER, MAX_BITS_TIMEOUT } from '../constants/index.js';
import { Protocol } from './protocol.js';

/** Minimum bits before attempting partial decode (preamble + marker + length + 1 byte) */
const PARTIAL_DECODE_MIN_BITS = 32;

/** Bit detector function type */
export type DetectPilotFn = () => boolean;
export type DetectBitFn = () => 0 | 1 | null;

/** BitReceiver configuration */
export interface BitReceiverConfig {
  bitMs: number;
  guardMs: number;
  gapMs?: number;
  detectPilot: DetectPilotFn;
  detectBit: DetectBitFn;
  callbacks: ReceiverCallbacks;
}

/**
 * Bit Receiver State Machine
 *
 * Handles the reception of bit-level signals from audio or visual channels.
 */
export class BitReceiver {
  private state: ReceiverState = 'idle';
  private bits: number[] = [];
  private gapStartTime: number = 0;
  private lastBitTime: number = 0;
  private animationFrameId: number | null = null;
  private running: boolean = false;

  private readonly config: BitReceiverConfig;
  private readonly gapMs: number;
  private readonly bitInterval: number;

  constructor(config: BitReceiverConfig) {
    this.config = config;
    this.gapMs = config.gapMs ?? GAP_MS;
    this.bitInterval = config.bitMs + config.guardMs;
  }

  /**
   * Start receiving
   */
  start(): void {
    if (this.running) return;

    this.running = true;
    this.reset();
    this.notifyStatus({ state: 'idle' });
    this.poll();
  }

  /**
   * Stop receiving
   */
  stop(): void {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.reset();
  }

  /**
   * Get current state
   */
  getState(): ReceiverState {
    return this.state;
  }

  /**
   * Get collected bits
   */
  getBits(): number[] {
    return [...this.bits];
  }

  /**
   * Check if running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Reset state machine
   */
  private reset(): void {
    this.state = 'idle';
    this.bits = [];
    this.gapStartTime = 0;
    this.lastBitTime = 0;
  }

  /**
   * Main polling loop using requestAnimationFrame
   */
  private poll(): void {
    if (!this.running) return;

    this.processFrame();

    this.animationFrameId = requestAnimationFrame(() => this.poll());
  }

  /**
   * Process a single frame
   */
  private processFrame(): void {
    const now = performance.now();

    switch (this.state) {
      case 'idle':
        this.handleIdleState();
        break;

      case 'pilot':
        this.handlePilotState(now);
        break;

      case 'gap':
        this.handleGapState(now);
        break;

      case 'bits':
        this.handleBitsState(now);
        break;
    }
  }

  /**
   * Handle idle state - waiting for pilot signal
   */
  private handleIdleState(): void {
    if (this.config.detectPilot()) {
      this.state = 'pilot';
      this.notifyStatus({ state: 'pilot' });
    }
  }

  /**
   * Handle pilot state - waiting for pilot to end
   */
  private handlePilotState(now: number): void {
    if (!this.config.detectPilot()) {
      this.state = 'gap';
      this.gapStartTime = now;
      this.notifyStatus({ state: 'gap' });
    }
  }

  /**
   * Handle gap state - waiting for gap duration
   */
  private handleGapState(now: number): void {
    const elapsed = now - this.gapStartTime;

    if (elapsed >= this.gapMs * GAP_THRESHOLD_MULTIPLIER) {
      this.state = 'bits';
      this.bits = [];
      this.lastBitTime = now;
      this.notifyStatus({ state: 'receiving', progress: 0 });
    }
  }

  /**
   * Handle bits state - receiving and collecting bits
   */
  private handleBitsState(now: number): void {
    const elapsed = now - this.lastBitTime;

    if (elapsed >= this.bitInterval) {
      const bit = this.config.detectBit();

      if (bit !== null) {
        this.bits.push(bit);
        this.lastBitTime = now;

        // Update progress with partial decode
        const minBits = 24 + 8; // preamble + marker + at least 1 byte + checksum
        const progress = Math.min(1, this.bits.length / minBits);
        let partialText: string | undefined;
        if (this.bits.length >= PARTIAL_DECODE_MIN_BITS) {
          const partial = Protocol.decodePartial(this.bits);
          if (partial && partial.text) {
            partialText = partial.text;
          }
        }
        this.notifyStatus({ state: 'receiving', progress, partialText });

        // Try to decode after we have enough bits for the header
        if (this.bits.length >= 24) {
          this.tryDecode();
        }

        // Timeout check
        if (this.bits.length > MAX_BITS_TIMEOUT) {
          this.handleTimeout();
        }
      }
    }
  }

  /**
   * Try to decode the received bits
   */
  private tryDecode(): void {
    const message = Protocol.decode(this.bits);

    if (message !== null) {
      // Success!
      this.notifyStatus({ state: 'success' });
      this.config.callbacks.onMessage(message);
      this.reset();
      this.notifyStatus({ state: 'idle' });
    }
  }

  /**
   * Handle timeout
   */
  private handleTimeout(): void {
    this.notifyStatus({ state: 'error', message: 'timeout' });
    this.config.callbacks.onError({
      type: 'timeout',
      message: 'Receive timeout: too many bits without valid message',
    });
    this.reset();
    this.notifyStatus({ state: 'idle' });
  }

  /**
   * Notify status change
   */
  private notifyStatus(status: ReceiverStatus): void {
    this.config.callbacks.onStatusChange(status);
  }
}

/**
 * Simple BitReceiver for testing and manual control
 */
export class ManualBitReceiver {
  private state: ReceiverState = 'idle';
  private bits: number[] = [];
  private readonly callbacks: ReceiverCallbacks;

  constructor(callbacks: ReceiverCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Set state directly (for testing)
   */
  setState(state: ReceiverState): void {
    this.state = state;
    // Map 'bits' state to 'receiving' for ReceiverStatus
    const statusState = state === 'bits' ? 'receiving' as const : state;
    if (statusState === 'receiving') {
      this.callbacks.onStatusChange({ state: statusState, progress: 0 });
    } else {
      this.callbacks.onStatusChange({ state: statusState });
    }
  }

  /**
   * Get current state
   */
  getState(): ReceiverState {
    return this.state;
  }

  /**
   * Add a bit manually
   */
  addBit(bit: 0 | 1): void {
    this.bits.push(bit);
  }

  /**
   * Get collected bits
   */
  getBits(): number[] {
    return [...this.bits];
  }

  /**
   * Clear bits
   */
  clearBits(): void {
    this.bits = [];
  }

  /**
   * Process pilot detected event
   */
  processPilotDetected(detected: boolean): void {
    if (this.state === 'idle' && detected) {
      this.state = 'pilot';
      this.callbacks.onStatusChange({ state: 'pilot' });
    } else if (this.state === 'pilot' && !detected) {
      this.state = 'gap';
      this.callbacks.onStatusChange({ state: 'gap' });
    }
  }

  /**
   * Transition from gap to bits
   */
  startBitCollection(): void {
    if (this.state === 'gap') {
      this.state = 'bits';
      this.bits = [];
      this.callbacks.onStatusChange({ state: 'receiving', progress: 0 });
    }
  }

  /**
   * Try to decode collected bits
   */
  tryDecode(): void {
    const message = Protocol.decode(this.bits);

    if (message !== null) {
      this.callbacks.onStatusChange({ state: 'success' });
      this.callbacks.onMessage(message);
      this.reset();
    } else {
      this.callbacks.onStatusChange({ state: 'error', message: 'decode failed' });
      this.callbacks.onError({
        type: 'checksum',
        message: 'Checksum verification failed',
      });
    }
  }

  /**
   * Reset to idle
   */
  reset(): void {
    this.state = 'idle';
    this.bits = [];
    this.callbacks.onStatusChange({ state: 'idle' });
  }
}
