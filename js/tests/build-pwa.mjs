// Genera una lista versionada: cualquier cambio invalida la caché anterior.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root=process.argv[2] || process.cwd();
async function walk(dir){let files=[];for(const entry of await readdir(path.join(root,dir),{withFileTypes:true})){const file=path.posix.join(dir,entry.name);if(entry.isDirectory())files.push(...await walk(file));else if(!file.endsWith('.md')&&!file.endsWith('.txt')&&!file.includes('/tests/')&&!file.endsWith('sources.json'))files.push(file);}return files;}
const files=['index.html','manifest.webmanifest',...await walk('assets'),...await walk('data'),...await walk('js')].sort();
const hash=createHash('sha256');for(const file of files)hash.update(file).update(await readFile(path.join(root,file)));
const version=hash.digest('hex').slice(0,16);
await writeFile(path.join(root,'sw.js'),`// Generado por js/tests/build-pwa.mjs. No edites la lista a mano.
const CACHE = 'michoks-pwa-${version}';
const FILES = ${JSON.stringify(files)};
const BASE = new URL('./', self.location.href);
const HOME = new URL('index.html', BASE).href;
self.addEventListener('install', event => {
  // El worker anterior sigue activo hasta cerrar sus pestañas; evita mezclar versiones.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(file => new URL(file, BASE).href))));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name.startsWith('michoks-pwa-') && name !== CACHE) await caches.delete(name);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname)) return;
  // Una versión coherente del sitio y el catálogo; los cambios llegan mediante un nuevo worker.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const known = await cache.match(url.href);
    if (known) return known;
    if (event.request.mode === 'navigate' && ['','index.html','michoks.html'].includes(url.pathname.slice(BASE.pathname.length))) return cache.match(HOME);
    return fetch(event.request);
  })());
});
`);
console.log('PWA generada: '+files.length+' archivos, versión '+version);
