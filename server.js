const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { dashboard, match, configured } = require('./lib/football-api');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC_DIR = path.join(__dirname, 'public');

function loadEnv() {
  const file = path.join(__dirname, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const found = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (found && !process.env[found[1]]) process.env[found[1]] = found[2].replace(/^['"]|['"]$/g, '');
  }
}

loadEnv();
function json(res, status, payload) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(payload)); }
function serveStatic(requestPath, res) {
  const clean = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, ''); const target = path.join(PUBLIC_DIR, clean === '/' ? 'index.html' : clean);
  if (!target.startsWith(PUBLIC_DIR)) return json(res, 403, { error: 'Forbidden' });
  fs.readFile(target, (error, file) => {
    if (error) return fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (indexError, index) => { if (indexError) return json(res, 404, { error: 'Not found' }); res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(index); });
    const types = { '.css': 'text/css', '.js': 'application/javascript', '.svg': 'image/svg+xml', '.html': 'text/html' };
    res.writeHead(200, { 'Content-Type': `${types[path.extname(target)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-cache' }); res.end(file);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname === '/api/dashboard') return json(res, 200, await dashboard(url.searchParams));
    if (url.pathname.startsWith('/api/match/')) { const data = await match(url.pathname.replace('/api/match/', '')); return data ? json(res, 200, data) : json(res, 404, { error: 'No data available.' }); }
    if (url.pathname === '/api/health') return json(res, 200, { configured: configured(), source: 'API-Football' });
    return serveStatic(url.pathname, res);
  } catch (error) { return json(res, error.code === 'no_data' ? 503 : 502, { error: 'No data available.', detail: error.message }); }
});

server.listen(PORT, HOST, () => console.log(`ScoreHub running at http://${HOST}:${PORT}`));
