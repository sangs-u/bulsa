'use strict';
const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const ROOT = path.resolve(__dirname, '..');
const PORT = parseInt(process.env.PORT || '4173', 10);
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.glb':'model/gltf-binary','.wasm':'application/wasm','.mp3':'audio/mpeg','.ogg':'audio/ogg','.woff':'font/woff','.woff2':'font/woff2' };

const server = http.createServer((req, res) => {
  const p = decodeURIComponent(url.parse(req.url).pathname);
  let file = path.join(ROOT, p === '/' ? '/index.html' : p);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
  fs.stat(file, (err, st) => {
    if (err) { res.writeHead(404); return res.end('not found: ' + p); }
    if (st.isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (err2, data) => {
      if (err2) { res.writeHead(404); return res.end('read fail'); }
      const ext = path.extname(file).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
});

server.listen(PORT, () => console.log(`[static] http://127.0.0.1:${PORT}/  root=${ROOT}`));
