/**
 * Signal - Video Manager
 *
 * Handles camera and video analysis for visual communication.
 * - Camera acquisition via getUserMedia
 * - Canvas-based pixel analysis
 * - Luminance and RGB calculation
 */

import type { SamplingRegion, RGBResult, LuminanceResult } from '../types/index.js';
import {
  CENTER_REGION_RATIO,
  GRID_ROWS,
  GRID_COLS,
  GRID_CELL_SAMPLE_RATIO,
  PIXEL_SAMPLE_STEP,
  CAMERA_STABILIZATION_MS,
  CALIBRATION_SAMPLES,
  CALIBRATION_INTERVAL_MS,
} from '../constants/index.js';
import { PermissionDeniedError, DeviceNotFoundError, APINotSupportedError } from '../types/index.js';

/**
 * Camera Manager
 *
 * Handles camera acquisition and stream management.
 */
export class CameraManager {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement;

  constructor() {
    // Create hidden video element
    this.videoElement = document.createElement('video');
    this.videoElement.playsInline = true;
    this.videoElement.muted = true;
    this.videoElement.autoplay = true;
  }

  /**
   * Start camera capture
   * @param facingMode 'user' for front camera, 'environment' for back camera
   */
  async start(facingMode: 'user' | 'environment' = 'user'): Promise<void> {
    // Check API support
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new APINotSupportedError('getUserMedia');
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      this.videoElement.srcObject = this.stream;
      await this.videoElement.play();

      // Wait for camera to stabilize
      await this.waitForStability();
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
   * Stop camera capture
   */
  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.videoElement.srcObject = null;
  }

  /**
   * Check if camera is active
   */
  isActive(): boolean {
    return this.stream !== null;
  }

  /**
   * Get the video element
   */
  getVideoElement(): HTMLVideoElement {
    return this.videoElement;
  }

  /**
   * Get video dimensions
   */
  getDimensions(): { width: number; height: number } {
    return {
      width: this.videoElement.videoWidth,
      height: this.videoElement.videoHeight,
    };
  }

  /**
   * Wait for camera to stabilize
   */
  private waitForStability(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, CAMERA_STABILIZATION_MS));
  }
}

/**
 * Video Analyzer
 *
 * Analyzes video frames using Canvas API.
 */
export class VideoAnalyzer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: CameraManager;

  constructor(camera: CameraManager) {
    this.camera = camera;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', {
      willReadFrequently: true, // Optimize for frequent getImageData calls
      alpha: false,
    })!;
  }

  /**
   * Capture current video frame as ImageData
   */
  captureFrame(): ImageData {
    const video = this.camera.getVideoElement();
    const { width, height } = this.camera.getDimensions();

    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.drawImage(video, 0, 0);

    return this.ctx.getImageData(0, 0, width, height);
  }

  /**
   * Get the canvas element (for rendering video preview)
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Draw video frame to an external canvas
   */
  drawToCanvas(targetCanvas: HTMLCanvasElement): void {
    const video = this.camera.getVideoElement();
    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;

    // DPRを考慮した論理サイズを取得
    const dpr = window.devicePixelRatio || 1;
    const canvasWidth = targetCanvas.width / dpr;
    const canvasHeight = targetCanvas.height / dpr;

    // ビデオのアスペクト比
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;
    const videoAspect = videoWidth / videoHeight;
    const canvasAspect = canvasWidth / canvasHeight;

    let drawWidth: number;
    let drawHeight: number;
    let offsetX: number;
    let offsetY: number;

    if (videoAspect > canvasAspect) {
      // ビデオが横長 → 幅に合わせて、上下に余白（letterbox）
      drawWidth = canvasWidth;
      drawHeight = canvasWidth / videoAspect;
      offsetX = 0;
      offsetY = (canvasHeight - drawHeight) / 2;
    } else {
      // ビデオが縦長 → 高さに合わせて、左右に余白（pillarbox）
      drawHeight = canvasHeight;
      drawWidth = canvasHeight * videoAspect;
      offsetX = (canvasWidth - drawWidth) / 2;
      offsetY = 0;
    }

    // 背景をクリア
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // アスペクト比を保持して描画
    ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
  }
}

/**
 * Get center sampling region (for color/brightness channels)
 */
export function getCenterRegion(imageWidth: number, imageHeight: number): SamplingRegion {
  const size = Math.min(imageWidth, imageHeight) * CENTER_REGION_RATIO;
  return {
    x: Math.floor((imageWidth - size) / 2),
    y: Math.floor((imageHeight - size) / 2),
    width: Math.floor(size),
    height: Math.floor(size),
    step: PIXEL_SAMPLE_STEP,
  };
}

/**
 * Get grid cell sampling region
 */
export function getGridCellRegion(
  imageWidth: number,
  imageHeight: number,
  row: number,
  col: number
): SamplingRegion {
  const cellWidth = imageWidth / GRID_COLS;
  const cellHeight = imageHeight / GRID_ROWS;
  const centerX = cellWidth * (col + 0.5);
  const centerY = cellHeight * (row + 0.5);

  const sampleSize = Math.min(cellWidth, cellHeight) * GRID_CELL_SAMPLE_RATIO;

  return {
    x: Math.floor(centerX - sampleSize / 2),
    y: Math.floor(centerY - sampleSize / 2),
    width: Math.floor(sampleSize),
    height: Math.floor(sampleSize),
    step: PIXEL_SAMPLE_STEP,
  };
}

/**
 * Calculate luminance for a sampling region
 * Uses ITU-R BT.709 formula: Y = 0.2126R + 0.7152G + 0.0722B
 */
export function calculateLuminance(imageData: ImageData, region: SamplingRegion): LuminanceResult {
  const { data, width } = imageData;
  let sum = 0;
  let count = 0;
  let max = 0;
  let min = 255;

  for (let y = region.y; y < region.y + region.height; y += region.step) {
    for (let x = region.x; x < region.x + region.width; x += region.step) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // ITU-R BT.709 luminance
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      sum += luminance;
      count++;
      max = Math.max(max, luminance);
      min = Math.min(min, luminance);
    }
  }

  return {
    average: count > 0 ? sum / count : 0,
    max,
    min,
    sampleCount: count,
  };
}

/**
 * Calculate average RGB for a sampling region
 */
export function calculateAverageRGB(imageData: ImageData, region: SamplingRegion): RGBResult {
  const { data, width } = imageData;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;

  for (let y = region.y; y < region.y + region.height; y += region.step) {
    for (let x = region.x; x < region.x + region.width; x += region.step) {
      const i = (y * width + x) * 4;
      sumR += data[i];
      sumG += data[i + 1];
      sumB += data[i + 2];
      count++;
    }
  }

  return count > 0
    ? { r: sumR / count, g: sumG / count, b: sumB / count }
    : { r: 0, g: 0, b: 0 };
}

/**
 * Detect blue pilot signal (for color channel)
 * Blue > 100 AND Blue > Red × 1.3 AND Blue > Green × 1.3
 */
export function detectBluePilot(rgb: RGBResult): boolean {
  return rgb.b > 100 && rgb.b > rgb.r * 1.3 && rgb.b > rgb.g * 1.3;
}

/**
 * Detect color bit (red = 0, green = 1)
 */
export function detectColorBit(rgb: RGBResult): 0 | 1 {
  return rgb.g > rgb.r ? 1 : 0;
}

/**
 * Calibration Manager
 *
 * Calibrates luminance threshold based on ambient conditions.
 */
export class CalibrationManager {
  private baselineLuminance: number = 0;
  private brightnessThreshold: number = 0;
  private pilotThreshold: number = 0;
  private isCalibrated: boolean = false;

  /**
   * Perform calibration
   */
  async calibrate(analyzer: VideoAnalyzer): Promise<void> {
    const samples: number[] = [];

    for (let i = 0; i < CALIBRATION_SAMPLES; i++) {
      const imageData = analyzer.captureFrame();
      const region = getCenterRegion(imageData.width, imageData.height);
      const result = calculateLuminance(imageData, region);
      samples.push(result.average);

      await new Promise((resolve) => setTimeout(resolve, CALIBRATION_INTERVAL_MS));
    }

    // Use median for noise resistance
    samples.sort((a, b) => a - b);
    this.baselineLuminance = samples[Math.floor(samples.length / 2)];

    // Set thresholds
    this.brightnessThreshold = this.baselineLuminance + 40;
    this.pilotThreshold = this.baselineLuminance + 60;

    this.isCalibrated = true;
  }

  /**
   * Check if calibrated
   */
  getIsCalibrated(): boolean {
    return this.isCalibrated;
  }

  /**
   * Check if luminance indicates "bright" (bit = 1)
   */
  isBright(luminance: number): boolean {
    return luminance > this.brightnessThreshold;
  }

  /**
   * Check if luminance indicates pilot signal
   */
  isPilot(luminance: number): boolean {
    return luminance > this.pilotThreshold;
  }

  /**
   * Get calibration values
   */
  getValues(): { baseline: number; brightnessThreshold: number; pilotThreshold: number } {
    return {
      baseline: this.baselineLuminance,
      brightnessThreshold: this.brightnessThreshold,
      pilotThreshold: this.pilotThreshold,
    };
  }
}

/**
 * Grid Analyzer
 *
 * Analyzes 4×4 grid patterns for grid channel.
 */
export class GridAnalyzer {
  /**
   * Analyze grid and return 16 bit values
   */
  analyzeGrid(imageData: ImageData): number[] {
    const { width, height } = imageData;
    const bits: number[] = [];

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const region = getGridCellRegion(width, height, row, col);
        const result = calculateLuminance(imageData, region);
        bits.push(result.average > 128 ? 1 : 0);
      }
    }

    return bits;
  }

  /**
   * Check if all cells are white (pilot detection)
   */
  isAllWhite(imageData: ImageData): boolean {
    const { width, height } = imageData;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const region = getGridCellRegion(width, height, row, col);
        const result = calculateLuminance(imageData, region);
        if (result.average <= 150) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Check if pattern is checkerboard (end marker)
   * Tolerance: 75% match
   */
  isCheckerboard(bits: number[]): boolean {
    let matchCount = 0;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const index = row * GRID_COLS + col;
        const expected = (row + col) % 2;
        if (bits[index] === expected) {
          matchCount++;
        }
      }
    }

    return matchCount / (GRID_ROWS * GRID_COLS) >= 0.75;
  }
}
