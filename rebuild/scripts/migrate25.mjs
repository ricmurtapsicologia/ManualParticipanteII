import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { constants, gunzipSync } from 'node:zlib';

const SOURCE_COMMIT = '9e6e2a844fbb16adfdce4dec0dbd3c2ec6983111';
const TARGET_PAGES = 25;
const here = dirname(fileURLToPath(import.meta.url));
const rebuildRoot = resolve(here, '..');
const repoRoot = resolve(rebuildRoot, '..');
const contentDir = join(rebuildRoot, 'content');
const git = (...args) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });

const names = Array.from({ length: 17 }, (_, index) => `data${index + 1}.js`);
let base64 = '';
for (const name of names) {
  const source = git('show', `${SOURCE_COMMIT}:${name}`);
  const match = source.match(/\+\s*'([^']+)'\s*;?\s*$/s);
  if (!match) throw new Error(`Could not extract corpus chunk from ${name}`);
  base64 += match[1];
}

const compressed = Buffer.from(base64, 'base64');
const partialJson = gunzipSync(compressed, { finishFlush: constants.Z_SYNC_FLUSH }).toString('utf8');
const pagesMarker = ',"pages":[';
const pagesMarkerAt = partialJson.indexOf(pagesMarker);
if (pagesMarkerAt < 0) throw new Error('Legacy payload has no recognizable pages array');

const pagesStart = pagesMarkerAt + pagesMarker.length;
const recovered = [];
let depth = 0;
let inString = false;
let escaped = false;
let itemStart = -1;
let firstInvalidOffset = null;

scan: for (let cursor = pagesStart; cursor < partialJson.length; cursor += 1) {
  const character = partialJson[cursor];
  if (inString) {
    if (escaped) escaped = false;
    else if (character === '\\') escaped = true;
    else if (character === '"') inString = false;
    continue;
  }
  if (character === '"') { inString = true; continue; }
  if (character === '[') {
    if (depth === 0) itemStart = cursor;
    depth += 1;
  } else if (character === ']') {
    depth -= 1;
    if (depth === 0 && itemStart >= 0) {
      const candidate = partialJson.slice(itemStart, cursor + 1);
      try {
        const parsed = JSON.parse(candidate);
        const expected = recovered.length + 1;
        if (!Array.isArray(parsed) || Number(parsed[0]) !== expected) {
          firstInvalidOffset = itemStart;
          console.log(`RECOVERY_STOP reason=sequence expected=${expected} got=${parsed?.[0] ?? 'invalid'} offset=${itemStart}`);
          break scan;
        }
        recovered.push(parsed);
      } catch (error) {
        firstInvalidOffset = itemStart;
        console.log(`RECOVERY_STOP reason=json pageCandidate=${recovered.length + 1} offset=${itemStart} message=${JSON.stringify(error.message)}`);
        break scan;
      }
      itemStart = -1;
    }
  }
}

console.log(`RECOVERY_SCAN completePages=${recovered.length} firstInvalidOffset=${firstInvalidOffset ?? 'none'} partialChars=${partialJson.length} compressedBytes=${compressed.length} base64Mod4=${base64.length % 4}`);
if (recovered.length < TARGET_PAGES) throw new Error(`Only ${recovered.length} complete sequential pages are safely recoverable; target is ${TARGET_PAGES}`);

const selected = recovered.slice(0, TARGET_PAGES);
const migrated = selected.map((row, index) => {
  const number = Number(row[0] ?? index + 1);
  const blocks = Array.isArray(row[5]) ? row[5] : [];
  const paragraphs = blocks.map(block => Array.isArray(block) ? String(block[1] ?? '') : String(block ?? '')).filter(Boolean);
  const page = {
    number,
    part: row[1] ?? null,
    partTitle: String(row[2] ?? ''),
    chapter: row[3] ?? null,
    title: String(row[4] || (number === 1 ? 'Manual do Participante CATS' : `Página ${number}`)),
    paragraphs
  };
  if (number === 1) {
    page.cover = true;
    page.title = 'Manual do Participante CATS';
    page.paragraphs = [
      'Curso de Atendimento a Tentativas de Suicídio',
      'Manual do Participante • Edição Digital Interativa • 2026'
    ];
  }
  return page;
});

for (let index = 0; index < migrated.length; index += 1) {
  const page = migrated[index];
  if (page.number !== index + 1) throw new Error(`Unexpected page sequence at ${index + 1}: ${page.number}`);
  if (!page.title || !page.paragraphs.length) throw new Error(`Incomplete page ${index + 1}`);
  if (JSON.stringify(selected[index]).includes('\uFFFD')) throw new Error(`Replacement character found at page ${index + 1}`);
}

const sourceHash = createHash('sha256').update(base64).digest('hex');
const selectedHash = createHash('sha256').update(JSON.stringify(selected)).digest('hex');
const provenance = {
  schema: 3,
  source: 'legacy CATS corpus recovered from complete sequential prefix using tolerant gzip flush',
  sourceCommit: SOURCE_COMMIT,
  sourceFiles: names,
  sourceSha256: sourceHash,
  selectedSha256: selectedHash,
  recoverableSequentialPages: recovered.length,
  firstInvalidOffset,
  extractedPages: TARGET_PAGES,
  targetBookPages: 249
};

await writeFile(join(contentDir, 'pages.json'), `${JSON.stringify(migrated, null, 2)}\n`);
await writeFile(join(contentDir, 'provenance.json'), `${JSON.stringify(provenance, null, 2)}\n`);
console.log(`MIGRATE_OK source=${SOURCE_COMMIT.slice(0, 12)} recoverableSequential=${recovered.length} extracted=${TARGET_PAGES} sha256=${selectedHash.slice(0, 12)}`);
