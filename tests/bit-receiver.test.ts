/**
 * Signal - Bit Receiver Tests
 *
 * Unit tests for the BitReceiver state machine.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ManualBitReceiver } from '../src/domain/bit-receiver.js';
import type { ReceiverCallbacks, ReceiverStatus } from '../src/types/index.js';

describe('ManualBitReceiver', () => {
  let receiver: ManualBitReceiver;
  let callbacks: ReceiverCallbacks;
  let receivedMessages: string[];
  let statusChanges: ReceiverStatus[];
  let errors: Array<{ type: string; message: string }>;

  beforeEach(() => {
    receivedMessages = [];
    statusChanges = [];
    errors = [];

    callbacks = {
      onMessage: (message) => receivedMessages.push(message),
      onStatusChange: (status) => statusChanges.push(status),
      onError: (error) => errors.push(error),
    };

    receiver = new ManualBitReceiver(callbacks);
  });

  describe('state transitions', () => {
    it('should start in idle state', () => {
      expect(receiver.getState()).toBe('idle');
    });

    it('should transition from idle to pilot on pilot detection', () => {
      receiver.processPilotDetected(true);
      expect(receiver.getState()).toBe('pilot');
      expect(statusChanges).toContainEqual({ state: 'pilot' });
    });

    it('should transition from pilot to gap when pilot ends', () => {
      receiver.processPilotDetected(true);
      receiver.processPilotDetected(false);
      expect(receiver.getState()).toBe('gap');
      expect(statusChanges).toContainEqual({ state: 'gap' });
    });

    it('should transition from gap to bits', () => {
      receiver.processPilotDetected(true);
      receiver.processPilotDetected(false);
      receiver.startBitCollection();
      expect(receiver.getState()).toBe('bits');
    });

    it('should not transition from idle on pilot false', () => {
      receiver.processPilotDetected(false);
      expect(receiver.getState()).toBe('idle');
    });
  });

  describe('bit collection', () => {
    beforeEach(() => {
      // Move to bits state
      receiver.processPilotDetected(true);
      receiver.processPilotDetected(false);
      receiver.startBitCollection();
    });

    it('should collect bits', () => {
      receiver.addBit(1);
      receiver.addBit(0);
      receiver.addBit(1);

      expect(receiver.getBits()).toEqual([1, 0, 1]);
    });

    it('should clear bits on startBitCollection', () => {
      receiver.addBit(1);
      receiver.addBit(0);
      receiver.reset();
      receiver.processPilotDetected(true);
      receiver.processPilotDetected(false);
      receiver.startBitCollection();

      expect(receiver.getBits()).toEqual([]);
    });

    it('should report receiving progress', () => {
      expect(statusChanges).toContainEqual({ state: 'receiving', progress: 0 });
    });
  });

  describe('reset', () => {
    it('should reset to idle state', () => {
      receiver.processPilotDetected(true);
      receiver.processPilotDetected(false);
      receiver.startBitCollection();
      receiver.addBit(1);

      receiver.reset();

      expect(receiver.getState()).toBe('idle');
      expect(receiver.getBits()).toEqual([]);
    });

    it('should notify idle status on reset', () => {
      receiver.processPilotDetected(true);
      receiver.reset();

      const lastStatus = statusChanges[statusChanges.length - 1];
      expect(lastStatus.state).toBe('idle');
    });
  });

  describe('decode attempt', () => {
    it('should call onMessage on successful decode', () => {
      // Prepare a valid encoded message
      // Preamble + Marker + Length(1) + 'A'(0x41) + Checksum
      const bits = [
        // Preamble: 10101010
        1, 0, 1, 0, 1, 0, 1, 0,
        // Start marker: 11111111
        1, 1, 1, 1, 1, 1, 1, 1,
        // Length: 1 (00000001)
        0, 0, 0, 0, 0, 0, 0, 1,
        // Data: 'A' = 0x41 (01000001)
        0, 1, 0, 0, 0, 0, 0, 1,
        // Checksum: 0x41 (01000001)
        0, 1, 0, 0, 0, 0, 0, 1,
      ];

      receiver.processPilotDetected(true);
      receiver.processPilotDetected(false);
      receiver.startBitCollection();

      for (const bit of bits) {
        receiver.addBit(bit as 0 | 1);
      }

      receiver.tryDecode();

      expect(receivedMessages).toContain('A');
      expect(receiver.getState()).toBe('idle');
    });

    it('should call onError on decode failure', () => {
      // Invalid bits
      receiver.processPilotDetected(true);
      receiver.processPilotDetected(false);
      receiver.startBitCollection();

      // Add some invalid data
      for (let i = 0; i < 40; i++) {
        receiver.addBit((i % 2) as 0 | 1);
      }

      receiver.tryDecode();

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].type).toBe('checksum');
    });
  });

  describe('clearBits', () => {
    it('should clear collected bits without changing state', () => {
      receiver.processPilotDetected(true);
      receiver.processPilotDetected(false);
      receiver.startBitCollection();
      receiver.addBit(1);
      receiver.addBit(0);

      receiver.clearBits();

      expect(receiver.getBits()).toEqual([]);
      expect(receiver.getState()).toBe('bits');
    });
  });
});

describe('BitReceiver integration', () => {
  // These tests would require mocking requestAnimationFrame
  // and performance.now(), which is more complex.
  // For now, we focus on the ManualBitReceiver tests above.

  it('should be importable', async () => {
    const { BitReceiver } = await import('../src/domain/bit-receiver.js');
    expect(BitReceiver).toBeDefined();
  });
});
