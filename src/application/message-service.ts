/**
 * Signal - Message Service
 *
 * Coordinates sending and receiving messages through channels.
 * Manages channel lifecycle and state transitions.
 */

import type { IChannel, ChannelId, ReceiverCallbacks } from '../types/index.js';
import { Store } from './store.js';
import { createChannel } from '../channels/index.js';

/**
 * Message Service
 *
 * Handles the high-level message flow:
 * - Channel creation and switching
 * - Send/receive coordination
 * - Error handling and recovery
 */
export class MessageService {
  private store: Store;
  private channels: Map<ChannelId, IChannel>;
  private currentChannel: IChannel | null = null;

  constructor(store: Store) {
    this.store = store;
    this.channels = new Map();
  }

  /**
   * Get or create a channel instance
   */
  private getChannel(id: ChannelId): IChannel {
    let channel = this.channels.get(id);
    if (!channel) {
      channel = createChannel(id);
      this.setupChannelCallbacks(channel);
      this.channels.set(id, channel);
    }
    return channel;
  }

  /**
   * Setup callbacks for a channel
   */
  private setupChannelCallbacks(channel: IChannel): void {
    const callbacks: ReceiverCallbacks = {
      onMessage: (message) => {
        this.store.addReceivedMessage(message, channel.config.id);
        this.store.addSystemMessage(`受信完了: ${message.length}文字`);
      },
      onError: (error) => {
        this.store.addSystemMessage(`エラー: ${error.message}`);
        this.store.setReceiverStatus({ state: 'error', message: error.message });
      },
      onStatusChange: (status) => {
        this.store.setReceiverStatus(status);
      },
    };

    // Set callbacks if channel supports it
    if ('setCallbacks' in channel && typeof channel.setCallbacks === 'function') {
      (channel as { setCallbacks: (cb: ReceiverCallbacks) => void }).setCallbacks(callbacks);
    }
  }

  /**
   * Switch to a different channel
   */
  async switchChannel(id: ChannelId): Promise<void> {
    const state = this.store.getState();

    // Stop current channel if receiving
    if (this.currentChannel?.isReceiving()) {
      this.currentChannel.stopReceive();
    }

    // Update state
    this.store.setChannel(id);
    this.store.setTransceiverState('idle');
    this.store.setReceiverStatus({ state: 'idle' });

    // Get new channel
    this.currentChannel = this.getChannel(id);

    // If was receiving before, start receiving on new channel
    if (state.transceiverState === 'receiving') {
      await this.startReceive();
    }
  }

  /**
   * Send a message on the current channel
   */
  async send(message: string): Promise<void> {
    const state = this.store.getState();
    const channel = this.getChannel(state.currentChannel);

    if (channel.isSending()) {
      throw new Error('Already sending');
    }

    // Stop receiving if active
    const wasReceiving = channel.isReceiving();
    if (wasReceiving) {
      channel.stopReceive();
    }

    this.store.setTransceiverState('sending');
    this.store.addSystemMessage(`送信中...`);

    try {
      await channel.send(message);
      this.store.addSentMessage(message, state.currentChannel);
      this.store.addSystemMessage(`送信完了: ${message.length}文字`);
      this.store.clearInput();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.store.addSystemMessage(`送信エラー: ${errorMessage}`);
      throw error;
    } finally {
      this.store.setTransceiverState('idle');

      // Resume receiving if was active
      if (wasReceiving) {
        await this.startReceive();
      }
    }
  }

  /**
   * Start receiving on the current channel
   */
  async startReceive(): Promise<void> {
    const state = this.store.getState();
    const channel = this.getChannel(state.currentChannel);

    if (channel.isReceiving()) {
      return;
    }

    this.store.setTransceiverState('receiving');
    this.store.addSystemMessage(`${channel.config.name}チャネルで受信開始`);

    // Expand signal panel for visual channels
    if (['brightness', 'color', 'grid', 'qr'].includes(state.currentChannel)) {
      this.store.setSignalPanelState('expanded');
    } else {
      this.store.setSignalPanelState('open');
    }

    try {
      await channel.startReceive();
      this.currentChannel = channel;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.store.addSystemMessage(`受信開始エラー: ${errorMessage}`);
      this.store.setTransceiverState('idle');
      throw error;
    }
  }

  /**
   * Stop receiving
   */
  stopReceive(): void {
    const state = this.store.getState();
    const channel = this.getChannel(state.currentChannel);

    if (!channel.isReceiving()) {
      return;
    }

    channel.stopReceive();
    this.store.setTransceiverState('idle');
    this.store.setReceiverStatus({ state: 'idle' });
    this.store.setSignalPanelState('collapsed');
    this.store.addSystemMessage('受信停止');
  }

  /**
   * Toggle receiving state
   */
  async toggleReceive(): Promise<void> {
    const state = this.store.getState();
    const channel = this.getChannel(state.currentChannel);

    if (channel.isReceiving()) {
      this.stopReceive();
    } else {
      await this.startReceive();
    }
  }

  /**
   * Get current channel's visualizer
   */
  getVisualizer() {
    const state = this.store.getState();
    const channel = this.getChannel(state.currentChannel);
    return channel.getVisualizer();
  }

  /**
   * Check if any channel is sending
   */
  isSending(): boolean {
    const state = this.store.getState();
    const channel = this.getChannel(state.currentChannel);
    return channel.isSending();
  }

  /**
   * Check if any channel is receiving
   */
  isReceiving(): boolean {
    const state = this.store.getState();
    const channel = this.getChannel(state.currentChannel);
    return channel.isReceiving();
  }

  /**
   * Cleanup all channels
   */
  dispose(): void {
    for (const channel of this.channels.values()) {
      if (channel.isReceiving()) {
        channel.stopReceive();
      }
    }
    this.channels.clear();
    this.currentChannel = null;
  }
}

/**
 * Global message service instance
 */
let globalService: MessageService | null = null;

/**
 * Get or create global message service
 */
export function getMessageService(store: Store): MessageService {
  if (!globalService) {
    globalService = new MessageService(store);
  }
  return globalService;
}

/**
 * Reset global message service (for testing)
 */
export function resetMessageService(): void {
  if (globalService) {
    globalService.dispose();
    globalService = null;
  }
}
