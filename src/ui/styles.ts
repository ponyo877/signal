/**
 * Signal - Styles
 *
 * CSS-in-JS styles inspired by fondesk.jp design.
 * Features:
 * - Yellow accent (#FDD94B)
 * - Teal secondary (#14b8a6)
 * - Rounded UI elements
 * - M PLUS Rounded 1c font
 * - Shadow effects
 * - Hover animations
 */

/**
 * Inject global styles into the document
 */
export function injectStyles(): void {
  if (document.getElementById('signal-styles')) {
    return;
  }

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
  --color-primary-light: #FEE68A;

  /* Secondary colors */
  --color-accent: #14b8a6;
  --color-accent-dark: #0d9488;
  --color-accent-light: #5eead4;

  /* Background colors */
  --color-bg: #FFFFFF;
  --color-bg-light: #faf7e2;
  --color-bg-dark: #f5f5f5;
  --color-bg-card: #FFFFFF;

  /* Text colors */
  --color-text: #1f2937;
  --color-text-muted: #6b7280;
  --color-text-light: #9ca3af;

  /* Signal colors */
  --color-signal-bg: #1a1a2e;
  --color-signal-text: #FFFFFF;

  /* Status colors */
  --color-success: #4ECB71;
  --color-error: #FF6B6B;
  --color-warning: #FFB347;

  /* Typography */
  --font-family: 'M PLUS Rounded 1c', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 2rem;

  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;

  /* Border radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;
  --radius-xl: 1.5rem;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;
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
  line-height: 1.6;
  color: var(--color-text);
  background-color: var(--color-bg-light);
  min-height: 100vh;
  overflow-x: hidden;
}

/* ============================================================
   App Container
   ============================================================ */
.signal-app {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  background-color: var(--color-bg);
  display: flex;
  flex-direction: column;
}

/* ============================================================
   Header
   ============================================================ */
.signal-header {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
  padding: var(--spacing-lg) var(--spacing-md);
  text-align: center;
  position: relative;
}

.signal-header__logo {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-text);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
}

.signal-header__subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin-top: var(--spacing-xs);
}

/* ============================================================
   Hero Section
   ============================================================ */
.signal-hero {
  background: var(--color-bg);
  padding: var(--spacing-xl) var(--spacing-md);
  text-align: center;
}

.signal-hero__title {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: var(--spacing-sm);
}

.signal-hero__description {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

/* ============================================================
   Channel Cards
   ============================================================ */
.signal-channels {
  padding: var(--spacing-md);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
}

.signal-channel-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-base);
  box-shadow: var(--shadow-sm);
  border: 2px solid transparent;
}

.signal-channel-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.signal-channel-card--active {
  border-color: var(--color-primary);
  background: var(--color-bg-light);
}

.signal-channel-card__icon {
  font-size: var(--font-size-2xl);
  margin-bottom: var(--spacing-sm);
}

.signal-channel-card__name {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--spacing-xs);
}

.signal-channel-card__speed {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

/* ============================================================
   Signal Panel
   ============================================================ */
.signal-panel {
  background: var(--color-signal-bg);
  overflow: hidden;
  transition: height var(--transition-slow);
}

.signal-panel--collapsed {
  height: 0;
}

.signal-panel--open {
  height: 180px;
}

.signal-panel--expanded {
  height: 260px;
}

.signal-panel__canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.signal-panel__status {
  position: absolute;
  bottom: var(--spacing-sm);
  left: var(--spacing-sm);
  right: var(--spacing-sm);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--color-signal-text);
  font-size: var(--font-size-sm);
}

.signal-panel__indicator {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-text-muted);
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
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ============================================================
   Messages
   ============================================================ */
.signal-messages {
  flex: 1;
  padding: var(--spacing-md);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.signal-message {
  max-width: 85%;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-sm);
  word-wrap: break-word;
}

.signal-message--sent {
  align-self: flex-end;
  background: var(--color-primary);
  color: var(--color-text);
  border-bottom-right-radius: var(--radius-sm);
}

.signal-message--received {
  align-self: flex-start;
  background: var(--color-accent);
  color: white;
  border-bottom-left-radius: var(--radius-sm);
}

.signal-message--system {
  align-self: center;
  background: var(--color-bg-dark);
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
}

.signal-message__meta {
  font-size: var(--font-size-xs);
  opacity: 0.7;
  margin-top: var(--spacing-xs);
}

/* ============================================================
   Control Area
   ============================================================ */
.signal-controls {
  padding: var(--spacing-md);
  background: var(--color-bg);
  border-top: 1px solid var(--color-bg-dark);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
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
  font-size: var(--font-size-base);
  outline: none;
  transition: border-color var(--transition-fast);
}

.signal-controls__input:focus {
  border-color: var(--color-primary);
}

.signal-controls__input::placeholder {
  color: var(--color-text-light);
}

.signal-controls__button-row {
  display: flex;
  gap: var(--spacing-sm);
}

.signal-btn {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--radius-full);
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
}

.signal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.signal-btn--primary {
  background: var(--color-primary);
  color: var(--color-text);
}

.signal-btn--primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
  transform: scale(1.02);
}

.signal-btn--secondary {
  background: var(--color-accent);
  color: white;
}

.signal-btn--secondary:hover:not(:disabled) {
  background: var(--color-accent-dark);
  transform: scale(1.02);
}

.signal-btn--secondary.signal-btn--active {
  background: var(--color-error);
}

.signal-btn--outline {
  background: transparent;
  border: 2px solid var(--color-bg-dark);
  color: var(--color-text-muted);
}

.signal-btn--outline:hover:not(:disabled) {
  border-color: var(--color-text-muted);
  color: var(--color-text);
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
  padding: var(--spacing-sm) var(--spacing-md);
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: var(--radius-full);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
  z-index: 1001;
}

.signal-overlay-status {
  position: absolute;
  bottom: var(--spacing-xl);
  left: 50%;
  transform: translateX(-50%);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  z-index: 1001;
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
   Loading Font
   ============================================================ */
@import url('https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;500;700&display=swap');

/* ============================================================
   Mobile Adjustments
   ============================================================ */
@media (max-width: 480px) {
  .signal-channels {
    grid-template-columns: repeat(2, 1fr);
  }

  .signal-hero__title {
    font-size: var(--font-size-lg);
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
