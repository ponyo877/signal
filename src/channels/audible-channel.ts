/**
 * Signal - Audible Channel
 *
 * Communication channel using audible frequencies (400-1600 Hz).
 * Uses FSK modulation: 800 Hz for bit 0, 1600 Hz for bit 1.
 * Pilot signal at 400 Hz for synchronization.
 */

import type { ChannelConfig, IVisualizer } from '../types/index.js';
import { CHANNEL_CONFIGS, AUDIBLE_CONFIG } from '../constants/index.js';
import { AudioChannelBase } from './base-channel.js';
import { AudioTransmitter, AudioReceiver } from '../infrastructure/audio-manager.js';
import { BitReceiver } from '../domain/bit-receiver.js';
import { Protocol } from '../domain/protocol.js';
import { SpectrumVisualizer } from '../infrastructure/canvas-manager.js';

/**
 * Audible Visualizer
 *
 * Draws FFT spectrum with highlighted FSK frequencies.
 */
class AudibleVisualizer implements IVisualizer {
  private receiver: AudioReceiver | null = null;
  private spectrumVisualizer: SpectrumVisualizer | null = null;

  setReceiver(receiver: AudioReceiver): void {
    this.receiver = receiver;
  }

  draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
    if (!this.spectrumVisualizer) {
      this.spectrumVisualizer = new SpectrumVisualizer(canvas);
      this.spectrumVisualizer.setHighlightFrequencies([
        { freq: AUDIBLE_CONFIG.pilotFrequency, color: '#FFD700' }, // Pilot (gold)
        { freq: AUDIBLE_CONFIG.freq0, color: '#FF6B6B' },          // Bit 0 (red)
        { freq: AUDIBLE_CONFIG.freq1, color: '#4ECB71' },          // Bit 1 (green)
      ]);
    }

    if (!this.receiver) {
      // Clear if no receiver
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const spectrum = this.receiver.getSpectrum();
    if (spectrum) {
      this.spectrumVisualizer.draw(
        spectrum,
        44100, // Assume standard sample rate
        AUDIBLE_CONFIG.fftSize,
        0,
        3000
      );
    }
  }

  getPreferredHeight(): 'collapsed' | 'open' | 'expanded' {
    return 'open';
  }
}

/**
 * Audible Channel
 *
 * Low-frequency audio channel for audible modem-style communication.
 * - Pilot: 400 Hz (700ms)
 * - FSK: 800/1600 Hz
 * - Bit duration: 70ms
 * - Theoretical speed: ~13 bps
 */
export class AudibleChannel extends AudioChannelBase {
  readonly config: ChannelConfig = CHANNEL_CONFIGS['audible'];

  private transmitter: AudioTransmitter | null = null;
  private receiver: AudioReceiver | null = null;
  private bitReceiver: BitReceiver | null = null;
  private readonly audibleVisualizer: AudibleVisualizer;

  constructor() {
    super();
    this.audibleVisualizer = new AudibleVisualizer();
    this.visualizer = this.audibleVisualizer;
  }

  /**
   * Send a message via audible tones
   */
  async send(message: string): Promise<void> {
    if (this._isSending) {
      throw new Error('Already sending');
    }

    this._isSending = true;
    this.notifyStatus({ state: 'idle' });

    try {
      // Encode message to bits
      const bits = Protocol.encode(message);

      // Create transmitter and send
      this.transmitter = new AudioTransmitter(AUDIBLE_CONFIG);
      await this.transmitter.transmit(bits);
    } finally {
      this._isSending = false;
      this.transmitter = null;
    }
  }

  /**
   * Start receiving audible signals
   */
  async startReceive(): Promise<void> {
    if (this._isReceiving) {
      return;
    }

    // Create and start audio receiver
    this.receiver = new AudioReceiver(AUDIBLE_CONFIG);
    await this.receiver.start();

    // Set receiver for visualization
    this.audibleVisualizer.setReceiver(this.receiver);

    // Create bit receiver with detection functions
    this.bitReceiver = new BitReceiver({
      bitMs: AUDIBLE_CONFIG.bitDurationMs,
      guardMs: AUDIBLE_CONFIG.guardIntervalMs,
      gapMs: AUDIBLE_CONFIG.gapDurationMs,
      detectPilot: () => this.receiver?.detectPilot() ?? false,
      detectBit: () => this.receiver?.detectBit() ?? null,
      callbacks: {
        onMessage: (message) => this.notifyMessage(message),
        onError: (error) => this.notifyError(error),
        onStatusChange: (status) => this.notifyStatus(status),
      },
    });

    this._isReceiving = true;
    this.bitReceiver.start();
  }

  /**
   * Stop receiving
   */
  stopReceive(): void {
    super.stopReceive();

    if (this.bitReceiver) {
      this.bitReceiver.stop();
      this.bitReceiver = null;
    }

    if (this.receiver) {
      this.receiver.stop();
      this.receiver = null;
    }
  }

  /**
   * Cancel ongoing transmission
   */
  cancelSend(): void {
    if (this.transmitter) {
      this.transmitter.cancel();
      this.transmitter = null;
    }
    this._isSending = false;
  }
}
