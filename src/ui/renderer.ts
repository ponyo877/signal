/**
 * Signal - Renderer
 *
 * Orchestrates UI components and manages rendering.
 */

import type { AppState, ChannelId } from '../types/index.js';
import { Store } from '../application/store.js';
import { MessageService } from '../application/message-service.js';
import { injectStyles } from './styles.js';
import { logger } from '../utils/index.js';
import {
  createHeader,
  createChannelCards,
  updateActiveChannel,
  createSignalPanel,
  createControlArea,
  createMessagesArea,
} from './components/index.js';
import type { SignalPanel, ControlArea, MessagesArea } from './components/index.js';

/**
 * App Renderer
 *
 * Creates and manages all UI components.
 */
export class AppRenderer {
  private store: Store;
  private messageService: MessageService;
  private container: HTMLElement;

  // Components
  private channelCardsContainer: HTMLElement | null = null;
  private signalPanel: SignalPanel | null = null;
  private controlArea: ControlArea | null = null;
  private messagesArea: MessagesArea | null = null;

  // State
  private unsubscribe: (() => void) | null = null;

  constructor(store: Store, messageService: MessageService, container: HTMLElement) {
    this.store = store;
    this.messageService = messageService;
    this.container = container;
  }

  /**
   * Initialize and render the app
   */
  render(): void {
    // Inject styles
    injectStyles();

    // Create app container
    this.container.className = 'signal-app';
    this.container.innerHTML = '';

    // Create components
    const header = createHeader();

    this.channelCardsContainer = createChannelCards(
      this.store.getState().currentChannel,
      (channel) => this.handleChannelSelect(channel)
    );

    this.signalPanel = createSignalPanel();
    this.messagesArea = createMessagesArea();

    this.controlArea = createControlArea({
      onSend: (message) => this.handleSend(message),
      onToggleReceive: () => this.handleToggleReceive(),
      onInputChange: (text) => this.store.setInputText(text),
    });

    // Append to container
    this.container.appendChild(header);
    this.container.appendChild(this.channelCardsContainer);
    this.container.appendChild(this.signalPanel.getElement());
    this.container.appendChild(this.messagesArea.getElement());
    this.container.appendChild(this.controlArea.getElement());

    // Subscribe to state changes
    this.unsubscribe = this.store.subscribe((state) => this.update(state));

    // Initial update
    this.update(this.store.getState());
  }

  /**
   * Update UI based on state
   */
  private update(state: AppState): void {
    // Update channel cards
    if (this.channelCardsContainer) {
      updateActiveChannel(this.channelCardsContainer, state.currentChannel);
    }

    // Update signal panel
    if (this.signalPanel) {
      this.signalPanel.setState(state.signalPanelState);
      this.signalPanel.updateStatus(state.receiverStatus);

      // Update visualizer
      const visualizer = this.messageService.getVisualizer();
      this.signalPanel.setVisualizer(visualizer);
    }

    // Update control area
    if (this.controlArea) {
      this.controlArea.updateState(state.transceiverState);

      // Sync input if different
      if (this.controlArea.getValue() !== state.inputText) {
        this.controlArea.setValue(state.inputText);
      }
    }

    // Update messages
    if (this.messagesArea) {
      this.messagesArea.updateMessages(state.messages);
    }
  }

  /**
   * Handle channel selection
   */
  private async handleChannelSelect(channel: ChannelId): Promise<void> {
    try {
      await this.messageService.switchChannel(channel);
    } catch (error) {
      logger.error('Failed to switch channel:', error);
    }
  }

  /**
   * Handle send button
   */
  private async handleSend(message: string): Promise<void> {
    try {
      await this.messageService.send(message);
    } catch (error) {
      logger.error('Failed to send message:', error);
    }
  }

  /**
   * Handle receive toggle
   */
  private async handleToggleReceive(): Promise<void> {
    try {
      await this.messageService.toggleReceive();
    } catch (error) {
      logger.error('Failed to toggle receive:', error);
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    this.signalPanel?.destroy();
    this.controlArea?.destroy();
    this.messagesArea?.destroy();

    this.container.innerHTML = '';
  }
}

/**
 * Create and initialize the app renderer
 */
export function createAppRenderer(
  store: Store,
  messageService: MessageService,
  container: HTMLElement
): AppRenderer {
  const renderer = new AppRenderer(store, messageService, container);
  renderer.render();
  return renderer;
}
