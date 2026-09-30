import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const manifest = JSON.parse(await readFile('assets/products/sources.json', 'utf8')).filter((item) => process.argv.length <= 2 || process.argv.slice(2).includes(String(item.id)));
for (let i = 0; i < manifest.length; i += 3) {
  await Promise.all(manifest.slice(i, i + 3).map(async (item) => {
    try {
      const response = await fetch(item.imageUrl, { signal: AbortSignal.timeout(30000) });
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Invalid image response: ${response.status}`);
      const data = Buffer.from(await response.arrayBuffer());
      await mkdir(path.dirname(item.file), { recursive: true });
      await writeFile(item.file, data);
      console.log(`${item.name}: ${data.length} bytes`);
    } catch (error) { console.error(`${item.name}: ${error.message}`); process.exitCode = 1; }
  }));
}
