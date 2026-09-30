import { mkdir, writeFile } from 'node:fs/promises';

const sources = process.argv.length > 2 ? process.argv.slice(2).map((arg) => [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)]) : [
  ['red-label', 'https://www.supermaxi.com/producto/whisky-red-label-johnnie-walker-750-ml/'],
  ['old-parr', 'https://licoresguayaquil.com/producto/old-parr-750ml/'],
  ['club', 'https://www.aki.com.ec/producto/cerveza-retornable-club-330-ml/'],
  ['pilsener', 'https://www.supermaxi.com/retornables/?product_tag=pilsener'],
  ['zhumir', 'https://www.zhumir.com/blank-5'],
  ['cuervo', 'https://cuervo.com/products/especial-gold/'],
  ['chivas', 'https://www.chivas.com/es-mx/collection/chivas-12/'],
  ['smirnoff', 'https://www.supermaxonline.com/guaynabo/licores/vodka/149500/smirnoff-vodka-750-ml'],
  ['casillero', 'https://nuevatienda.superxtra.com/vino-casillero-cabernet-750ml-7804320303178/p'],
  ['gato-negro', 'https://www.supermaxi.com/product-tag/277/'],
];
await mkdir('test-results/photo-research', { recursive: true });
for (let i = 0; i < sources.length; i += 3) {
  await Promise.all(sources.slice(i, i + 3).map(async ([name, url]) => {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
      const html = await response.text();
      await writeFile(`test-results/photo-research/${name}.html`, html);
      const images = [...html.matchAll(/<img\b[^>]*>|<meta\b[^>]*(?:og:image|twitter:image)[^>]*>/gi)]
        .map(([tag]) => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map((m) => [m[1], m[2]])))
        .map((a) => ({ src: a['data-src'] || a.src || a.content, alt: a.alt || '', class: a.class || '' }))
        .filter((a) => a.src && !/logo|icon|banner|loading|sprite|placeholder/i.test(a.src))
        .filter((a, index, all) => all.findIndex((b) => b.src === a.src) === index);
      await writeFile(`test-results/photo-research/${name}.json`, JSON.stringify(images, null, 2));
      console.log(JSON.stringify({ name, status: response.status, images: images.slice(0, 16) }));
    } catch (error) { console.log(JSON.stringify({ name, error: error.message })); }
  }));
}
