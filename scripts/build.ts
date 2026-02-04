/**
 * Signal - Build Script
 *
 * Builds the application into a single HTML file with all JavaScript inlined.
 * Uses esbuild for bundling and minification.
 */

import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';

const DIST_DIR = 'dist';
const OUTPUT_FILE = path.join(DIST_DIR, 'index.html');

/**
 * Fetch library content from CDN
 */
async function fetchLibrary(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.warn(`Failed to fetch ${url}:`, error);
    return `console.warn("Failed to load library: ${url}");`;
  }
}

/**
 * Bundle the application JavaScript
 */
async function bundleApp(): Promise<string> {
  const result = await esbuild.build({
    entryPoints: ['src/main.ts'],
    bundle: true,
    minify: true,
    format: 'iife',
    target: ['es2020'],
    write: false,
  });

  return result.outputFiles[0].text;
}

/**
 * Generate the HTML template
 */
function generateHTML(appBundle: string, jsQRLib: string, qrcodeLib: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="theme-color" content="#FDD94B">
  <meta name="description" content="インターネットなしで音や光を使ってメッセージを送受信">
  <title>Signal - 物理信号通信</title>
  <style>
    /* Critical CSS for initial load */
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #faf7e2;
    }
    #app {
      max-width: 480px;
      margin: 0 auto;
      min-height: 100vh;
      background: #fff;
    }
    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div id="app">
    <div class="loading">読み込み中...</div>
  </div>

  <!-- External Libraries (inlined) -->
  <script>
${qrcodeLib}
  </script>
  <script>
${jsQRLib}
  </script>

  <!-- Application Bundle -->
  <script>
${appBundle}
  </script>
</body>
</html>`;
}

/**
 * Main build function
 */
async function build(): Promise<void> {
  console.log('Building Signal...');

  // Ensure dist directory exists
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  // Fetch external libraries
  console.log('Fetching external libraries...');
  const [jsQRLib, qrcodeLib] = await Promise.all([
    fetchLibrary('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js'),
    fetchLibrary('https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'),
  ]);

  // Bundle application
  console.log('Bundling application...');
  const appBundle = await bundleApp();

  // Generate HTML
  console.log('Generating HTML...');
  const html = generateHTML(appBundle, jsQRLib, qrcodeLib);

  // Write output file
  fs.writeFileSync(OUTPUT_FILE, html, 'utf-8');

  const stats = fs.statSync(OUTPUT_FILE);
  const sizeKB = (stats.size / 1024).toFixed(2);

  console.log(`Build complete: ${OUTPUT_FILE} (${sizeKB} KB)`);
}

// Run build
build().catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
