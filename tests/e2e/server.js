'use strict';
/* A static server for the browser tests. It sends the headers from public/_headers. */
const fs = require('fs');
const http = require('http');
const path = require('path');

const PUB = path.join(__dirname, '..', '..', 'public');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };

function headersFor(dir) {
  const out = {};
  let inAll = false;
  fs.readFileSync(path.join(dir || PUB, '_headers'), 'utf8').split('\n').forEach((line) => {
    if (/^\S/.test(line) && !line.startsWith('#')) inAll = line.trim() === '/*';
    else if (inAll && /^\s+\S+:/.test(line)) { const i = line.indexOf(':'); out[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  });
  return out;
}

function serve(dir) {
  dir = dir || PUB;
  const hdr = headersFor(dir);
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const f = path.join(dir, p);
    if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404, hdr); res.end('no'); return; }
    res.writeHead(200, Object.assign({ 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }, hdr));
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok(srv)));
}

/* Opens Ledger, then its Keeping page. Works at desktop width (tab row) and on a phone (bottom bar). */
async function openKeeping(page) {
  const tab = page.locator('#tabs button, #bar button', { hasText: 'Ledger' }).locator('visible=true').first();
  await tab.click();
  await page.locator('#subnav button', { hasText: 'Keeping' }).click();
}

module.exports = { serve, PUB, openKeeping };
