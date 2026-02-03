/**
 * Signal - Audio Manager
 *
 * Handles Web Audio API operations for sound-based communication.
 * - AudioContext management
 * - OscillatorNode for tone generation (FSK transmission)
 * - AnalyserNode for FFT analysis (FSK reception)
 */

import type { FSKChannelConfig, FrequencyPowerResult } from '../types/index.js';
import { FFT_SMOOTHING, MIN_POWER_DIFFERENCE_DB } from '../constants/index.js';
import { PermissionDeniedError, DeviceNotFoundError, APINotSupportedError } from '../types/index.js';

/**
 * Audio Transmitter
 *
 * Generates FSK tones for transmission using OscillatorNode.
 */
export class AudioTransmitter {
  private context: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private config: FSKChannelConfig;
  private isCancelled = false;

  constructor(config: FSKChannelConfig) {
    this.config = config;
  }

  /**
   * Transmit a bit array as FSK tones
   */
  async transmit(bits: number[]): Promise<void> {
    this.isCancelled = false;

    // Create AudioContext (must be in user gesture handler)
    this.context = new AudioContext();
    this.gainNode = this.context.createGain();
    this.gainNode.connect(this.context.destination);
    this.gainNode.gain.setValueAtTime(0, this.context.currentTime);

    let currentTime = this.context.currentTime;

    // 1. Pilot signal
    currentTime = this.scheduleTone(
      this.config.pilotFrequency,
      currentTime,
      this.config.pilotDurationMs
    );

    // 2. Gap (silence)
    currentTime += this.config.gapDurationMs / 1000;

    // 3. Bit sequence
    for (const bit of bits) {
      if (this.isCancelled) break;

      const frequency = bit === 0 ? this.config.freq0 : this.config.freq1;
      currentTime = this.scheduleTone(frequency, currentTime, this.config.bitDurationMs);
      currentTime += this.config.guardIntervalMs / 1000;
    }

    // Wait for transmission to complete
    const remainingMs = (currentTime - this.context.currentTime) * 1000 + 100;
    await this.sleep(remainingMs);

    // Close AudioContext
    await this.close();
  }

  /**
   * Cancel ongoing transmission
   */
  cancel(): void {
    this.isCancelled = true;
    this.close();
  }

  /**
   * Check if currently transmitting
   */
  isTransmitting(): boolean {
    return this.context !== null && this.context.state !== 'closed';
  }

  /**
   * Schedule a tone at the specified time
   * @returns End time of the tone
   */
  private scheduleTone(frequency: number, startTime: number, durationMs: number): number {
    if (!this.context || !this.gainNode) {
      throw new Error('AudioContext not initialized');
    }

    const oscillator = this.context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startTime);
    oscillator.connect(this.gainNode);

    const endTime = startTime + durationMs / 1000;
    const rampTime = 0.002; // 2ms fade for click noise reduction

    // Envelope: fade in → hold → fade out
    this.gainNode.gain.setValueAtTime(0, startTime);
    this.gainNode.gain.linearRampToValueAtTime(0.5, startTime + rampTime);
    this.gainNode.gain.setValueAtTime(0.5, endTime - rampTime);
    this.gainNode.gain.linearRampToValueAtTime(0, endTime);

    oscillator.start(startTime);
    oscillator.stop(endTime);

    return endTime;
  }

  /**
   * Close AudioContext
   */
  private async close(): Promise<void> {
    if (this.context && this.context.state !== 'closed') {
      await this.context.close();
      this.context = null;
      this.gainNode = null;
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Audio Receiver
 *
 * Analyzes microphone input using AnalyserNode for FSK reception.
 */
export class AudioReceiver {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private frequencyData: Float32Array | null = null;
  private config: FSKChannelConfig;

  constructor(config: FSKChannelConfig) {
    this.config = config;
  }

  /**
   * Start receiving (acquire microphone)
   */
  async start(): Promise<void> {
    // Check API support
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new APINotSupportedError('getUserMedia');
    }

    try {
      // Acquire microphone
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      // Create AudioContext
      this.context = new AudioContext();

      // Connect microphone to analyser
      const source = this.context.createMediaStreamSource(this.stream);
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = this.config.fftSize;
      this.analyser.smoothingTimeConstant = FFT_SMOOTHING;
      this.analyser.minDecibels = -100;
      this.analyser.maxDecibels = -30;

      source.connect(this.analyser);
      // Note: Don't connect to destination (no playback needed)

      this.frequencyData = new Float32Array(this.analyser.frequencyBinCount);
    } catch (error) {
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          throw new PermissionDeniedError();
        }
        if (error.name === 'NotFoundError') {
          throw new DeviceNotFoundError();
        }
      }
      throw error;
    }
  }

  /**
   * Stop receiving (release microphone)
   */
  async stop(): Promise<void> {
    // Stop all tracks
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    // Close AudioContext
    if (this.context && this.context.state !== 'closed') {
      await this.context.close();
      this.context = null;
    }

    this.analyser = null;
    this.frequencyData = null;
  }

  /**
   * Check if receiving
   */
  isActive(): boolean {
    return this.context !== null && this.analyser !== null;
  }

  /**
   * Detect pilot signal
   */
  detectPilot(): boolean {
    const power = this.getPowerAtFrequency(this.config.pilotFrequency);
    return power >= this.config.detectionThresholdDb;
  }

  /**
   * Detect bit (0 or 1)
   * @returns 0, 1, or null if signal too weak
   */
  detectBit(): 0 | 1 | null {
    const power0 = this.getPowerAtFrequency(this.config.freq0);
    const power1 = this.getPowerAtFrequency(this.config.freq1);

    const maxPower = Math.max(power0, power1);
    if (maxPower < this.config.detectionThresholdDb) {
      return null;
    }

    // Require minimum power difference for reliable detection
    if (Math.abs(power0 - power1) < MIN_POWER_DIFFERENCE_DB) {
      return null;
    }

    return power1 > power0 ? 1 : 0;
  }

  /**
   * Get power at a specific frequency
   * @param frequency Target frequency in Hz
   * @param spreadBins Number of adjacent bins to check (for frequency drift tolerance)
   */
  getPowerAtFrequency(frequency: number, spreadBins: number = 2): number {
    if (!this.analyser || !this.frequencyData || !this.context) {
      return -Infinity;
    }

    // Update frequency data
    this.analyser.getFloatFrequencyData(this.frequencyData);

    const sampleRate = this.context.sampleRate;
    const centerBin = Math.round((frequency * this.config.fftSize) / sampleRate);

    let maxPower = -Infinity;
    for (let i = -spreadBins; i <= spreadBins; i++) {
      const binIndex = centerBin + i;
      if (binIndex >= 0 && binIndex < this.frequencyData.length) {
        maxPower = Math.max(maxPower, this.frequencyData[binIndex]);
      }
    }

    return maxPower;
  }

  /**
   * Get power at multiple frequencies
   */
  getPowerAtFrequencies(frequencies: number[]): FrequencyPowerResult[] {
    if (!this.analyser || !this.frequencyData || !this.context) {
      return frequencies.map((f) => ({ frequency: f, powerDb: -Infinity, binIndex: 0 }));
    }

    // Update frequency data
    this.analyser.getFloatFrequencyData(this.frequencyData);

    const sampleRate = this.context.sampleRate;

    return frequencies.map((frequency) => {
      const binIndex = Math.round((frequency * this.config.fftSize) / sampleRate);
      const powerDb = this.frequencyData![binIndex] ?? -Infinity;
      return { frequency, powerDb, binIndex };
    });
  }

  /**
   * Get full spectrum data (for visualization)
   */
  getSpectrum(): Float32Array | null {
    if (!this.analyser || !this.frequencyData) {
      return null;
    }

    this.analyser.getFloatFrequencyData(this.frequencyData);
    return this.frequencyData;
  }

  /**
   * Get frequency resolution (Hz per bin)
   */
  getFrequencyResolution(): number {
    if (!this.context) return 0;
    return this.context.sampleRate / this.config.fftSize;
  }

  /**
   * Get analyser node (for external visualization)
   */
  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  /**
   * Convert frequency to FFT bin index
   */
  frequencyToBin(frequency: number): number {
    if (!this.context) return 0;
    return Math.round((frequency * this.config.fftSize) / this.context.sampleRate);
  }

  /**
   * Convert FFT bin index to frequency
   */
  binToFrequency(binIndex: number): number {
    if (!this.context) return 0;
    return (binIndex * this.context.sampleRate) / this.config.fftSize;
  }
}
