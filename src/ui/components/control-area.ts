/**
 * Signal - Control Area Component
 *
 * Input field, send button, and receive toggle.
 */

import type { TransceiverState } from '../../types/index.js';
import { getIcon } from '../icons.js';

export interface ControlAreaCallbacks {
  onSend: (message: string) => void;
  onToggleReceive: () => void;
  onInputChange: (text: string) => void;
}

/**
 * Control Area Component
 */
export class ControlArea {
  private container: HTMLElement;
  private input: HTMLInputElement;
  private sendButton: HTMLButtonElement;
  private receiveButton: HTMLButtonElement;
  private callbacks: ControlAreaCallbacks;

  constructor(callbacks: ControlAreaCallbacks) {
    this.callbacks = callbacks;

    this.container = document.createElement('section');
    this.container.className = 'signal-controls';

    // Input row
    const inputRow = document.createElement('div');
    inputRow.className = 'signal-controls__input-row';

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className = 'signal-controls__input';
    this.input.placeholder = 'メッセージを入力...';
    this.input.maxLength = 200;

    inputRow.appendChild(this.input);

    // Button row
    const buttonRow = document.createElement('div');
    buttonRow.className = 'signal-controls__button-row';

    this.sendButton = document.createElement('button');
    this.sendButton.type = 'button';
    this.sendButton.className = 'signal-btn signal-btn--primary';
    this.sendButton.innerHTML = `<span class="signal-btn__icon">${getIcon('send')}</span><span>送信</span>`;

    this.receiveButton = document.createElement('button');
    this.receiveButton.type = 'button';
    this.receiveButton.className = 'signal-btn signal-btn--secondary';
    this.receiveButton.innerHTML = `<span class="signal-btn__icon">${getIcon('receive')}</span><span>受信</span>`;

    buttonRow.appendChild(this.sendButton);
    buttonRow.appendChild(this.receiveButton);

    this.container.appendChild(inputRow);
    this.container.appendChild(buttonRow);

    // Event listeners
    this.input.addEventListener('input', () => {
      this.callbacks.onInputChange(this.input.value);
    });

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.input.value.trim()) {
        this.callbacks.onSend(this.input.value.trim());
      }
    });

    this.sendButton.addEventListener('click', () => {
      if (this.input.value.trim()) {
        this.callbacks.onSend(this.input.value.trim());
      }
    });

    this.receiveButton.addEventListener('click', () => {
      this.callbacks.onToggleReceive();
    });
  }

  /**
   * Get the container element
   */
  getElement(): HTMLElement {
    return this.container;
  }

  /**
   * Update state based on transceiver state
   */
  updateState(transceiverState: TransceiverState): void {
    // Update send button
    this.sendButton.disabled = transceiverState === 'sending';
    if (transceiverState === 'sending') {
      this.sendButton.innerHTML = `<span class="signal-btn__icon">${getIcon('loading')}</span><span>送信中...</span>`;
    } else {
      this.sendButton.innerHTML = `<span class="signal-btn__icon">${getIcon('send')}</span><span>送信</span>`;
    }

    // Update receive button
    if (transceiverState === 'receiving') {
      this.receiveButton.classList.add('signal-btn--active');
      this.receiveButton.innerHTML = `<span class="signal-btn__icon">${getIcon('stop')}</span><span>停止</span>`;
    } else {
      this.receiveButton.classList.remove('signal-btn--active');
      this.receiveButton.innerHTML = `<span class="signal-btn__icon">${getIcon('receive')}</span><span>受信</span>`;
    }

    // Disable receive button while sending
    this.receiveButton.disabled = transceiverState === 'sending';
  }

  /**
   * Set input value
   */
  setValue(value: string): void {
    this.input.value = value;
  }

  /**
   * Get input value
   */
  getValue(): string {
    return this.input.value;
  }

  /**
   * Clear input
   */
  clear(): void {
    this.input.value = '';
  }

  /**
   * Focus input
   */
  focus(): void {
    this.input.focus();
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.container.remove();
  }
}

/**
 * Create control area instance
 */
export function createControlArea(callbacks: ControlAreaCallbacks): ControlArea {
  return new ControlArea(callbacks);
}
