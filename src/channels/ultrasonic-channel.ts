/**
 * Signal - Ultrasonic Channel
 *
 * Communication channel using ultrasonic frequencies (17-19 kHz).
 * Uses FSK modulation: 18 kHz for bit 0, 19 kHz for bit 1.
 * Pilot signal at 17 kHz for synchronization.
 */

import type { ChannelConfig, IVisualizer } from '../types/index.js';
import { CHANNEL_CONFIGS, ULTRASONIC_CONFIG } from '../constants/index.js';
import { AudioChannelBase } from './base-channel.js';
import { AudioTransmitter, AudioReceiver } from '../infrastructure/audio-manager.js';
import { BitReceiver } from '../domain/bit-receiver.js';
import { Protocol } from '../domain/protocol.js';
import { SpectrumVisualizer } from '../infrastructure/canvas-manager.js';

/**
 * Ultrasonic Visualizer
 *
 * Draws FFT spectrum with highlighted FSK frequencies.
 */
class UltrasonicVisualizer implements IVisualizer {
  private receiver: AudioReceiver | null = null;
  private spectrumVisualizer: SpectrumVisualizer | null = null;

  setReceiver(receiver: AudioReceiver): void {
    this.receiver = receiver;
  }

  draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
    if (!this.spectrumVisualizer) {
      this.spectrumVisualizer = new SpectrumVisualizer(canvas);
      this.spectrumVisualizer.setHighlightFrequencies([
        { freq: ULTRASONIC_CONFIG.pilotFrequency, color: '#FFD700' }, // Pilot (gold)
        { freq: ULTRASONIC_CONFIG.freq0, color: '#FF6B6B' },          // Bit 0 (red)
        { freq: ULTRASONIC_CONFIG.freq1, color: '#4ECB71' },          // Bit 1 (green)
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
        this.receiver.getSampleRate(),
        ULTRASONIC_CONFIG.fftSize,
        15000,
        22000
      );
    }
  }

  getPreferredHeight(): 'collapsed' | 'open' | 'expanded' {
    return 'open';
  }
}

/**
 * Ultrasonic Channel
 *
 * High-frequency audio channel for inaudible communication.
 * - Pilot: 17 kHz (700ms)
 * - FSK: 18/19 kHz
 * - Bit duration: 100ms
 * - Theoretical speed: ~9 bps
 */
export class UltrasonicChannel extends AudioChannelBase {
  readonly config: ChannelConfig = CHANNEL_CONFIGS['ultrasonic'];

  private transmitter: AudioTransmitter | null = null;
  private receiver: AudioReceiver | null = null;
  private bitReceiver: BitReceiver | null = null;
  private readonly ultrasonicVisualizer: UltrasonicVisualizer;

  constructor() {
    super();
    this.ultrasonicVisualizer = new UltrasonicVisualizer();
    this.visualizer = this.ultrasonicVisualizer;
  }

  /**
   * Send a message via ultrasonic tones
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
      this.transmitter = new AudioTransmitter(ULTRASONIC_CONFIG);
      await this.transmitter.transmit(bits);
    } finally {
      this._isSending = false;
      this.transmitter = null;
    }
  }

  /**
   * Start receiving ultrasonic signals
   */
  async startReceive(): Promise<void> {
    if (this._isReceiving) {
      return;
    }

    // Create and start audio receiver
    this.receiver = new AudioReceiver(ULTRASONIC_CONFIG);
    await this.receiver.start();

    // Set receiver for visualization
    this.ultrasonicVisualizer.setReceiver(this.receiver);

    // Create bit receiver with detection functions
    this.bitReceiver = new BitReceiver({
      bitMs: ULTRASONIC_CONFIG.bitDurationMs,
      guardMs: ULTRASONIC_CONFIG.guardIntervalMs,
      gapMs: ULTRASONIC_CONFIG.gapDurationMs,
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
