// Servidor de desarrollo de la vista. El proxy mantiene el mismo origen para la API.
import express from 'express';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const app = express();
const root = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const api = new URL(process.env.BACKEND_URL || 'http://127.0.0.1:5050');
if (!['http:', 'https:'].includes(api.protocol) || api.pathname !== '/' || api.search || api.hash) {
  throw new Error('BACKEND_URL debe ser un origen HTTP(S), por ejemplo http://127.0.0.1:5050');
}
app.use('/api', (req, res) => {
  const transport = api.protocol === 'https:' ? https : http;
  const headers = { ...req.headers, host: api.host };
  const upstream = transport.request(new URL(req.originalUrl, api), { method: req.method, headers }, response => {
    res.writeHead(response.statusCode, response.headers);
    response.pipe(res);
  });
  upstream.on('error', () => {
    if (!res.headersSent) res.status(502).json({ status: 'error', error: { message: 'No se puede conectar con el backend.' } });
    else res.destroy();
  });
  req.pipe(upstream);
});
app.get('/vendor/vue.js', (req, res) => res.sendFile(require.resolve('vue/dist/vue.esm-browser.prod.js')));
app.get(['/','/index.html','/cuenta'], (req, res) => res.sendFile(path.join(root, 'index.html')));
app.get('/cuenta-contenido', (req, res) => res.sendFile(path.join(root, 'cuenta.html')));
for (const dir of ['assets','js']) app.use('/' + dir, express.static(path.join(root, dir), { dotfiles: 'deny', index: false }));
for (const file of ['sw.js','manifest.webmanifest']) app.get('/' + file, (req, res) => res.sendFile(path.join(root, file)));
const port = Number(process.env.FRONTEND_PORT || 5173);
app.listen(port, '127.0.0.1', () => console.log(`MICHOKS frontend: http://127.0.0.1:${port} (API: ${api.origin})`));
