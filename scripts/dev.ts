/**
 * Signal - Development Server
 *
 * Starts a development server with live reload.
 */

import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';

const PORT = 3000;
const DIST_DIR = 'dist';

/**
 * Generate development HTML
 */
function generateDevHTML(): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="theme-color" content="#FDD94B">
  <title>Signal - Dev</title>
</head>
<body>
  <div id="app"></div>

  <!-- External Libraries (from CDN for development) -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"></script>

  <!-- Application Bundle (served by esbuild) -->
  <script src="/main.js"></script>

  <!-- Live Reload -->
  <script>
    new EventSource('/esbuild').addEventListener('change', () => location.reload());
  </script>
</body>
</html>`;
}

/**
 * Start development server
 */
async function startDevServer(): Promise<void> {
  // Ensure dist directory exists
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  // Write development HTML
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), generateDevHTML());

  // Create esbuild context with watch mode
  const ctx = await esbuild.context({
    entryPoints: ['src/main.ts'],
    bundle: true,
    format: 'iife',
    target: ['es2020'],
    outfile: path.join(DIST_DIR, 'main.js'),
    sourcemap: true,
    logLevel: 'info',
  });

  // Start esbuild server
  const { host, port: esbuildPort } = await ctx.serve({
    servedir: DIST_DIR,
    port: 3001,
  });

  // Create proxy server for live reload
  const server = http.createServer((req, res) => {
    const options = {
      hostname: host,
      port: esbuildPort,
      path: req.url,
      method: req.method,
      headers: req.headers,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    req.pipe(proxyReq, { end: true });
  });

  server.listen(PORT, () => {
    console.log(`
  🚀 Development server running at:

     http://localhost:${PORT}

  Press Ctrl+C to stop.
    `);
  });

  // Watch for changes
  await ctx.watch();
}

// Run dev server
startDevServer().catch((error) => {
  console.error('Failed to start dev server:', error);
  process.exit(1);
});
