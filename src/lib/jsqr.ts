/**
 * Signal - jsQR Type Definitions
 *
 * Type definitions for jsQR library.
 * The actual library will be loaded from CDN and inlined during build.
 */

import { logger } from '../utils/index.js';

/**
 * Point in QR code
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * QR Code location data
 */
export interface QRCodeLocation {
  topLeftCorner: Point;
  topRightCorner: Point;
  bottomLeftCorner: Point;
  bottomRightCorner: Point;
  topLeftFinderPattern: Point;
  topRightFinderPattern: Point;
  bottomLeftFinderPattern: Point;
  bottomRightAlignmentPattern?: Point;
}

/**
 * QR Code data chunks
 */
export interface Chunk {
  type: string;
  text: string;
  bytes: number[];
}

/**
 * QR Code detection result
 */
export interface QRCodeResult {
  /** Decoded string data */
  data: string;

  /** Raw bytes */
  binaryData: number[];

  /** Data chunks */
  chunks: Chunk[];

  /** QR code location in image */
  location: QRCodeLocation;
}

/**
 * jsQR options
 */
export interface JSQROptions {
  /**
   * Inversion attempts:
   * - 'dontInvert': Only try normal scan
   * - 'onlyInvert': Only try inverted scan
   * - 'attemptBoth': Try both (default)
   */
  inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth';
}

/**
 * jsQR function type
 */
export type JSQRFunction = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options?: JSQROptions
) => QRCodeResult | null;

/**
 * Get jsQR function from global scope
 */
export function getJSQR(): JSQRFunction | null {
  if (typeof window !== 'undefined' && 'jsQR' in window) {
    return (window as unknown as { jsQR: JSQRFunction }).jsQR;
  }
  return null;
}

/**
 * Scan QR code from image data
 */
export function scanQRCode(imageData: ImageData): QRCodeResult | null {
  const jsQR = getJSQR();
  if (!jsQR) {
    logger.error('jsQR library not loaded');
    return null;
  }

  try {
    return jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });
  } catch (error) {
    logger.error('Failed to scan QR code:', error);
    return null;
  }
}

/**
 * CDN URL for jsQR
 */
export const JSQR_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js';
