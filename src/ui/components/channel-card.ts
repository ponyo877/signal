/**
 * Signal - Channel Card Component
 *
 * Displays channel selection cards in a grid layout.
 */

import type { ChannelId, ChannelConfig } from '../../types/index.js';
import { CHANNEL_CONFIGS } from '../../constants/index.js';
import { getIcon, type IconName } from '../icons.js';

/**
 * Format channel speed for display
 */
function formatSpeed(config: ChannelConfig): string {
  if (config.theoreticalBps === 0) {
    return 'バースト';
  }
  return `${config.theoreticalBps.toFixed(0)} bps`;
}

/**
 * Create a single channel card
 */
function createCard(config: ChannelConfig, isActive: boolean, onClick: () => void): HTMLElement {
  const card = document.createElement('div');
  card.className = `signal-channel-card${isActive ? ' signal-channel-card--active' : ''}`;
  card.dataset.channel = config.id;

  const iconHtml = getIcon(config.icon as IconName);
  card.innerHTML = `
    <div class="signal-channel-card__icon">${iconHtml}</div>
    <div class="signal-channel-card__name">${config.name}</div>
    <div class="signal-channel-card__speed">${formatSpeed(config)}</div>
  `;

  card.addEventListener('click', onClick);

  return card;
}

/**
 * Create channel cards container
 */
export function createChannelCards(
  activeChannel: ChannelId,
  onSelect: (channel: ChannelId) => void
): HTMLElement {
  const container = document.createElement('section');
  container.className = 'signal-channels';

  const channelIds: ChannelId[] = ['ultrasonic', 'audible', 'brightness', 'color', 'grid', 'qr'];

  for (const id of channelIds) {
    const config = CHANNEL_CONFIGS[id];
    const isActive = id === activeChannel;
    const card = createCard(config, isActive, () => onSelect(id));
    container.appendChild(card);
  }

  return container;
}

/**
 * Update active channel card
 */
export function updateActiveChannel(container: HTMLElement, activeChannel: ChannelId): void {
  // Remove active class from all cards
  const cards = container.querySelectorAll('.signal-channel-card');
  cards.forEach((card) => {
    card.classList.remove('signal-channel-card--active');
    if ((card as HTMLElement).dataset.channel === activeChannel) {
      card.classList.add('signal-channel-card--active');
    }
  });
}
