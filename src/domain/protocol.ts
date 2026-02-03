/**
 * Signal - Protocol
 *
 * Handles encoding and decoding of messages to/from bit arrays.
 * Frame structure:
 *   [Preamble 8bit] → [Start Marker 8bit] → [Length 8bit] → [Data N×8bit] → [Checksum 8bit]
 */

import { PREAMBLE, START_MARKER, MAX_MESSAGE_BYTES } from '../constants/index.js';
import { MessageTooLongError, ChecksumError } from '../types/index.js';

export class Protocol {
  /**
   * Encode a message string to a bit array
   * @param message The message to encode (UTF-8)
   * @returns Array of bits (0 or 1)
   * @throws MessageTooLongError if message exceeds 200 bytes
   */
  static encode(message: string): number[] {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(message);

    if (bytes.length > MAX_MESSAGE_BYTES) {
      throw new MessageTooLongError();
    }

    const bits: number[] = [];

    // 1. Preamble (10101010)
    bits.push(...PREAMBLE);

    // 2. Start Marker (11111111)
    bits.push(...START_MARKER);

    // 3. Data Length (8 bits, MSB first)
    bits.push(...this.byteToBits(bytes.length));

    // 4. Data Body
    for (const byte of bytes) {
      bits.push(...this.byteToBits(byte));
    }

    // 5. Checksum (XOR of all data bytes)
    const checksum = this.calculateChecksum(bytes);
    bits.push(...this.byteToBits(checksum));

    return bits;
  }

  /**
   * Decode a bit array to a message string
   * @param bits Array of bits (0 or 1)
   * @returns Decoded message string, or null if decoding fails
   */
  static decode(bits: number[]): string | null {
    // Find start marker (8 consecutive 1s)
    const markerIndex = this.findStartMarker(bits);
    if (markerIndex === -1) {
      return null;
    }

    const dataStart = markerIndex + 8;

    // Read data length
    const lengthBits = bits.slice(dataStart, dataStart + 8);
    if (lengthBits.length < 8) {
      return null;
    }
    const dataLength = this.bitsToNumber(lengthBits);

    // Validate data length
    if (dataLength > MAX_MESSAGE_BYTES || dataLength === 0) {
      return null;
    }

    // Read data bytes
    const dataBytes: number[] = [];
    let bitIndex = dataStart + 8;

    for (let i = 0; i < dataLength; i++) {
      const byteBits = bits.slice(bitIndex, bitIndex + 8);
      if (byteBits.length < 8) {
        return null;
      }
      dataBytes.push(this.bitsToNumber(byteBits));
      bitIndex += 8;
    }

    // Read checksum
    const checksumBits = bits.slice(bitIndex, bitIndex + 8);
    if (checksumBits.length < 8) {
      return null;
    }
    const receivedChecksum = this.bitsToNumber(checksumBits);

    // Verify checksum
    const calculatedChecksum = this.calculateChecksum(new Uint8Array(dataBytes));
    if (receivedChecksum !== calculatedChecksum) {
      return null;
    }

    // Decode UTF-8
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      return decoder.decode(new Uint8Array(dataBytes));
    } catch {
      return null;
    }
  }

  /**
   * Calculate the minimum number of bits needed to transmit a message
   * @param message The message
   * @returns Number of bits (excluding preamble and marker)
   */
  static calculateBitCount(message: string): number {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(message);
    // Preamble(8) + Marker(8) + Length(8) + Data(N*8) + Checksum(8)
    return 8 + 8 + 8 + bytes.length * 8 + 8;
  }

  /**
   * Get the byte length of a message when encoded as UTF-8
   * @param message The message
   * @returns Byte length
   */
  static getByteLength(message: string): number {
    const encoder = new TextEncoder();
    return encoder.encode(message).length;
  }

  /**
   * Check if a message can be encoded (within size limit)
   * @param message The message
   * @returns true if message can be encoded
   */
  static canEncode(message: string): boolean {
    return this.getByteLength(message) <= MAX_MESSAGE_BYTES;
  }

  /**
   * Convert a byte to an array of 8 bits (MSB first)
   */
  private static byteToBits(byte: number): number[] {
    const bits: number[] = [];
    for (let i = 7; i >= 0; i--) {
      bits.push((byte >> i) & 1);
    }
    return bits;
  }

  /**
   * Convert an array of bits to a number
   */
  private static bitsToNumber(bits: number[]): number {
    return bits.reduce((acc, bit) => (acc << 1) | bit, 0);
  }

  /**
   * Calculate XOR checksum of bytes
   */
  private static calculateChecksum(bytes: Uint8Array): number {
    let checksum = 0;
    for (const byte of bytes) {
      checksum ^= byte;
    }
    return checksum;
  }

  /**
   * Find the start marker (8 consecutive 1s) in the bit array
   * @returns Index of start marker, or -1 if not found
   */
  private static findStartMarker(bits: number[]): number {
    for (let i = 0; i <= bits.length - 8; i++) {
      let allOnes = true;
      for (let j = 0; j < 8; j++) {
        if (bits[i + j] !== 1) {
          allOnes = false;
          break;
        }
      }
      if (allOnes) {
        return i;
      }
    }
    return -1;
  }
}

/**
 * Grid Protocol
 *
 * Special protocol for grid channel that uses byte-level framing.
 * Frame structure:
 *   [Length 1byte] → [Data N bytes] → [XOR Checksum 1byte]
 *
 * Each frame carries 2 bytes (16 bits = 4×4 grid)
 */
export class GridProtocol {
  /**
   * Encode a message to grid frames
   * @param message The message to encode
   * @returns Array of grid frames (each frame is 2 bytes = 16 bits)
   */
  static encode(message: string): number[][] {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);

    if (data.length > MAX_MESSAGE_BYTES) {
      throw new MessageTooLongError();
    }

    // Build payload: [length][data...][checksum]
    const payload: number[] = [data.length];
    for (const byte of data) {
      payload.push(byte);
    }
    const checksum = this.calculateChecksum(data);
    payload.push(checksum);

    // Pad to even length
    if (payload.length % 2 !== 0) {
      payload.push(0x00);
    }

    // Split into 2-byte frames (16 bits each)
    const frames: number[][] = [];
    for (let i = 0; i < payload.length; i += 2) {
      frames.push([payload[i], payload[i + 1]]);
    }

    return frames;
  }

  /**
   * Decode grid frames to a message
   * @param frames Array of grid frames
   * @returns Decoded message string, or null if decoding fails
   */
  static decode(frames: number[][]): string | null {
    if (frames.length === 0) {
      return null;
    }

    // Flatten frames to bytes
    const bytes: number[] = [];
    for (const frame of frames) {
      bytes.push(frame[0], frame[1]);
    }

    // Read length
    const dataLength = bytes[0];
    if (dataLength === 0 || dataLength > MAX_MESSAGE_BYTES) {
      return null;
    }

    // Check if we have enough bytes
    // Minimum: length(1) + data(N) + checksum(1) = N+2, padded to even
    const minBytes = dataLength + 2;
    const expectedBytes = minBytes % 2 === 0 ? minBytes : minBytes + 1;
    if (bytes.length < expectedBytes) {
      return null;
    }

    // Extract data
    const data = bytes.slice(1, 1 + dataLength);

    // Verify checksum
    const receivedChecksum = bytes[1 + dataLength];
    const calculatedChecksum = this.calculateChecksum(new Uint8Array(data));
    if (receivedChecksum !== calculatedChecksum) {
      return null;
    }

    // Decode UTF-8
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      return decoder.decode(new Uint8Array(data));
    } catch {
      return null;
    }
  }

  /**
   * Convert a 2-byte frame to 16 grid cell values
   * @param frame [highByte, lowByte]
   * @returns Array of 16 bits (cell values)
   */
  static frameToCells(frame: number[]): number[] {
    const [highByte, lowByte] = frame;
    const cells: number[] = [];

    // High byte → cells 0-7
    for (let i = 7; i >= 0; i--) {
      cells.push((highByte >> i) & 1);
    }

    // Low byte → cells 8-15
    for (let i = 7; i >= 0; i--) {
      cells.push((lowByte >> i) & 1);
    }

    return cells;
  }

  /**
   * Convert 16 grid cell values to a 2-byte frame
   * @param cells Array of 16 bits
   * @returns [highByte, lowByte]
   */
  static cellsToFrame(cells: number[]): number[] {
    let highByte = 0;
    let lowByte = 0;

    // Cells 0-7 → high byte
    for (let i = 0; i < 8; i++) {
      highByte = (highByte << 1) | (cells[i] ? 1 : 0);
    }

    // Cells 8-15 → low byte
    for (let i = 8; i < 16; i++) {
      lowByte = (lowByte << 1) | (cells[i] ? 1 : 0);
    }

    return [highByte, lowByte];
  }

  /**
   * Calculate XOR checksum
   */
  private static calculateChecksum(bytes: Uint8Array): number {
    let checksum = 0;
    for (const byte of bytes) {
      checksum ^= byte;
    }
    return checksum;
  }
}
