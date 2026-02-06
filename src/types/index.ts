/**
 * Signal - Type Definitions
 */

// ============================================================
// Channel Types
// ============================================================

/** Available channel identifiers */
export type ChannelId = 'ultrasonic' | 'audible' | 'brightness' | 'color' | 'grid' | 'qr';

/** Channel configuration */
export interface ChannelConfig {
  readonly id: ChannelId;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly pilotMs: number;
  readonly gapMs: number;
  readonly bitMs?: number;
  readonly frameMs?: number;
  readonly theoreticalBps: number;
}

/** Channel interface */
export interface IChannel {
  readonly config: ChannelConfig;

  send(message: string): Promise<void>;
  startReceive(): Promise<void>;
  stopReceive(): void;
  getVisualizer(): IVisualizer;
  isReceiving(): boolean;
  isSending(): boolean;
}

/** Visualizer interface for signal panel */
export interface IVisualizer {
  draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void;
  getPreferredHeight(): 'collapsed' | 'open' | 'expanded';
}

// ============================================================
// Receiver Types
// ============================================================

/** Receiver state machine states */
export type ReceiverState = 'idle' | 'pilot' | 'gap' | 'bits';

/** Receiver status for UI */
export type ReceiverStatus =
  | { state: 'idle' }
  | { state: 'pilot' }
  | { state: 'gap' }
  | { state: 'receiving'; progress: number; partialText?: string }
  | { state: 'success' }
  | { state: 'error'; message: string };

/** Receiver error types */
export interface ReceiverError {
  type: 'checksum' | 'timeout' | 'permission' | 'decode';
  message: string;
}

/** Receiver callbacks */
export interface ReceiverCallbacks {
  onMessage: (message: string) => void;
  onError: (error: ReceiverError) => void;
  onStatusChange: (status: ReceiverStatus) => void;
}

// ============================================================
// Message Types
// ============================================================

/** Message direction */
export type MessageDirection = 'sent' | 'received' | 'system';

/** Chat message */
export interface ChatMessage {
  id: string;
  direction: MessageDirection;
  content: string;
  channel?: ChannelId;
  timestamp: Date;
}

// ============================================================
// Application State Types
// ============================================================

/** Signal panel state */
export type SignalPanelState = 'collapsed' | 'open' | 'expanded';

/** Transceiver state */
export type TransceiverState = 'idle' | 'sending' | 'receiving';

/** Application state */
export interface AppState {
  currentChannel: ChannelId;
  transceiverState: TransceiverState;
  signalPanelState: SignalPanelState;
  messages: ChatMessage[];
  inputText: string;
  receiverStatus: ReceiverStatus;
}

// ============================================================
// Audio Types
// ============================================================

/** FSK channel configuration */
export interface FSKChannelConfig {
  pilotFrequency: number;
  freq0: number;
  freq1: number;
  pilotDurationMs: number;
  gapDurationMs: number;
  bitDurationMs: number;
  guardIntervalMs: number;
  detectionThresholdDb: number;
  fftSize: number;
}

/** Frequency power result */
export interface FrequencyPowerResult {
  frequency: number;
  powerDb: number;
  binIndex: number;
}

// ============================================================
// Visual Types
// ============================================================

/** Sampling region for camera analysis */
export interface SamplingRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  step: number;
}

/** RGB color result */
export interface RGBResult {
  r: number;
  g: number;
  b: number;
}

/** Luminance result */
export interface LuminanceResult {
  average: number;
  max: number;
  min: number;
  sampleCount: number;
}

// ============================================================
// Grid Types
// ============================================================

/** Grid frame (16 bits = 2 bytes) */
export interface GridFrame {
  highByte: number;
  lowByte: number;
}

// ============================================================
// Error Types
// ============================================================

/** Base signal error */
export abstract class SignalError extends Error {
  abstract readonly code: string;
  abstract readonly userMessage: string;
}

/** Permission denied error */
export class PermissionDeniedError extends SignalError {
  readonly code = 'PERMISSION_DENIED';
  readonly userMessage = 'マイク/カメラへのアクセスが拒否されました';

  constructor() {
    super('Permission denied for media access');
    this.name = 'PermissionDeniedError';
  }
}

/** Checksum error */
export class ChecksumError extends SignalError {
  readonly code = 'CHECKSUM_ERROR';
  readonly userMessage = 'データ検証に失敗しました';

  constructor() {
    super('Checksum verification failed');
    this.name = 'ChecksumError';
  }
}

/** Message too long error */
export class MessageTooLongError extends SignalError {
  readonly code = 'MESSAGE_TOO_LONG';
  readonly userMessage = 'メッセージが200バイトを超えています';

  constructor() {
    super('Message exceeds 200 bytes');
    this.name = 'MessageTooLongError';
  }
}

/** Receive timeout error */
export class ReceiveTimeoutError extends SignalError {
  readonly code = 'RECEIVE_TIMEOUT';
  readonly userMessage = '受信がタイムアウトしました';

  constructor() {
    super('Receive operation timed out');
    this.name = 'ReceiveTimeoutError';
  }
}

/** Device not found error */
export class DeviceNotFoundError extends SignalError {
  readonly code = 'DEVICE_NOT_FOUND';
  readonly userMessage = 'マイク/カメラが見つかりません';

  constructor() {
    super('Media device not found');
    this.name = 'DeviceNotFoundError';
  }
}

/** API not supported error */
export class APINotSupportedError extends SignalError {
  readonly code = 'API_NOT_SUPPORTED';
  readonly userMessage = 'このブラウザはサポートされていません';

  constructor(api: string) {
    super(`${api} is not supported in this browser`);
    this.name = 'APINotSupportedError';
  }
}

// ============================================================
// Store Types
// ============================================================

/** State listener function */
export type StateListener<T> = (state: T) => void;

/** Store interface */
export interface IStore<T> {
  getState(): T;
  setState(updater: (prev: T) => T): void;
  subscribe(listener: StateListener<T>): () => void;
}
