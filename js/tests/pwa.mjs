import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.argv[2];const prefix='/parte_1_bootsrap_tylwind/';
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith(prefix))throw Error('outside scope');let file=url.pathname.slice(prefix.length)||'index.html';if(file==='michoks.html')file='index.html';const data=await readFile(path.join(root,file));res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(4174,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined});
try{
 const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const base='http://127.0.0.1:4174'+prefix;
 await page.goto(base);if(await page.locator('#age-gate').isVisible())await page.locator('#age-accept').click();if(await page.locator('#cookie-dialog').isVisible())await page.locator('#cookie-accept').click();await page.locator('[data-add-product="1"]').waitFor();
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
 await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
 const manifest=await page.evaluate(async()=>await(await fetch(document.querySelector('link[rel="manifest"]').href)).json());assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,'./index.html');assert.equal(manifest.scope,'./');assert.deepEqual(manifest.icons.map(i=>i.sizes),['192x192','512x512','512x512']);
 for(const icon of manifest.icons)assert.equal(await page.evaluate(src=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img.naturalWidth);img.onerror=()=>resolve(0);img.src=src;}),icon.src),Number(icon.sizes.split('x')[0]));
 console.log('OK manifiesto, iconos y worker bajo la subcarpeta de GitHub Pages');
 const cdp=await context.newCDPSession(page);const install=await cdp.send('Page.getInstallabilityErrors');assert.deepEqual(install.installabilityErrors,[]);console.log('OK criterios de instalación de Chromium');
 await page.locator('[data-add-product="1"]').click();await page.evaluate(async()=>await(await import('./js/storage.js')).storageSettled());
 await cdp.send('Network.enable');await context.setOffline(true);await cdp.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await page.reload();await page.locator('[data-add-product="1"]').waitFor();assert.equal(await page.locator('#cart-count').textContent(),'1');assert.equal(await page.locator('#connection-status').isVisible(),true);
 while(await page.locator('#load-more-products').isVisible())await page.locator('#load-more-products').click();assert.equal(await page.locator('.product-card').count(),284);const items=await page.evaluate(async()=>await(await fetch('./data/productos.json')).json());for(const product of items)assert.equal(await page.evaluate(src=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img.naturalWidth>0);img.onerror=()=>resolve(false);img.src=src;}),product.image),true,product.image);
 await page.locator('[data-add-product="18"]').click();assert.equal(await page.locator('#cart-count').textContent(),'2');console.log('OK catálogo completo, fotografías y carrito sin conexión');
 await page.goto(base+'michoks.html');await page.locator('[data-add-product="1"]').waitFor();assert.equal(await page.locator('#cart-count').textContent(),'2');console.log('OK enlace antiguo michoks.html funciona sin conexión');
 await context.setOffline(false);await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});await page.waitForFunction(()=>document.querySelector('#connection-status').hidden);assert.deepEqual(errors,[]);console.log('OK reconexión sin errores');
}finally{await browser.close();server.close();}
