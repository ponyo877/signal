/**
 * Signal - Header Component
 *
 * Displays the app logo and subtitle.
 */

/**
 * Create header element
 */
export function createHeader(): HTMLElement {
  const header = document.createElement('header');
  header.className = 'signal-header';

  header.innerHTML = `
    <div class="signal-header__logo">
      <span>📡</span>
      <span>Signal</span>
    </div>
    <p class="signal-header__subtitle">物理信号で、つながる。</p>
  `;

  return header;
}

/**
 * Create hero section
 */
export function createHero(): HTMLElement {
  const hero = document.createElement('section');
  hero.className = 'signal-hero';

  hero.innerHTML = `
    <h1 class="signal-hero__title">インターネットなしでメッセージを送受信</h1>
    <p class="signal-hero__description">
      音や光を使った物理信号通信。<br>
      チャネルを選んで、メッセージを送信しましょう。
    </p>
  `;

  return hero;
}
