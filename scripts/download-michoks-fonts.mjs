import { mkdir, writeFile } from 'node:fs/promises';

const cssUrl = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Manrope:wght@400;500;600;700;800&display=swap';
const response = await fetch(cssUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' }, signal: AbortSignal.timeout(25000) });
if (!response.ok) throw new Error(`Font CSS: ${response.status}`);
let css = await response.text();
// Keep Latin and Latin-extended coverage for Spanish; omit unrelated alphabets.
css = [...css.matchAll(/\/\* (latin(?:-ext)?) \*\/\s*(@font-face\s*\{[^}]+\})/g)].map((match) => match[0]).join('\n');
if (!css) throw new Error('No Latin font faces found');
await mkdir('assets/fonts', { recursive: true });
const urls = [...new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map((match) => match[1]))];
for (let i = 0; i < urls.length; i++) {
  const font = await fetch(urls[i], { signal: AbortSignal.timeout(25000) });
  if (!font.ok) throw new Error(`Font file: ${font.status}`);
  const name = `michoks-${i + 1}.woff2`;
  await writeFile(`assets/fonts/${name}`, Buffer.from(await font.arrayBuffer()));
  css = css.replaceAll(urls[i], name);
}
await writeFile('assets/fonts/fonts.css', `/* Local Google Fonts: Barlow Condensed + Manrope. SIL OFL. */\n${css}\n`);
for (const family of ['barlowcondensed', 'manrope']) {
  const license = await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/${family}/OFL.txt`, { signal: AbortSignal.timeout(25000) });
  if (!license.ok) throw new Error(`License ${family}: ${license.status}`);
  await writeFile(`assets/fonts/OFL-${family}.txt`, await license.text());
}
console.log(`Downloaded ${urls.length} local WOFF2 files, CSS and font licenses.`);
