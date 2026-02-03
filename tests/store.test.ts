/**
 * Signal - Store Tests
 *
 * Unit tests for the application store.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Store, createSelector, resetStore } from '../src/application/store.js';

describe('Store', () => {
  let store: Store;

  beforeEach(() => {
    resetStore();
    store = new Store();
  });

  describe('getState', () => {
    it('should return initial state', () => {
      const state = store.getState();

      expect(state.currentChannel).toBe('ultrasonic');
      expect(state.transceiverState).toBe('idle');
      expect(state.signalPanelState).toBe('collapsed');
      expect(state.messages).toEqual([]);
      expect(state.inputText).toBe('');
      expect(state.receiverStatus.state).toBe('idle');
    });

    it('should accept initial state overrides', () => {
      const customStore = new Store({ currentChannel: 'audible' });
      expect(customStore.getState().currentChannel).toBe('audible');
    });
  });

  describe('setState', () => {
    it('should update state with updater function', () => {
      store.setState((prev) => ({ ...prev, inputText: 'Hello' }));
      expect(store.getState().inputText).toBe('Hello');
    });

    it('should not notify if state is unchanged', () => {
      const listener = vi.fn();
      store.subscribe(listener);

      store.setState((prev) => prev); // No change

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('should notify listeners on state change', () => {
      const listener = vi.fn();
      store.subscribe(listener);

      store.setChannel('audible');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ currentChannel: 'audible' })
      );
    });

    it('should return unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = store.subscribe(listener);

      unsubscribe();
      store.setChannel('audible');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should support multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      store.subscribe(listener1);
      store.subscribe(listener2);

      store.setChannel('audible');

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('setChannel', () => {
    it('should update current channel', () => {
      store.setChannel('brightness');
      expect(store.getState().currentChannel).toBe('brightness');
    });
  });

  describe('setTransceiverState', () => {
    it('should update transceiver state', () => {
      store.setTransceiverState('sending');
      expect(store.getState().transceiverState).toBe('sending');
    });
  });

  describe('setSignalPanelState', () => {
    it('should update signal panel state', () => {
      store.setSignalPanelState('expanded');
      expect(store.getState().signalPanelState).toBe('expanded');
    });
  });

  describe('setInputText', () => {
    it('should update input text', () => {
      store.setInputText('Test message');
      expect(store.getState().inputText).toBe('Test message');
    });
  });

  describe('setReceiverStatus', () => {
    it('should update receiver status', () => {
      store.setReceiverStatus({ state: 'receiving', progress: 0.5 });
      expect(store.getState().receiverStatus).toEqual({
        state: 'receiving',
        progress: 0.5,
      });
    });
  });

  describe('addMessage', () => {
    it('should add a message with generated id and timestamp', () => {
      store.addMessage({ direction: 'sent', content: 'Hello', channel: 'ultrasonic' });

      const messages = store.getState().messages;
      expect(messages.length).toBe(1);
      expect(messages[0].content).toBe('Hello');
      expect(messages[0].direction).toBe('sent');
      expect(messages[0].id).toBeDefined();
      expect(messages[0].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('addSentMessage', () => {
    it('should add a sent message', () => {
      store.addSentMessage('Hello', 'ultrasonic');

      const messages = store.getState().messages;
      expect(messages[0].direction).toBe('sent');
      expect(messages[0].channel).toBe('ultrasonic');
    });
  });

  describe('addReceivedMessage', () => {
    it('should add a received message', () => {
      store.addReceivedMessage('Hello', 'audible');

      const messages = store.getState().messages;
      expect(messages[0].direction).toBe('received');
      expect(messages[0].channel).toBe('audible');
    });
  });

  describe('addSystemMessage', () => {
    it('should add a system message', () => {
      store.addSystemMessage('Welcome');

      const messages = store.getState().messages;
      expect(messages[0].direction).toBe('system');
      expect(messages[0].content).toBe('Welcome');
    });
  });

  describe('clearMessages', () => {
    it('should remove all messages', () => {
      store.addSystemMessage('Message 1');
      store.addSystemMessage('Message 2');
      store.clearMessages();

      expect(store.getState().messages).toEqual([]);
    });
  });

  describe('clearInput', () => {
    it('should clear input text', () => {
      store.setInputText('Some text');
      store.clearInput();

      expect(store.getState().inputText).toBe('');
    });
  });
});

describe('createSelector', () => {
  let store: Store;

  beforeEach(() => {
    resetStore();
    store = new Store();
  });

  it('should create a selector that returns current value', () => {
    const selector = createSelector(store, (state) => state.currentChannel);
    expect(selector.get()).toBe('ultrasonic');
  });

  it('should notify on selected value change', () => {
    const selector = createSelector(store, (state) => state.currentChannel);
    const listener = vi.fn();

    selector.subscribe(listener);
    store.setChannel('audible');

    expect(listener).toHaveBeenCalledWith('audible');
  });

  it('should not notify if selected value unchanged', () => {
    const selector = createSelector(store, (state) => state.currentChannel);
    const listener = vi.fn();

    selector.subscribe(listener);
    store.setInputText('test'); // Different field

    expect(listener).not.toHaveBeenCalled();
  });
});
