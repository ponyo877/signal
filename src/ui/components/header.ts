/**
 * Signal - Header Component
 *
 * Compact navigation bar style header (fondesk-inspired).
 */

import { getIcon } from '../icons.js';

/**
 * Create header element
 */
export function createHeader(): HTMLElement {
  const header = document.createElement('header');
  header.className = 'signal-header';

  header.innerHTML = `
    <div class="signal-header__logo">
      <span class="signal-header__logo-icon">${getIcon('signal')}</span>
      <span>Signal</span>
    </div>
  `;

  return header;
}
