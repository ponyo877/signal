/**
 * Signal - MessageService Tests
 *
 * Unit tests for the MessageService class.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MessageService, resetMessageService } from '../src/application/message-service.js';
import { Store, resetStore } from '../src/application/store.js';
import type { IChannel, ChannelConfig, IVisualizer, ReceiverCallbacks } from '../src/types/index.js';

// Mock the channels module
vi.mock('../src/channels/index.js', () => ({
  createChannel: vi.fn(),
}));

import { createChannel } from '../src/channels/index.js';

const mockCreateChannel = vi.mocked(createChannel);

/**
 * Create a mock channel for testing
 */
function createMockChannel(id: string = 'ultrasonic'): IChannel & { setCallbacks: (cb: ReceiverCallbacks) => void } {
  const mockVisualizer: IVisualizer = {
    draw: vi.fn(),
    getPreferredHeight: vi.fn().mockReturnValue('collapsed'),
  };

  const config: ChannelConfig = {
    id: id as 'ultrasonic',
    name: `Mock ${id}`,
    description: `Mock ${id} channel`,
    icon: 'M',
    pilotMs: 500,
    gapMs: 200,
    bitMs: 100,
    theoreticalBps: 10,
  };

  let callbacks: ReceiverCallbacks | null = null;
  let receiving = false;
  let sending = false;

  return {
    config,
    send: vi.fn().mockImplementation(async () => {
      sending = true;
      await new Promise((resolve) => setTimeout(resolve, 10));
      sending = false;
    }),
    startReceive: vi.fn().mockImplementation(async () => {
      receiving = true;
    }),
    stopReceive: vi.fn().mockImplementation(() => {
      receiving = false;
    }),
    getVisualizer: vi.fn().mockReturnValue(mockVisualizer),
    isReceiving: vi.fn().mockImplementation(() => receiving),
    isSending: vi.fn().mockImplementation(() => sending),
    setCallbacks: vi.fn().mockImplementation((cb: ReceiverCallbacks) => {
      callbacks = cb;
    }),
  };
}

describe('MessageService', () => {
  let store: Store;
  let service: MessageService;
  let mockChannel: ReturnType<typeof createMockChannel>;

  beforeEach(() => {
    resetStore();
    resetMessageService();
    store = new Store();
    mockChannel = createMockChannel('ultrasonic');
    mockCreateChannel.mockReturnValue(mockChannel);
    service = new MessageService(store);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('switchChannel', () => {
    it('should update store with new channel', async () => {
      await service.switchChannel('audible');

      expect(store.getState().currentChannel).toBe('audible');
    });

    it('should set transceiver state to idle when not receiving', async () => {
      store.setTransceiverState('sending');

      await service.switchChannel('audible');

      expect(store.getState().transceiverState).toBe('idle');
    });

    it('should set receiver status to idle', async () => {
      store.setReceiverStatus({ state: 'receiving', progress: 50 });

      await service.switchChannel('audible');

      expect(store.getState().receiverStatus).toEqual({ state: 'idle' });
    });

    it('should stop receiving when switching channels', async () => {
      // Start receiving first
      await service.startReceive();
      expect(mockChannel.isReceiving()).toBe(true);

      // Switch channel
      const newMockChannel = createMockChannel('audible');
      mockCreateChannel.mockReturnValue(newMockChannel);

      await service.switchChannel('audible');

      expect(mockChannel.stopReceive).toHaveBeenCalled();
    });

    it('should restart receiving if was receiving before switch', async () => {
      // Start receiving
      await service.startReceive();
      expect(store.getState().transceiverState).toBe('receiving');

      // Create new mock channel for audible
      const newMockChannel = createMockChannel('audible');
      mockCreateChannel.mockReturnValue(newMockChannel);

      await service.switchChannel('audible');

      // Should have started receiving on new channel
      expect(newMockChannel.startReceive).toHaveBeenCalled();
    });
  });

  describe('send', () => {
    it('should add sent message to store on success', async () => {
      const message = 'Hello, World!';

      await service.send(message);

      const messages = store.getState().messages;
      // System messages: "送信中..." + "送信完了" + sent message
      expect(messages).toHaveLength(3);
      expect(messages.some((m) => m.direction === 'sent' && m.content === message)).toBe(true);
    });

    it('should call channel.send with the message', async () => {
      const message = 'Test message';

      await service.send(message);

      expect(mockChannel.send).toHaveBeenCalledWith(message);
    });

    it('should update transceiver state during send', async () => {
      const sendPromise = service.send('Test');

      // State should be sending during the operation
      expect(store.getState().transceiverState).toBe('sending');

      await sendPromise;

      // State should be idle after completion
      expect(store.getState().transceiverState).toBe('idle');
    });

    it('should clear input after successful send', async () => {
      store.setInputText('Some text');

      await service.send('Test');

      expect(store.getState().inputText).toBe('');
    });

    it('should throw error if already sending', async () => {
      // Mock isSending to return true
      mockChannel.isSending = vi.fn().mockReturnValue(true);

      await expect(service.send('Test')).rejects.toThrow('Already sending');
    });

    it('should stop receiving before sending and resume after', async () => {
      // Start receiving first
      await service.startReceive();
      expect(mockChannel.isReceiving()).toBe(true);

      // Reset the mock to track new calls
      vi.mocked(mockChannel.stopReceive).mockClear();
      vi.mocked(mockChannel.startReceive).mockClear();

      await service.send('Test');

      // Should have stopped receiving before sending
      expect(mockChannel.stopReceive).toHaveBeenCalled();
      // Should have resumed receiving after sending
      expect(mockChannel.startReceive).toHaveBeenCalled();
    });

    it('should add error message on send failure', async () => {
      const error = new Error('Send failed');
      mockChannel.send = vi.fn().mockRejectedValue(error);

      await expect(service.send('Test')).rejects.toThrow('Send failed');

      const messages = store.getState().messages;
      expect(messages.some((m) => m.direction === 'system' && m.content.includes('送信エラー'))).toBe(
        true
      );
    });

    it('should set transceiver state to idle on error', async () => {
      mockChannel.send = vi.fn().mockRejectedValue(new Error('Failed'));

      await expect(service.send('Test')).rejects.toThrow();

      expect(store.getState().transceiverState).toBe('idle');
    });
  });

  describe('startReceive', () => {
    it('should set transceiver state to receiving', async () => {
      await service.startReceive();

      expect(store.getState().transceiverState).toBe('receiving');
    });

    it('should call channel.startReceive', async () => {
      await service.startReceive();

      expect(mockChannel.startReceive).toHaveBeenCalled();
    });

    it('should add system message about receiving', async () => {
      await service.startReceive();

      const messages = store.getState().messages;
      expect(messages.some((m) => m.direction === 'system' && m.content.includes('受信開始'))).toBe(
        true
      );
    });

    it('should not start if already receiving', async () => {
      await service.startReceive();
      vi.mocked(mockChannel.startReceive).mockClear();

      await service.startReceive();

      expect(mockChannel.startReceive).not.toHaveBeenCalled();
    });

    it('should expand signal panel for visual channels', async () => {
      store.setChannel('brightness');

      await service.startReceive();

      expect(store.getState().signalPanelState).toBe('expanded');
    });

    it('should open signal panel for audio channels', async () => {
      store.setChannel('ultrasonic');

      await service.startReceive();

      expect(store.getState().signalPanelState).toBe('open');
    });

    it('should set transceiver state to idle on error', async () => {
      mockChannel.startReceive = vi.fn().mockRejectedValue(new Error('Permission denied'));

      await expect(service.startReceive()).rejects.toThrow();

      expect(store.getState().transceiverState).toBe('idle');
    });

    it('should add error message on failure', async () => {
      mockChannel.startReceive = vi.fn().mockRejectedValue(new Error('Permission denied'));

      await expect(service.startReceive()).rejects.toThrow();

      const messages = store.getState().messages;
      expect(
        messages.some((m) => m.direction === 'system' && m.content.includes('受信開始エラー'))
      ).toBe(true);
    });
  });

  describe('stopReceive', () => {
    it('should set transceiver state to idle', async () => {
      await service.startReceive();

      service.stopReceive();

      expect(store.getState().transceiverState).toBe('idle');
    });

    it('should call channel.stopReceive', async () => {
      await service.startReceive();

      service.stopReceive();

      expect(mockChannel.stopReceive).toHaveBeenCalled();
    });

    it('should set receiver status to idle', async () => {
      await service.startReceive();
      store.setReceiverStatus({ state: 'receiving', progress: 50 });

      service.stopReceive();

      expect(store.getState().receiverStatus).toEqual({ state: 'idle' });
    });

    it('should collapse signal panel', async () => {
      await service.startReceive();

      service.stopReceive();

      expect(store.getState().signalPanelState).toBe('collapsed');
    });

    it('should add system message', async () => {
      await service.startReceive();

      service.stopReceive();

      const messages = store.getState().messages;
      expect(messages.some((m) => m.direction === 'system' && m.content.includes('受信停止'))).toBe(
        true
      );
    });

    it('should not stop if not receiving', async () => {
      service.stopReceive();

      expect(mockChannel.stopReceive).not.toHaveBeenCalled();
    });
  });

  describe('toggleReceive', () => {
    it('should start receiving when idle', async () => {
      await service.toggleReceive();

      expect(store.getState().transceiverState).toBe('receiving');
      expect(mockChannel.startReceive).toHaveBeenCalled();
    });

    it('should stop receiving when active', async () => {
      await service.startReceive();
      vi.mocked(mockChannel.stopReceive).mockClear();

      await service.toggleReceive();

      expect(store.getState().transceiverState).toBe('idle');
      expect(mockChannel.stopReceive).toHaveBeenCalled();
    });
  });

  describe('getVisualizer', () => {
    it('should return channel visualizer', () => {
      const visualizer = service.getVisualizer();

      expect(mockChannel.getVisualizer).toHaveBeenCalled();
      expect(visualizer).toBeDefined();
    });
  });

  describe('isSending', () => {
    it('should return channel isSending status', () => {
      mockChannel.isSending = vi.fn().mockReturnValue(true);

      expect(service.isSending()).toBe(true);
    });
  });

  describe('isReceiving', () => {
    it('should return channel isReceiving status', async () => {
      await service.startReceive();

      expect(service.isReceiving()).toBe(true);
    });
  });

  describe('dispose', () => {
    it('should stop all receiving channels', async () => {
      await service.startReceive();

      service.dispose();

      expect(mockChannel.stopReceive).toHaveBeenCalled();
    });

    it('should clear channels map', async () => {
      await service.startReceive();

      service.dispose();

      // After dispose, a new channel should be created
      mockCreateChannel.mockClear();
      service.getVisualizer();

      expect(mockCreateChannel).toHaveBeenCalled();
    });
  });

  describe('channel callbacks', () => {
    it('should setup callbacks when channel is created', async () => {
      await service.startReceive();

      expect(mockChannel.setCallbacks).toHaveBeenCalled();
    });
  });
});
