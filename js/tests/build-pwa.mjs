// El servidor MVC administra el catálogo. El worker no almacena sesiones ni datos.
import { readFile } from 'node:fs/promises';
const worker=await readFile(new URL('../../sw.js',import.meta.url),'utf8');
if(worker.includes("addEventListener('fetch'") || worker.includes('cache.addAll'))throw new Error('El worker MVC debe pasar todas las solicitudes al servidor.');
console.log('Worker MVC verificado: sin caché de datos privados.');
