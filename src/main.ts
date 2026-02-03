/**
 * Signal - Main Entry Point
 *
 * Initializes and starts the Signal application.
 */

import { getStore } from './application/store.js';
import { getMessageService } from './application/message-service.js';
import { createAppRenderer } from './ui/renderer.js';
import { JSQR_CDN_URL, QRCODE_CDN_URL } from './lib/index.js';
import { logger } from './utils/index.js';

/**
 * Load external library script
 */
function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (document.querySelector(`script[src="${url}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    document.head.appendChild(script);
  });
}

/**
 * Load all required external libraries
 */
async function loadExternalLibraries(): Promise<void> {
  try {
    await Promise.all([
      loadScript(QRCODE_CDN_URL),
      loadScript(JSQR_CDN_URL),
    ]);
    logger.debug('External libraries loaded successfully');
  } catch (error) {
    logger.warn('Failed to load some external libraries:', error);
    // Continue anyway - QR features will be unavailable
  }
}

/**
 * Initialize the application
 */
async function initApp(): Promise<void> {
  // Load external libraries
  await loadExternalLibraries();

  // Get or create app container
  let container = document.getElementById('app');
  if (!container) {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
  }

  // Initialize store and service
  const store = getStore();
  const messageService = getMessageService(store);

  // Create and render app
  const renderer = createAppRenderer(store, messageService, container);

  // Add welcome message
  store.addSystemMessage('Signalへようこそ！チャネルを選択して通信を始めましょう。');

  // Expose for debugging in development
  if (typeof window !== 'undefined') {
    (window as unknown as { __signal: unknown }).__signal = {
      store,
      messageService,
      renderer,
    };
  }

  logger.info('Signal app initialized');
}

/**
 * Start the application when DOM is ready
 */
function main(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initApp().catch((error) => logger.error('Failed to initialize app:', error));
    });
  } else {
    initApp().catch((error) => logger.error('Failed to initialize app:', error));
  }
}

// Run main
main();
