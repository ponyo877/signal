/**
 * Signal - Styles
 *
 * CSS-in-JS styles inspired by fondesk.jp design.
 * Features:
 * - Yellow accent (#FDD94B)
 * - Teal secondary (#14b8a6)
 * - Rounded UI elements (pill buttons)
 * - M PLUS Rounded 1c font
 * - Enhanced shadow effects
 * - Smooth hover animations
 * - 100vh layout (no scroll)
 * - No gradients (solid colors only)
 */

/**
 * Inject font preconnects and stylesheets
 */
function injectFonts(): void {
  if (document.getElementById('signal-font')) {
    return;
  }

  // Preconnect to Google Fonts for faster loading
  const preconnect1 = document.createElement('link');
  preconnect1.rel = 'preconnect';
  preconnect1.href = 'https://fonts.googleapis.com';
  document.head.appendChild(preconnect1);

  const preconnect2 = document.createElement('link');
  preconnect2.rel = 'preconnect';
  preconnect2.href = 'https://fonts.gstatic.com';
  preconnect2.crossOrigin = 'anonymous';
  document.head.appendChild(preconnect2);

  // Load M PLUS Rounded 1c font
  const fontLink = document.createElement('link');
  fontLink.id = 'signal-font';
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;500;700&display=swap';
  document.head.appendChild(fontLink);
}

/**
 * Inject global styles into the document
 */
export function injectStyles(): void {
  if (document.getElementById('signal-styles')) {
    return;
  }

  // Inject fonts first
  injectFonts();

  const style = document.createElement('style');
  style.id = 'signal-styles';
  style.textContent = `
/* ============================================================
   CSS Variables
   ============================================================ */
:root {
  /* Primary colors */
  --color-primary: #FDD94B;
  --color-primary-dark: #E5C43E;
  --color-primary-light: #FEF3C7;
  --color-primary-bg: #FFFBEB;

  /* Secondary colors */
  --color-accent: #14b8a6;
  --color-accent-dark: #0d9488;
  --color-accent-light: #5eead4;
  --color-accent-bg: #F0FDFA;

  /* Background colors */
  --color-bg: #FFFFFF;
  --color-bg-light: #FAFAFA;
  --color-bg-dark: #F3F4F6;
  --color-bg-card: #FFFFFF;

  /* Text colors */
  --color-text: #1f2937;
  --color-text-muted: #6b7280;
  --color-text-light: #9ca3af;

  /* Signal colors */
  --color-signal-bg: #0f172a;
  --color-signal-text: #FFFFFF;

  /* Status colors */
  --color-success: #10b981;
  --color-error: #ef4444;
  --color-warning: #f59e0b;

  /* Typography */
  --font-family: 'M PLUS Rounded 1c', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-size-xs: 0.7rem;
  --font-size-sm: 0.8rem;
  --font-size-base: 0.9rem;
  --font-size-lg: 1rem;
  --font-size-xl: 1.125rem;
  --font-size-2xl: 1.25rem;

  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 0.75rem;
  --spacing-lg: 1rem;
  --spacing-xl: 1.5rem;

  /* Border radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --shadow-button: 0 4px 14px 0 rgba(253, 217, 75, 0.4);
  --shadow-button-accent: 0 4px 14px 0 rgba(20, 184, 166, 0.4);

  /* Transitions */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* ============================================================
   Reset & Base
   ============================================================ */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
}

body {
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  line-height: 1.5;
  color: var(--color-text);
  background: var(--color-bg-light);
  min-height: 100vh;
  overflow: hidden;
}

/* ============================================================
   App Container - 100vh固定レイアウト
   ============================================================ */
.signal-app {
  max-width: 420px;
  margin: 0 auto;
  height: 100vh;
  height: 100dvh;
  background-color: var(--color-bg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow-xl);
}

/* ============================================================
   Header - コンパクトなナビバースタイル
   ============================================================ */
.signal-header {
  background: var(--color-primary);
  padding: var(--spacing-sm) var(--spacing-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
}

.signal-header__logo {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.signal-header__logo-icon {
  display: flex;
  align-items: center;
}

.signal-header__logo-icon svg {
  width: 20px;
  height: 20px;
}

/* ============================================================
   Channel Cards - 洗練されたグリッド
   ============================================================ */
.signal-channels {
  padding: var(--spacing-sm) var(--spacing-md);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-sm);
  flex-shrink: 0;
  background: var(--color-bg-light);
}

.signal-channel-card {
  background: var(--color-bg-dark);
  border-radius: var(--radius-lg);
  padding: var(--spacing-sm);
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-base);
  box-shadow: none;
  border-bottom: 3px solid transparent;
}

.signal-channel-card:hover {
  transform: translateY(-1px);
  background: var(--color-bg-card);
  box-shadow: var(--shadow-sm);
}

.signal-channel-card:active {
  transform: translateY(0);
}

.signal-channel-card--active {
  background: var(--color-bg-card);
  border-bottom-color: var(--color-primary);
  box-shadow: var(--shadow-md);
  transform: scale(1.02);
}

.signal-channel-card--active:hover {
  transform: scale(1.02);
}

.signal-channel-card__icon {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: var(--spacing-xs);
  color: var(--color-text);
}

.signal-channel-card__icon svg {
  width: 24px;
  height: 24px;
}

.signal-channel-card--active .signal-channel-card__icon {
  color: var(--color-primary);
}

.signal-channel-card--active .signal-channel-card__icon svg {
  width: 28px;
  height: 28px;
}

.signal-channel-card--active .signal-channel-card__name {
  color: var(--color-text);
  font-weight: 700;
}

.signal-channel-card__name {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text);
}

.signal-channel-card__speed {
  font-size: 0.65rem;
  color: var(--color-text-muted);
}

/* ============================================================
   Signal Panel - ビジュアライザー
   ============================================================ */
.signal-panel {
  background: var(--color-signal-bg);
  overflow: hidden;
  transition: height var(--transition-slow);
  flex-shrink: 0;
  position: relative;
  border-radius: var(--radius-md);
  margin: 0 var(--spacing-md);
}

.signal-panel--collapsed {
  height: 0;
  margin: 0;
}

.signal-panel--open {
  height: 100px;
  margin: var(--spacing-sm) var(--spacing-md);
}

.signal-panel--expanded {
  height: 160px;
  margin: var(--spacing-sm) var(--spacing-md);
}

.signal-panel__canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.signal-panel__status {
  position: absolute;
  bottom: var(--spacing-xs);
  left: var(--spacing-sm);
  right: var(--spacing-sm);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  color: var(--color-signal-text);
  font-size: var(--font-size-xs);
  background: rgba(0, 0, 0, 0.5);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-full);
}

.signal-panel__indicator {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--color-text-muted);
  flex-shrink: 0;
}

.signal-panel__indicator--pilot {
  background: var(--color-warning);
  animation: pulse 0.5s ease-in-out infinite;
}

.signal-panel__indicator--receiving {
  background: var(--color-accent);
  animation: pulse 1s ease-in-out infinite;
}

.signal-panel__indicator--success {
  background: var(--color-success);
}

.signal-panel__indicator--error {
  background: var(--color-error);
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

/* ============================================================
   Messages - メッセージエリア
   ============================================================ */
.signal-messages {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  background: var(--color-bg-light);
  min-height: 0;
}

.signal-message {
  max-width: 85%;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-sm);
  word-wrap: break-word;
  animation: messageSlideIn var(--transition-base) ease-out;
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.signal-message--sent {
  align-self: flex-end;
  background: var(--color-primary);
  color: var(--color-text);
  border-bottom-right-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
}

.signal-message--received {
  align-self: flex-start;
  background: var(--color-accent);
  color: white;
  border-bottom-left-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
}

.signal-message--system {
  align-self: center;
  background: var(--color-bg-dark);
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-full);
}

.signal-message__meta {
  font-size: 0.65rem;
  opacity: 0.7;
  margin-top: var(--spacing-xs);
}

/* ============================================================
   Control Area - fondesk風ボタン
   ============================================================ */
.signal-controls {
  padding: var(--spacing-md);
  background: var(--color-bg);
  border-top: 1px solid var(--color-bg-dark);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}

.signal-controls__input-row {
  display: flex;
  gap: var(--spacing-sm);
}

.signal-controls__input {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 2px solid var(--color-bg-dark);
  border-radius: var(--radius-full);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  outline: none;
  transition: all var(--transition-fast);
  background: var(--color-bg-light);
}

.signal-controls__input:focus {
  border-color: var(--color-primary);
  background: var(--color-bg);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.signal-controls__input::placeholder {
  color: var(--color-text-light);
}

.signal-controls__button-row {
  display: flex;
  gap: var(--spacing-sm);
}

/* ============================================================
   Buttons - fondesk風のpillボタン
   ============================================================ */
.signal-btn {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--radius-full);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
}

.signal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.signal-btn--primary {
  background: var(--color-primary);
  color: var(--color-text);
  box-shadow: var(--shadow-button);
}

.signal-btn--primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 6px 20px 0 rgba(253, 217, 75, 0.5);
}

.signal-btn--primary:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}

.signal-btn--secondary {
  background: var(--color-accent);
  color: white;
  box-shadow: var(--shadow-button-accent);
}

.signal-btn--secondary:hover:not(:disabled) {
  background: var(--color-accent-dark);
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 6px 20px 0 rgba(20, 184, 166, 0.5);
}

.signal-btn--secondary:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}

.signal-btn--secondary.signal-btn--active {
  background: var(--color-error);
  box-shadow: 0 4px 14px 0 rgba(239, 68, 68, 0.4);
}

.signal-btn__icon {
  display: flex;
  align-items: center;
}

.signal-btn__icon svg {
  width: 18px;
  height: 18px;
}

/* Icon spin animation for loading */
@keyframes icon-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.icon-spin {
  animation: icon-spin 1s linear infinite;
}

/* ============================================================
   Overlay
   ============================================================ */
.signal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-signal-bg);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.signal-overlay.hidden {
  display: none;
}

.signal-overlay-canvas {
  flex: 1;
  width: 100%;
  display: block;
}

.signal-overlay-cancel {
  position: absolute;
  top: var(--spacing-md);
  right: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: rgba(255, 255, 255, 0.95);
  border: none;
  border-radius: var(--radius-full);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
  z-index: 1001;
  box-shadow: var(--shadow-lg);
  transition: all var(--transition-fast);
}

.signal-overlay-cancel:hover {
  transform: scale(1.05);
}

.signal-overlay-status {
  position: absolute;
  bottom: var(--spacing-xl);
  left: 50%;
  transform: translateX(-50%);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  z-index: 1001;
  backdrop-filter: blur(8px);
}

/* ============================================================
   Progress Bar
   ============================================================ */
.signal-progress {
  height: 4px;
  background: var(--color-bg-dark);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.signal-progress__bar {
  height: 100%;
  background: var(--color-primary);
  transition: width var(--transition-fast);
  border-radius: var(--radius-full);
}

/* ============================================================
   Utilities
   ============================================================ */
.hidden {
  display: none !important;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ============================================================
   Mobile Adjustments
   ============================================================ */
@media (max-width: 380px) {
  .signal-channels {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-xs);
  }

  .signal-channel-card {
    padding: var(--spacing-xs);
  }

  .signal-channel-card__icon svg {
    width: 20px;
    height: 20px;
  }

  .signal-channel-card__name {
    font-size: 0.65rem;
  }

  .signal-channel-card__speed {
    display: none;
  }
}

/* ============================================================
   Safe Area (iOS)
   ============================================================ */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .signal-controls {
    padding-bottom: calc(var(--spacing-md) + env(safe-area-inset-bottom));
  }
}

/* ============================================================
   Scrollbar Styling
   ============================================================ */
.signal-messages::-webkit-scrollbar {
  width: 4px;
}

.signal-messages::-webkit-scrollbar-track {
  background: transparent;
}

.signal-messages::-webkit-scrollbar-thumb {
  background: var(--color-bg-dark);
  border-radius: var(--radius-full);
}

.signal-messages::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-light);
}
`;

  document.head.appendChild(style);
}

/**
 * Remove injected styles (for cleanup)
 */
export function removeStyles(): void {
  const style = document.getElementById('signal-styles');
  if (style) {
    style.remove();
  }
}
