/**
 * Signal - QR Code Generator Type Definitions
 *
 * Type definitions for qrcode-generator library.
 * The actual library will be loaded from CDN and inlined during build.
 */

/**
 * QR Code instance interface
 */
export interface QRCode {
  /** Add data to encode */
  addData(data: string, mode?: string): void;

  /** Generate QR code */
  make(): void;

  /** Get module count (size) */
  getModuleCount(): number;

  /** Check if module is dark */
  isDark(row: number, col: number): boolean;

  /** Create data URL */
  createDataURL(cellSize?: number, margin?: number): string;

  /** Create img tag */
  createImgTag(cellSize?: number, margin?: number): string;

  /** Create SVG tag */
  createSvgTag(cellSize?: number, margin?: number): string;

  /** Create ASCII art */
  createASCII(cellSize?: number, margin?: number): string;
}

/**
 * QR Code factory function type
 */
export type QRCodeFactory = (typeNumber: number, errorCorrectionLevel: string) => QRCode;

/**
 * Get the QR code factory from global scope
 */
export function getQRCodeFactory(): QRCodeFactory | null {
  if (typeof window !== 'undefined' && 'qrcode' in window) {
    return (window as unknown as { qrcode: QRCodeFactory }).qrcode;
  }
  return null;
}

/**
 * Generate a QR code for the given data
 */
export function generateQRCode(
  data: string,
  errorCorrectionLevel: string = 'M'
): QRCode | null {
  const factory = getQRCodeFactory();
  if (!factory) {
    console.error('qrcode-generator library not loaded');
    return null;
  }

  try {
    // Type 0 = auto-detect
    const qr = factory(0, errorCorrectionLevel);
    qr.addData(data);
    qr.make();
    return qr;
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    return null;
  }
}

/**
 * CDN URL for qrcode-generator
 */
export const QRCODE_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
