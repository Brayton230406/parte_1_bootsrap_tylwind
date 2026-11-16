// Integración de los requisitos de compra, sin cobros ni mensajes externos.
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.argv[2];
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');const file=path.join(root,url.pathname==='/'?'index.html':decodeURIComponent(url.pathname));res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(4175,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined});let count=0;
async function check(name,fn){await fn();console.log('OK '+name);count++;}
try{
 const context=await browser.newContext({serviceWorkers:'block'});const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:4175');await p.locator('#age-accept').click();await p.locator('#cookie-deny').click();await p.locator('[data-add-product="1"]').click();await p.waitForFunction(()=>document.querySelector('#cart-count').textContent==='1');await p.locator('.cart-button').click();
 await p.evaluate(()=>{window.open=url=>{window.requestUrl=url;};});
 await check('solo nombre habilitado y sin campos opcionales innecesarios',async()=>{
  assert.equal(await p.locator('#customer-name').isEnabled(),true);
  for(const id of ['customer-phone','customer-email','customer-address'])assert.equal(await p.locator('#'+id).isDisabled(),true);
  assert.equal(await p.locator('#order-note').count(),0);assert.equal(await p.locator('#customer-reference').count(),0);
  await p.locator('#checkout-button').click();assert.equal(await p.evaluate(()=>window.requestUrl),undefined);assert.equal(await p.evaluate(()=>document.activeElement.id),'customer-name');
 });
 await check('nombre se valida al escribir sin blur y bloquea celular',async()=>{
  await p.locator('#customer-name').fill('123');assert.equal(await p.locator('#customer-name').getAttribute('aria-invalid'),'true');assert.equal(await p.locator('#customer-phone').isDisabled(),true);
  await p.locator('#customer-name').fill('María');assert.equal(await p.locator('#customer-phone').isDisabled(),true);
  await p.locator('#customer-name').fill('María Pérez');assert.equal(await p.locator('#customer-name').getAttribute('aria-invalid'),'false');assert.equal(await p.locator('#customer-phone').isEnabled(),true);
 });
 await check('celular invalido bloquea correo; pegado valido lo habilita',async()=>{
  await p.locator('#customer-phone').fill('abc');assert.equal(await p.locator('#customer-phone').getAttribute('aria-invalid'),'true');assert.equal(await p.locator('#customer-email').isDisabled(),true);
  await p.locator('#customer-phone').fill('0991234567');assert.equal(await p.locator('#customer-phone').getAttribute('aria-invalid'),'false');assert.equal(await p.locator('#customer-email').isEnabled(),true);
 });
 await check('correo es obligatorio y su error aparece antes de enviar',async()=>{
  await p.locator('#checkout-button').click();assert.equal(await p.evaluate(()=>window.requestUrl),undefined);
  for (const invalid of ['correo@', '.maria@example.com', 'ma..ria@example.com', 'maria@-example.com']) { await p.locator('#customer-email').fill(invalid); assert.equal(await p.locator('#customer-email').getAttribute('aria-invalid'),'true'); }
  await p.locator('input[value="domicilio"]').check();assert.equal(await p.locator('#customer-address').isDisabled(),true);
  await p.locator('#customer-email').fill('maria@example.com');assert.equal(await p.locator('#customer-email').getAttribute('aria-invalid'),'false');assert.equal(await p.locator('#customer-address').isEnabled(),true);
 });
 await check('direccion se valida en vivo y es obligatoria para domicilio',async()=>{
  await p.locator('#customer-address').fill('abc');assert.equal(await p.locator('#customer-address').getAttribute('aria-invalid'),'true');
  await p.locator('#checkout-button').click();assert.equal(await p.evaluate(()=>window.requestUrl),undefined);
  await p.locator('#customer-address').fill('Quito, sector Centro, calle Sucre 123');assert.equal(await p.locator('#customer-address').getAttribute('aria-invalid'),'false');
  await p.locator('#checkout-button').click();const text=new URL(await p.evaluate(()=>window.requestUrl)).searchParams.get('text');assert.match(text,/Sucre 123/);assert.match(text,/maria@example.com/);
 });
 await check('corregir un campo previo vuelve a bloquear los siguientes',async()=>{
  await p.locator('#customer-phone').fill('09');assert.equal(await p.locator('#customer-email').isDisabled(),true);assert.equal(await p.locator('#customer-address').isDisabled(),true);
  await p.evaluate(()=>{delete window.requestUrl;});await p.locator('#checkout-button').click();assert.equal(await p.evaluate(()=>window.requestUrl),undefined);
  await p.locator('#customer-phone').fill('0991234567');assert.equal(await p.locator('#customer-email').isEnabled(),true);assert.equal(await p.locator('#customer-address').isEnabled(),true);
 });
 await check('retiro no exige ni comparte direccion anterior',async()=>{
  await p.locator('input[value="retiro"]').check();assert.equal(await p.locator('#customer-address').isDisabled(),true);await p.locator('#checkout-button').click();const text=new URL(await p.evaluate(()=>window.requestUrl)).searchParams.get('text');assert.match(text,/Retiro en tienda/);assert.doesNotMatch(text,/Sucre/);
 });
 for(const dark of [false,true]){
  await p.evaluate(dark=>{document.documentElement.dataset.theme=dark?'dark':'light';},dark);
  for(const width of [320,390,480,768,1024,1440])await check(`checkout ${dark?'oscuro':'claro'}, ancho ${width}, ARIA y contraste`,async()=>{
   await p.setViewportSize({width,height:900});await p.locator('input[value="domicilio"]').check();
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   assert.deepEqual((await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations,[]);
  });
 }
 await p.setViewportSize({width:1440,height:1000});await p.screenshot({path:'/tmp/michoks-qa/checkout-actualizado.png'});
 await check('contacto no se conserva al recargar',async()=>{await p.reload();await p.locator('[data-add-product="1"]').waitFor();assert.equal(await p.locator('#cart-count').textContent(),'1');assert.equal(await p.locator('#customer-name').inputValue(),'');assert.equal(await p.locator('#customer-address').inputValue(),'');assert.deepEqual(errors,[]);});
 console.log(`${count} comprobaciones de checkout aprobadas.`);
}finally{await browser.close();server.close();}
