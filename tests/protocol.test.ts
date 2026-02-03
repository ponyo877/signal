/**
 * Signal - Protocol Tests
 *
 * Unit tests for the Protocol class.
 */

import { describe, it, expect } from 'vitest';
import { Protocol, GridProtocol } from '../src/domain/protocol.js';

describe('Protocol', () => {
  describe('encode', () => {
    it('should encode a simple ASCII message', () => {
      const message = 'Hi';
      const bits = Protocol.encode(message);

      // Preamble (8) + Marker (8) + Length (8) + Data (2*8) + Checksum (8) = 48 bits
      expect(bits.length).toBe(48);

      // Preamble: 10101010
      expect(bits.slice(0, 8)).toEqual([1, 0, 1, 0, 1, 0, 1, 0]);

      // Start marker: 11111111
      expect(bits.slice(8, 16)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);

      // Length: 2 (00000010)
      expect(bits.slice(16, 24)).toEqual([0, 0, 0, 0, 0, 0, 1, 0]);
    });

    it('should encode a UTF-8 message', () => {
      const message = 'あ'; // 3 bytes in UTF-8
      const bits = Protocol.encode(message);

      // Preamble (8) + Marker (8) + Length (8) + Data (3*8) + Checksum (8) = 56 bits
      expect(bits.length).toBe(56);

      // Length: 3 (00000011)
      expect(bits.slice(16, 24)).toEqual([0, 0, 0, 0, 0, 0, 1, 1]);
    });

    it('should throw for messages exceeding 200 bytes', () => {
      const message = 'a'.repeat(201);
      expect(() => Protocol.encode(message)).toThrow();
    });
  });

  describe('decode', () => {
    it('should decode an encoded message', () => {
      const original = 'Hello, World!';
      const bits = Protocol.encode(original);
      const decoded = Protocol.decode(bits);

      expect(decoded).toBe(original);
    });

    it('should decode a UTF-8 message', () => {
      const original = 'こんにちは';
      const bits = Protocol.encode(original);
      const decoded = Protocol.decode(bits);

      expect(decoded).toBe(original);
    });

    it('should decode with extra leading bits', () => {
      const original = 'Test';
      const bits = Protocol.encode(original);

      // Add random bits before the preamble
      const withLeading = [0, 1, 0, 0, 1, ...bits];
      const decoded = Protocol.decode(withLeading);

      expect(decoded).toBe(original);
    });

    it('should return null for invalid start marker', () => {
      const bits = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      expect(Protocol.decode(bits)).toBeNull();
    });

    it('should return null for checksum error', () => {
      const bits = Protocol.encode('Test');
      // Flip last bit (checksum)
      bits[bits.length - 1] = bits[bits.length - 1] === 0 ? 1 : 0;

      expect(Protocol.decode(bits)).toBeNull();
    });

    it('should return null for empty bits', () => {
      expect(Protocol.decode([])).toBeNull();
    });

    it('should return null for truncated data', () => {
      const bits = Protocol.encode('Hello');
      // Remove last 10 bits
      const truncated = bits.slice(0, -10);

      expect(Protocol.decode(truncated)).toBeNull();
    });
  });

  describe('calculateBitCount', () => {
    it('should calculate correct bit count for ASCII', () => {
      const count = Protocol.calculateBitCount('Hi');
      // Preamble(8) + Marker(8) + Length(8) + Data(2*8) + Checksum(8) = 48
      expect(count).toBe(48);
    });

    it('should calculate correct bit count for UTF-8', () => {
      const count = Protocol.calculateBitCount('あ');
      // Preamble(8) + Marker(8) + Length(8) + Data(3*8) + Checksum(8) = 56
      expect(count).toBe(56);
    });
  });

  describe('getByteLength', () => {
    it('should return ASCII byte length', () => {
      expect(Protocol.getByteLength('Hello')).toBe(5);
    });

    it('should return UTF-8 byte length', () => {
      expect(Protocol.getByteLength('こんにちは')).toBe(15); // 5 characters × 3 bytes
    });
  });

  describe('canEncode', () => {
    it('should return true for valid messages', () => {
      expect(Protocol.canEncode('Hello')).toBe(true);
      expect(Protocol.canEncode('a'.repeat(200))).toBe(true);
    });

    it('should return false for messages exceeding limit', () => {
      expect(Protocol.canEncode('a'.repeat(201))).toBe(false);
    });
  });
});

describe('GridProtocol', () => {
  describe('encode', () => {
    it('should encode a short message', () => {
      const message = 'Hi';
      const frames = GridProtocol.encode(message);

      // Length(1) + Data(2) + Checksum(1) = 4 bytes = 2 frames
      expect(frames.length).toBe(2);
    });

    it('should pad to even byte count', () => {
      const message = 'A'; // 1 byte
      const frames = GridProtocol.encode(message);

      // Length(1) + Data(1) + Checksum(1) = 3 bytes, padded to 4 = 2 frames
      expect(frames.length).toBe(2);
    });
  });

  describe('decode', () => {
    it('should decode an encoded message', () => {
      const original = 'Test Message';
      const frames = GridProtocol.encode(original);
      const decoded = GridProtocol.decode(frames);

      expect(decoded).toBe(original);
    });

    it('should return null for empty frames', () => {
      expect(GridProtocol.decode([])).toBeNull();
    });

    it('should return null for invalid checksum', () => {
      const frames = GridProtocol.encode('Test');
      // Corrupt checksum
      frames[frames.length - 1][1] ^= 0xFF;

      expect(GridProtocol.decode(frames)).toBeNull();
    });
  });

  describe('frameToCells', () => {
    it('should convert frame to 16 cells', () => {
      const frame = [0b10101010, 0b01010101];
      const cells = GridProtocol.frameToCells(frame);

      expect(cells.length).toBe(16);
      expect(cells).toEqual([1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1]);
    });
  });

  describe('cellsToFrame', () => {
    it('should convert 16 cells to frame', () => {
      const cells = [1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1];
      const frame = GridProtocol.cellsToFrame(cells);

      expect(frame).toEqual([0b10101010, 0b01010101]);
    });

    it('should round-trip correctly', () => {
      const original = [0b11110000, 0b00001111];
      const cells = GridProtocol.frameToCells(original);
      const restored = GridProtocol.cellsToFrame(cells);

      expect(restored).toEqual(original);
    });
  });
});
