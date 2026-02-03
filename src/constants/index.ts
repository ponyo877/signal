/**
 * Signal - Constants
 */

import type { ChannelConfig, FSKChannelConfig } from '../types/index.js';

// ============================================================
// Protocol Constants
// ============================================================

/** Preamble pattern for clock synchronization */
export const PREAMBLE = [1, 0, 1, 0, 1, 0, 1, 0] as const;

/** Start marker pattern (8 consecutive 1s) */
export const START_MARKER = [1, 1, 1, 1, 1, 1, 1, 1] as const;

/** Maximum message size in bytes */
export const MAX_MESSAGE_BYTES = 200;

/** Maximum bits before timeout */
export const MAX_BITS_TIMEOUT = 2000;

/** Pilot signal duration in ms */
export const PILOT_MS = 700;

/** Gap duration in ms */
export const GAP_MS = 300;

/** Gap detection threshold multiplier */
export const GAP_THRESHOLD_MULTIPLIER = 0.6;

// ============================================================
// Audio Channel Constants
// ============================================================

/** Ultrasonic channel FSK configuration */
export const ULTRASONIC_CONFIG: FSKChannelConfig = {
  pilotFrequency: 17000,
  freq0: 18000,
  freq1: 19000,
  pilotDurationMs: 700,
  gapDurationMs: 300,
  bitDurationMs: 100,
  guardIntervalMs: 8,
  detectionThresholdDb: -42,
  fftSize: 8192,
};

/** Audible channel FSK configuration */
export const AUDIBLE_CONFIG: FSKChannelConfig = {
  pilotFrequency: 400,
  freq0: 800,
  freq1: 1600,
  pilotDurationMs: 700,
  gapDurationMs: 300,
  bitDurationMs: 70,
  guardIntervalMs: 8,
  detectionThresholdDb: -40,
  fftSize: 8192,
};

/** FFT smoothing time constant */
export const FFT_SMOOTHING = 0.3;

/** Minimum power difference for bit detection (dB) */
export const MIN_POWER_DIFFERENCE_DB = 3;

// ============================================================
// Visual Channel Constants
// ============================================================

/** Brightness channel bit duration in ms */
export const BRIGHTNESS_BIT_MS = 250;

/** Color channel bit duration in ms */
export const COLOR_BIT_MS = 280;

/** Grid channel frame duration in ms */
export const GRID_FRAME_MS = 400;

/** Grid pilot duration in ms */
export const GRID_PILOT_MS = 800;

/** Grid gap duration in ms */
export const GRID_GAP_MS = 400;

/** Grid checkerboard duration in ms */
export const GRID_CHECKERBOARD_MS = 500;

/** QR display duration in ms */
export const QR_DISPLAY_MS = 3000;

/** Brightness pilot color */
export const BRIGHTNESS_PILOT_COLOR = '#FFFFFF';

/** Brightness bit 0 color (black) */
export const BRIGHTNESS_BIT_0_COLOR = '#000000';

/** Brightness bit 1 color (white) */
export const BRIGHTNESS_BIT_1_COLOR = '#FFFFFF';

/** Color pilot color (blue) */
export const COLOR_PILOT_COLOR = '#0000FF';

/** Color bit 0 color (red) */
export const COLOR_BIT_0_COLOR = '#FF0000';

/** Color bit 1 color (green) */
export const COLOR_BIT_1_COLOR = '#00FF00';

/** Brightness threshold offset from calibration */
export const BRIGHTNESS_THRESHOLD_OFFSET = 40;

/** Brightness pilot threshold offset */
export const BRIGHTNESS_PILOT_OFFSET = 60;

/** Grid rows */
export const GRID_ROWS = 4;

/** Grid columns */
export const GRID_COLS = 4;

/** Grid cell count */
export const GRID_CELL_COUNT = GRID_ROWS * GRID_COLS;

/** Grid luminance threshold */
export const GRID_LUMINANCE_THRESHOLD = 128;

/** Grid all-white threshold */
export const GRID_ALL_WHITE_THRESHOLD = 150;

/** Checkerboard match tolerance */
export const CHECKERBOARD_TOLERANCE = 0.75;

/** Center sampling region ratio */
export const CENTER_REGION_RATIO = 0.2;

/** Grid cell sampling ratio */
export const GRID_CELL_SAMPLE_RATIO = 0.25;

/** Pixel sampling step */
export const PIXEL_SAMPLE_STEP = 2;

// ============================================================
// Channel Configurations
// ============================================================

/** All channel configurations */
export const CHANNEL_CONFIGS: Record<string, ChannelConfig> = {
  ultrasonic: {
    id: 'ultrasonic',
    name: '超音波',
    description: '18-19kHz の超音波で通信',
    icon: '🔊',
    pilotMs: 700,
    gapMs: 300,
    bitMs: 100,
    theoreticalBps: 9.3,
  },
  audible: {
    id: 'audible',
    name: '可聴音',
    description: '800-1600Hz のモデム音で通信',
    icon: '🎵',
    pilotMs: 700,
    gapMs: 300,
    bitMs: 70,
    theoreticalBps: 12.8,
  },
  brightness: {
    id: 'brightness',
    name: '画面明滅',
    description: '画面の白黒切替で通信',
    icon: '💡',
    pilotMs: 700,
    gapMs: 300,
    bitMs: 250,
    theoreticalBps: 4.0,
  },
  color: {
    id: 'color',
    name: '色変調',
    description: '画面の赤緑切替で通信',
    icon: '🎨',
    pilotMs: 700,
    gapMs: 300,
    bitMs: 280,
    theoreticalBps: 3.6,
  },
  grid: {
    id: 'grid',
    name: 'グリッド',
    description: '4×4グリッドで16bit並列通信',
    icon: '⊞',
    pilotMs: 800,
    gapMs: 400,
    frameMs: 400,
    theoreticalBps: 40,
  },
  qr: {
    id: 'qr',
    name: 'QRコード',
    description: 'QRコードで一括通信',
    icon: '▣',
    pilotMs: 0,
    gapMs: 0,
    theoreticalBps: 0, // Burst mode
  },
};

// ============================================================
// UI Constants
// ============================================================

/** Signal panel heights */
export const SIGNAL_PANEL_HEIGHTS = {
  collapsed: 0,
  open: 180,
  expanded: 260,
} as const;

/** Camera stabilization wait time in ms */
export const CAMERA_STABILIZATION_MS = 500;

/** Calibration sample count */
export const CALIBRATION_SAMPLES = 30;

/** Calibration interval in ms */
export const CALIBRATION_INTERVAL_MS = 16;

// ============================================================
// QR Constants
// ============================================================

/** QR error correction level */
export const QR_ERROR_CORRECTION = 'M';

/** QR display size ratio */
export const QR_SIZE_RATIO = 0.85;
