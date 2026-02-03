/**
 * Signal - External Library Exports
 */

export {
  getQRCodeFactory,
  generateQRCode,
  QRCODE_CDN_URL,
} from './qrcode-generator.js';
export type { QRCode, QRCodeFactory } from './qrcode-generator.js';

export {
  getJSQR,
  scanQRCode,
  JSQR_CDN_URL,
} from './jsqr.js';
export type {
  QRCodeResult,
  QRCodeLocation,
  Point,
  Chunk,
  JSQROptions,
  JSQRFunction,
} from './jsqr.js';
