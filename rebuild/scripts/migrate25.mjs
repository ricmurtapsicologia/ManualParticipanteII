import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const rebuildRoot = resolve(here, '..');
const repoRoot = resolve(rebuildRoot, '..');
const contentDir = join(rebuildRoot, 'content');

const names = (await readdir(repoRoot))
  .filter(name => /^data\d+\.js$/i.test(name))
  .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));

if (!names.length) throw new Error('No legacy data*.js corpus files found');

let base64 = '';
for (const name of names) {
  const source = await readFile(join(repoRoot, name), 'utf8');
  const match = source.match(/\+\s*'([^']+)'\s*;?\s*$/s);
  if (!match) throw new Error(`Could not extract corpus chunk from ${name}`);
  base64 += match[1];
}

const decoded = gunzipSync(Buffer.from(base64, 'base64')).toString('utf8');
const legacy = JSON.parse(decoded);
if (!legacy || !Array.isArray(legacy.pages) || legacy.pages.length < 25) {
  throw new Error(`Legacy corpus has ${legacy?.pages?.length ?? 0} pages; expected at least 25`);
}

const migrated = legacy.pages.slice(0, 25).map((row, index) => {
  if (!Array.isArray(row)) throw new Error(`Invalid legacy page row ${index + 1}`);
  const number = Number(row[0] ?? index + 1);
  const page = {
    number,
    part: row[1] ?? null,
    partTitle: row[2] ?? '',
    chapter: row[3] ?? null,
    title: String(row[4] || (number === 1 ? 'Manual do Participante CATS' : `Página ${number}`)),
    paragraphs: Array.isArray(row[5]) ? row[5].map(String).filter(Boolean) : []
  };
  if (number === 1) {
    page.cover = true;
    if (!page.paragraphs.length) {
      page.paragraphs = [
        'Curso de Atendimento a Tentativas de Suicídio',
        'Manual do Participante • Edição Digital Interativa • 2026'
      ];
    }
  }
  return page;
});

for (let i = 0; i < migrated.length; i++) {
  if (migrated[i].number !== i + 1) throw new Error(`Unexpected page sequence at index ${i}: ${migrated[i].number}`);
  if (!migrated[i].title) throw new Error(`Missing title at page ${i + 1}`);
  if (!migrated[i].paragraphs.length) throw new Error(`Missing paragraphs at page ${i + 1}`);
}

const sourceHash = createHash('sha256').update(base64).digest('hex');
const provenance = {
  schema: 1,
  source: 'legacy embedded CATS corpus',
  sourceFiles: names,
  sourceSha256: sourceHash,
  extractedPages: 25,
  totalLegacyPages: legacy.pages.length
};

await writeFile(join(contentDir, 'pages.json'), `${JSON.stringify(migrated, null, 2)}\n`);
await writeFile(join(contentDir, 'provenance.json'), `${JSON.stringify(provenance, null, 2)}\n`);

console.log(`MIGRATE_OK chunks=${names.length} legacyPages=${legacy.pages.length} extracted=25 sha256=${sourceHash.slice(0, 12)}`);
console.log(`MIGRATE_TITLES ${migrated.slice(0, 25).map(p => `${p.number}:${p.title}`).join(' | ')}`);
