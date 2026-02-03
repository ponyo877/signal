/**
 * Signal - Channel Exports
 */

export { BaseChannel, AudioChannelBase, VisualChannelBase, BaseVisualizer } from './base-channel.js';
export { UltrasonicChannel } from './ultrasonic-channel.js';
export { AudibleChannel } from './audible-channel.js';
export { BrightnessChannel } from './brightness-channel.js';
export { ColorChannel } from './color-channel.js';
export { GridChannel } from './grid-channel.js';
export { QRChannel } from './qr-channel.js';

import type { IChannel, ChannelId } from '../types/index.js';
import { UltrasonicChannel } from './ultrasonic-channel.js';
import { AudibleChannel } from './audible-channel.js';
import { BrightnessChannel } from './brightness-channel.js';
import { ColorChannel } from './color-channel.js';
import { GridChannel } from './grid-channel.js';
import { QRChannel } from './qr-channel.js';

/**
 * Create a channel instance by ID
 */
export function createChannel(id: ChannelId): IChannel {
  switch (id) {
    case 'ultrasonic':
      return new UltrasonicChannel();
    case 'audible':
      return new AudibleChannel();
    case 'brightness':
      return new BrightnessChannel();
    case 'color':
      return new ColorChannel();
    case 'grid':
      return new GridChannel();
    case 'qr':
      return new QRChannel();
    default:
      throw new Error(`Unknown channel: ${id}`);
  }
}

/**
 * Get all channel IDs
 */
export function getAllChannelIds(): ChannelId[] {
  return ['ultrasonic', 'audible', 'brightness', 'color', 'grid', 'qr'];
}
