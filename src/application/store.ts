/**
 * Signal - Application Store
 *
 * Central state management using the Observer pattern.
 * Provides reactive state updates for the UI.
 */

import type {
  IStore,
  StateListener,
  AppState,
  ChannelId,
  ChatMessage,
  ReceiverStatus,
  TransceiverState,
  SignalPanelState,
} from '../types/index.js';

/**
 * Create initial application state
 */
function createInitialState(): AppState {
  return {
    currentChannel: 'ultrasonic',
    transceiverState: 'idle',
    signalPanelState: 'collapsed',
    messages: [],
    inputText: '',
    receiverStatus: { state: 'idle' },
  };
}

/**
 * Store Class
 *
 * Implements the Observer pattern for state management.
 * All state changes trigger listener notifications.
 */
export class Store implements IStore<AppState> {
  private state: AppState;
  private listeners: Set<StateListener<AppState>>;

  constructor(initialState?: Partial<AppState>) {
    this.state = { ...createInitialState(), ...initialState };
    this.listeners = new Set();
  }

  /**
   * Get current state (immutable)
   */
  getState(): AppState {
    return this.state;
  }

  /**
   * Update state with an updater function
   */
  setState(updater: (prev: AppState) => AppState): void {
    const newState = updater(this.state);
    if (newState !== this.state) {
      this.state = newState;
      this.notifyListeners();
    }
  }

  /**
   * Subscribe to state changes
   * @returns Unsubscribe function
   */
  subscribe(listener: StateListener<AppState>): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  // ============================================================
  // Convenience Methods
  // ============================================================

  /**
   * Set current channel
   */
  setChannel(channel: ChannelId): void {
    this.setState((prev) => ({
      ...prev,
      currentChannel: channel,
    }));
  }

  /**
   * Set transceiver state
   */
  setTransceiverState(state: TransceiverState): void {
    this.setState((prev) => ({
      ...prev,
      transceiverState: state,
    }));
  }

  /**
   * Set signal panel state
   */
  setSignalPanelState(state: SignalPanelState): void {
    this.setState((prev) => ({
      ...prev,
      signalPanelState: state,
    }));
  }

  /**
   * Set input text
   */
  setInputText(text: string): void {
    this.setState((prev) => ({
      ...prev,
      inputText: text,
    }));
  }

  /**
   * Set receiver status
   */
  setReceiverStatus(status: ReceiverStatus): void {
    this.setState((prev) => ({
      ...prev,
      receiverStatus: status,
    }));
  }

  /**
   * Add a message
   */
  addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): void {
    const newMessage: ChatMessage = {
      ...message,
      id: this.generateId(),
      timestamp: new Date(),
    };

    this.setState((prev) => ({
      ...prev,
      messages: [...prev.messages, newMessage],
    }));
  }

  /**
   * Add a sent message
   */
  addSentMessage(content: string, channel: ChannelId): void {
    this.addMessage({
      direction: 'sent',
      content,
      channel,
    });
  }

  /**
   * Add a received message
   */
  addReceivedMessage(content: string, channel: ChannelId): void {
    this.addMessage({
      direction: 'received',
      content,
      channel,
    });
  }

  /**
   * Add a system message
   */
  addSystemMessage(content: string): void {
    this.addMessage({
      direction: 'system',
      content,
    });
  }

  /**
   * Clear all messages
   */
  clearMessages(): void {
    this.setState((prev) => ({
      ...prev,
      messages: [],
    }));
  }

  /**
   * Clear input text
   */
  clearInput(): void {
    this.setInputText('');
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Create a selector for specific state slice
 */
export function createSelector<T>(
  store: Store,
  selector: (state: AppState) => T
): {
  get: () => T;
  subscribe: (listener: (value: T) => void) => () => void;
} {
  let currentValue = selector(store.getState());

  return {
    get: () => currentValue,
    subscribe: (listener) => {
      return store.subscribe((state) => {
        const newValue = selector(state);
        if (newValue !== currentValue) {
          currentValue = newValue;
          listener(newValue);
        }
      });
    },
  };
}

/**
 * Global store instance
 */
let globalStore: Store | null = null;

/**
 * Get or create global store instance
 */
export function getStore(): Store {
  if (!globalStore) {
    globalStore = new Store();
  }
  return globalStore;
}

/**
 * Reset global store (for testing)
 */
export function resetStore(): void {
  globalStore = null;
}
