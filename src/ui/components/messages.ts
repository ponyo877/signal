/**
 * Signal - Messages Component
 *
 * Displays chat messages (sent, received, system).
 */

import type { ChatMessage, ChannelId } from '../../types/index.js';
import { CHANNEL_CONFIGS } from '../../constants/index.js';

/**
 * Format timestamp for display
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get channel icon
 */
function getChannelIcon(channelId: ChannelId | undefined): string {
  if (!channelId) return '';
  return CHANNEL_CONFIGS[channelId]?.icon ?? '';
}

/**
 * Create a single message element
 */
function createMessageElement(message: ChatMessage): HTMLElement {
  const element = document.createElement('div');
  element.className = `signal-message signal-message--${message.direction}`;
  element.dataset.id = message.id;

  if (message.direction === 'system') {
    element.textContent = message.content;
  } else {
    const content = document.createElement('div');
    content.className = 'signal-message__content';
    content.textContent = message.content;

    const meta = document.createElement('div');
    meta.className = 'signal-message__meta';

    const channelIcon = getChannelIcon(message.channel);
    const time = formatTime(message.timestamp);
    meta.textContent = channelIcon ? `${channelIcon} ${time}` : time;

    element.appendChild(content);
    element.appendChild(meta);
  }

  return element;
}

/**
 * Messages Component
 */
export class MessagesArea {
  private container: HTMLElement;
  private messageIds: Set<string> = new Set();

  constructor() {
    this.container = document.createElement('section');
    this.container.className = 'signal-messages';
  }

  /**
   * Get the container element
   */
  getElement(): HTMLElement {
    return this.container;
  }

  /**
   * Add a message
   */
  addMessage(message: ChatMessage): void {
    if (this.messageIds.has(message.id)) {
      return;
    }

    this.messageIds.add(message.id);
    const element = createMessageElement(message);
    this.container.appendChild(element);
    this.scrollToBottom();
  }

  /**
   * Update all messages
   */
  updateMessages(messages: ChatMessage[]): void {
    // Add only new messages
    for (const message of messages) {
      this.addMessage(message);
    }
  }

  /**
   * Clear all messages
   */
  clear(): void {
    this.container.innerHTML = '';
    this.messageIds.clear();
  }

  /**
   * Scroll to bottom
   */
  scrollToBottom(): void {
    this.container.scrollTop = this.container.scrollHeight;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.container.remove();
  }
}

/**
 * Create messages area instance
 */
export function createMessagesArea(): MessagesArea {
  return new MessagesArea();
}
