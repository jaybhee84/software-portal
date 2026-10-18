import http from 'node:http';
import { readFile } from 'node:fs/promises';
import handler from '../api/catalog.js';
// Optional local env; silently skipped when .env is absent.
try { process.loadEnvFile(new URL('../.env', import.meta.url)); } catch {}
const files = { '/theme.css': ['theme.css', 'text/css'], '/ape.png': ['ape.png', 'image/png'], '/iswabe.png': ['iswabe.png', 'image/png'], '/swiss.png': ['swiss.png', 'image/png'], '/bmi.png': ['bmi.png', 'image/png'], '/iecesportal.png': ['iecesportal.png', 'image/png'], '/fundwork.png': ['fundwork.png', 'image/png'], '/buzzjay.png': ['buzzjay.png', 'image/png'], '/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/styles.css': ['styles.css', 'text/css'], '/favicon.svg': ['favicon.svg', 'image/svg+xml'] };
const server = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const path = new URL(req.url, 'http://localhost').pathname;
  res.status = code => { res.statusCode = code; return res; };
  res.json = data => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
  try {
    if (path === '/api/catalog') return await handler(req, res);
    if (/^\/screenshots\/[\w-]+\.png$/.test(path)) files[path] = [path.slice(1), 'image/png'];
    // Printer photos for Google Drive downloads.
    if (/^\/printers\/[\w-]+\.jpg$/.test(path)) files[path] = [path.slice(1), 'image/jpeg'];
    if (!files[path]) { res.statusCode = 404; return res.end('Not found'); }
    const [file, type] = files[path]; res.setHeader('Content-Type', type);
    res.end(await readFile(new URL(`../public/${file}`, import.meta.url)));
  } catch { res.statusCode = 500; res.end('Server error'); }
});

let port = Number(process.env.PORT || 3000);
let retries = 0;
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error('PORT must be an integer between 0 and 65535.');
  process.exit(1);
}
server.on('error', error => {
  if (error.code === 'EADDRINUSE' && retries < 10 && port < 65535) {
    console.log(`Port ${port} is in use; trying ${port + 1}...`);
    port += 1;
    retries += 1;
    server.listen(port, '127.0.0.1');
    return;
  }
  console.error(`Unable to start the dev server: ${error.message}`);
  process.exitCode = 1;
});
server.on('listening', () => {
  console.log(`Open http://localhost:${server.address().port}`);
});
server.listen(port, '127.0.0.1');
