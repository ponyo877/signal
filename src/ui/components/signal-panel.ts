/**
 * Signal - Signal Panel Component
 *
 * Displays visualizations for the current channel:
 * - FFT spectrum for audio channels
 * - Camera preview for visual channels
 * - Status indicators
 */

import type { IVisualizer, SignalPanelState, ReceiverStatus } from '../../types/index.js';

/**
 * Signal Panel Component
 */
export class SignalPanel {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private statusContainer: HTMLElement;
  private indicator: HTMLElement;
  private statusText: HTMLElement;

  private visualizer: IVisualizer | null = null;
  private animationFrameId: number | null = null;
  private state: SignalPanelState = 'collapsed';

  constructor() {
    this.container = document.createElement('section');
    this.container.className = 'signal-panel signal-panel--collapsed';

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'signal-panel__canvas';
    this.ctx = this.canvas.getContext('2d')!;

    this.statusContainer = document.createElement('div');
    this.statusContainer.className = 'signal-panel__status';

    this.indicator = document.createElement('div');
    this.indicator.className = 'signal-panel__indicator';

    this.statusText = document.createElement('span');
    this.statusText.textContent = '待機中';

    this.statusContainer.appendChild(this.indicator);
    this.statusContainer.appendChild(this.statusText);
    this.container.appendChild(this.canvas);
    this.container.appendChild(this.statusContainer);

    // Handle resize
    window.addEventListener('resize', () => this.handleResize());
  }

  /**
   * Get the container element
   */
  getElement(): HTMLElement {
    return this.container;
  }

  /**
   * Set the visualizer
   */
  setVisualizer(visualizer: IVisualizer): void {
    this.visualizer = visualizer;
  }

  /**
   * Set panel state
   */
  setState(state: SignalPanelState): void {
    this.state = state;

    this.container.classList.remove(
      'signal-panel--collapsed',
      'signal-panel--open',
      'signal-panel--expanded'
    );
    this.container.classList.add(`signal-panel--${state}`);

    if (state !== 'collapsed') {
      this.handleResize();
      this.startRendering();
    } else {
      this.stopRendering();
    }
  }

  /**
   * Update status display
   */
  updateStatus(status: ReceiverStatus): void {
    // Update indicator
    this.indicator.className = 'signal-panel__indicator';

    switch (status.state) {
      case 'idle':
        this.statusText.textContent = '待機中';
        break;

      case 'pilot':
        this.indicator.classList.add('signal-panel__indicator--pilot');
        this.statusText.textContent = 'パイロット信号検出';
        break;

      case 'gap':
        this.indicator.classList.add('signal-panel__indicator--pilot');
        this.statusText.textContent = 'ギャップ検出';
        break;

      case 'receiving':
        this.indicator.classList.add('signal-panel__indicator--receiving');
        const progress = Math.round(status.progress * 100);
        this.statusText.textContent = `受信中... ${progress}%`;
        break;

      case 'success':
        this.indicator.classList.add('signal-panel__indicator--success');
        this.statusText.textContent = '受信完了';
        break;

      case 'error':
        this.indicator.classList.add('signal-panel__indicator--error');
        this.statusText.textContent = `エラー: ${status.message}`;
        break;
    }
  }

  /**
   * Start rendering loop
   */
  private startRendering(): void {
    if (this.animationFrameId !== null) return;

    const render = () => {
      if (this.state === 'collapsed') {
        this.stopRendering();
        return;
      }

      this.draw();
      this.animationFrameId = requestAnimationFrame(render);
    };
    render();
  }

  /**
   * Stop rendering loop
   */
  private stopRendering(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Draw current frame
   */
  private draw(): void {
    if (this.visualizer) {
      this.visualizer.draw(this.canvas, this.ctx);
    } else {
      // Default: clear to dark background
      this.ctx.fillStyle = '#1a1a2e';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * Handle window resize
   */
  private handleResize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.container.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.scale(dpr, dpr);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopRendering();
    this.container.remove();
  }
}

/**
 * Create signal panel instance
 */
export function createSignalPanel(): SignalPanel {
  return new SignalPanel();
}
