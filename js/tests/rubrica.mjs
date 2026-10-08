// Pruebas de integración de la rúbrica. Ejecutar desde un entorno temporal de Node.js.
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = process.argv[2];
const server=createServer(async(req,res)=>{try{const filename=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/$/,'/index.html'));res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'})[path.extname(filename)]||'application/octet-stream');res.end(await readFile(filename));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(4173,'127.0.0.1',resolve));
const browser=await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });let count=0;
async function check(name,fn){await fn();console.log('OK '+name);count++;}
const waitCart=async(page,n)=>{await page.waitForFunction(n=>document.querySelector('#cart-count').textContent===String(n),n);};
const ready=async(page)=>{await page.goto('http://127.0.0.1:4173');if(await page.locator('#age-gate').isVisible())await page.locator('#age-accept').click();await page.locator('[data-add-product="1"]').waitFor();};
try {
 const context=await browser.newContext({serviceWorkers: 'block'});const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await check('primera visita: acceso bloqueado, teclado y accesibilidad del aviso de edad',async()=>{
  const ctx=await browser.newContext({serviceWorkers:'block'});const p=await ctx.newPage();await p.goto('http://127.0.0.1:4173');await p.locator('#age-accept').waitFor();
  assert.equal(await p.locator('#age-content').isVisible(),false);assert.equal(await p.locator('.product-card').count(),0);await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.id),'age-decline');await p.keyboard.press('Shift+Tab');assert.equal(await p.evaluate(()=>document.activeElement.id),'age-accept');
  for(const width of [320,390,480,768,1024,1440]){await p.setViewportSize({width,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual((await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations,[]);}
  await p.locator('#age-accept').click();await p.locator('[data-add-product="1"]').waitFor();assert.equal(await p.evaluate(()=>localStorage.getItem('michoks-age-confirmed')),'1');await p.reload();await p.locator('[data-add-product="1"]').waitFor();assert.equal(await p.locator('#age-gate').isVisible(),false);await ctx.close();
 });
 await check('menor de edad: redirección a Vita sin guardar aprobación',async()=>{
  const ctx=await browser.newContext({serviceWorkers:'block'});const p=await ctx.newPage();await p.route('https://www.vita.com.ec/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Vita</title><p>Vita</p>'}));await p.goto('http://127.0.0.1:4173');await p.locator('#age-decline').click();await p.waitForURL('https://www.vita.com.ec/');await p.goto('http://127.0.0.1:4173');assert.equal(await p.locator('#age-gate').isVisible(),true);assert.equal(await p.evaluate(()=>localStorage.getItem('michoks-age-confirmed')),null);await ctx.close();
 });
 await check('JSON y semántica',async()=>{await ready(page);assert.equal(await page.locator('.product-card').count(),12);assert.equal(await page.locator('h1').count(),1);for(const tag of ['header','nav','main','footer'])assert.equal(await page.locator(tag).count(),1);});
 await check('24 productos, mostrar más y fotografías locales válidas',async()=>{
  await page.locator('#load-more-products').click();assert.equal(await page.locator('.product-card').count(),24);
  const items=await page.evaluate(async()=>await(await fetch('/data/productos.json')).json());assert.equal(items.length,24);assert.equal(new Set(items.map(p=>p.image)).size,24);
  for(const item of items)assert.equal(await page.evaluate(src=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img.naturalWidth>0);img.onerror=()=>resolve(false);img.src=src;}),item.image),true,item.image);
 });
 await check('categorías nuevas y presupuesto con restablecimiento',async()=>{
  for(const [category,n] of [['Rones',3],['Gins',2],['Licores',2],['Aperitivos',1]]){await page.locator('.category-tab[data-category="'+category+'"]').click();assert.equal(await page.locator('.product-card').count(),n);}
  await page.locator('.category-tab[data-category="Todos"]').click();await page.locator('#product-budget').selectOption('20');assert.equal(await page.locator('.product-card').count(),8);
  await page.locator('#clear-active-filters').click();assert.equal(await page.locator('#product-budget').inputValue(),'all');assert.equal(await page.locator('.product-card').count(),12);
 });
 await check('Descubre filtra por las cuatro ocasiones',async()=>{
  for(const tag of ['regalo','cena','cocteles','compartir']){await page.locator('[data-occasion="'+tag+'"]').click();assert.equal(await page.locator('#active-filters').isVisible(),true);assert.ok(await page.locator('.product-card').count()>0);assert.equal(await page.evaluate(()=>document.activeElement.id),'catalog-title');}
  await page.locator('#clear-active-filters').click();
 });
 await check('Acerca de nosotros dirige a misión y visión',async()=>{
  await page.locator('#main-nav a[href="#nosotros"]').click();await page.waitForFunction(()=>document.activeElement.id==='story-title');assert.equal(new URL(page.url()).hash,'#nosotros');assert.equal(await page.getByRole('heading',{name:'Misión.',exact:true}).count(),1);assert.equal(await page.getByRole('heading',{name:'Visión.',exact:true}).count(),1);
 });
 await check('añadir, editar en un clic, total, eliminar, deshacer y vaciar',async()=>{
  await page.locator('[data-add-product="1"]').click();await page.locator('.cart-button').click();await page.locator('[data-quantity="1"]').fill('2');await page.locator('[data-increase="1"]').click();assert.equal(await page.locator('#cart-total').textContent(),'$119.70');await page.locator('[data-remove="1"]').click();await waitCart(page,0);await page.locator('#undo-cart').click();await waitCart(page,3);await page.locator('#clear-cart').click();await waitCart(page,0);await page.locator('#undo-cart').click();await waitCart(page,3);
 });
 await check('descubrir catálogo cierra el carrito, limpia filtros y mueve el foco',async()=>{
  await page.keyboard.press('Escape');
  await page.locator('#product-search').fill('inexistente');
  await page.locator('.cart-button').click();
  await page.locator('#clear-cart').click();
  await page.getByRole('button',{name:'Descubrir el catálogo'}).click();
  await page.waitForFunction(()=>!document.querySelector('#cart-drawer').open && document.activeElement.id==='catalog-title');
  assert.equal(await page.locator('.product-card').count(),12);
  assert.equal(await page.locator('#product-search').inputValue(),'');
  assert.equal(await page.locator('#active-filters').isVisible(),false);
  await page.locator('[data-add-product="1"]').click();
  await page.locator('.cart-button').click();
 });
 await check('regex y errores de cantidad asociados con ARIA',async()=>{await page.locator('[data-quantity="1"]').fill('1.5');await page.locator('[data-quantity="1"]').press('Tab');assert.equal(await page.locator('[data-quantity="1"]').getAttribute('aria-invalid'),'true');assert.match(await page.locator('#quantity-1-error').textContent(),/entera/);await page.locator('[data-quantity="1"]').fill('2');await page.locator('[data-quantity="1"]').press('Tab');assert.equal(await page.locator('[data-quantity="1"]').getAttribute('aria-invalid'),'false');});
 await check('validación de contacto y bloqueo de consulta inválida',async()=>{await page.locator('.customer-details summary').click();await page.locator('#customer-name').fill('123');await page.locator('#customer-phone').fill('abc');await page.locator('#customer-email').fill('correo-invalido');await page.evaluate(()=>window.open=url=>{window.consultaUrl=url;});await page.locator('#checkout-button').click();for(const id of ['customer-name','customer-phone','customer-email'])assert.equal(await page.locator('#'+id).getAttribute('aria-invalid'),'true');assert.equal(await page.evaluate(()=>window.consultaUrl),undefined);await page.locator('#customer-name').fill('María Pérez');await page.locator('#customer-phone').fill('0991234567');await page.locator('#customer-email').fill('maria@example.com');await page.locator('input[value="domicilio"]').check();await page.locator('#customer-address').fill('Av. Quito 123');await page.locator('#order-note').fill('Para un regalo');await page.locator('#checkout-button').click();const url=new URL(await page.evaluate(()=>window.consultaUrl));assert.match(url.searchParams.get('text'),/María Pérez/);assert.match(url.searchParams.get('text'),/Av. Quito 123/);});
 await check('localStorage, sessionStorage, cookie e IndexedDB contienen la misma copia',async()=>{const values=await page.evaluate(async()=>{const m=await import('/js/storage.js');await m.storageSettled();const db=await new Promise((res,rej)=>{const r=indexedDB.open('michoks',1);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});const idb=await new Promise(res=>{const r=db.transaction('state').objectStore('state').get('michoks-cart');r.onsuccess=()=>res(r.result);});return [JSON.parse(localStorage.getItem('michoks-cart')),JSON.parse(sessionStorage.getItem('michoks-cart')),JSON.parse(decodeURIComponent(document.cookie.split('; ').find(x=>x.startsWith('michoks_cart=')).split('=').slice(1).join('='))),idb];});assert.equal(values.length,4);for(const v of values)assert.equal(v.cart['1'],2);assert.equal(new Set(values.map(v=>v.updatedAt)).size,1);});
 await page.keyboard.press('Escape');
 await check('marca vectorial carga en la cabecera',async()=>{assert.equal(await page.locator('.brand img').evaluate(img=>img.complete&&img.naturalWidth>0),true);});
 await check('sincronización entre pestañas',async()=>{const other=await context.newPage();await ready(other);await other.locator('[data-add-product="5"]').click();await waitCart(page,3);await other.close();});
 for(const mechanism of ['local','session','cookie','indexed'])await check('recuperación desde '+mechanism,async()=>{const ctx=await browser.newContext({serviceWorkers: 'block'});const p=await ctx.newPage();await ready(p);await p.locator('[data-add-product="1"]').click();await p.evaluate(async mechanism=>{await (await import('/js/storage.js')).storageSettled();if(mechanism!=='local')localStorage.clear();if(mechanism!=='session')sessionStorage.clear();if(mechanism!=='cookie')document.cookie='michoks_cart=; Max-Age=0; Path=/';if(mechanism!=='indexed'){const db=await new Promise(res=>{const r=indexedDB.open('michoks',1);r.onsuccess=()=>res(r.result);});await new Promise(res=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').clear();tx.oncomplete=res;});}},mechanism);await p.reload();if(await p.locator('#age-gate').isVisible())await p.locator('#age-accept').click();await waitCart(p,1);await ctx.close();});
 await check('vaciar y recargar no recupera productos eliminados',async()=>{await page.locator('.cart-button').click();await page.locator('#clear-cart').click();await page.evaluate(async()=>await(await import('/js/storage.js')).storageSettled());await page.reload();await waitCart(page,0);});
 for(const width of [320,390,480,768,1024,1440]) await check('responsive y axe '+width,async()=>{await page.setViewportSize({width,height:844});await ready(page);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();assert.deepEqual(a.violations,[]);await page.locator('[data-add-product="1"]').click();await page.locator('.cart-button').click();const b=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();assert.deepEqual(b.violations,[]);for(let i=0;i<18;i++){await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.querySelector('#cart-drawer').contains(document.activeElement)),true, 'focus '+width+' '+i+' '+await page.evaluate(()=>document.activeElement.outerHTML));}await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('.cart-button')===document.activeElement);});
 await check('error de catálogo recuperable',async()=>{await page.route('**/data/productos.json',r=>r.fulfill({status:500,body:'error'}));await page.reload();await page.getByRole('button',{name:'Volver a cargar'}).waitFor();await page.unroute('**/data/productos.json');await page.getByRole('button',{name:'Volver a cargar'}).click();await page.locator('[data-add-product="1"]').waitFor();});
 assert.deepEqual(errors,[]);console.log(`${count} comprobaciones aprobadas`);
 await page.setViewportSize({width:1440,height:1000});
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
 await page.screenshot({path:'/tmp/michoks-qa/desktop.png',animations:'disabled'});
 await page.locator('#destacados').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/michoks-qa/descubre.png',animations:'disabled'});
 await page.locator('#nosotros').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/michoks-qa/nosotros.png',animations:'disabled'});
 await page.setViewportSize({width:390,height:844});
 await page.reload();await page.locator('[data-add-product="1"]').waitFor();
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
 await page.screenshot({path:'/tmp/michoks-qa/mobile.png',animations:'disabled'});
}finally{await browser.close();server.close();}
