import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { constants, gunzipSync, inflateRawSync, inflateSync, brotliDecompressSync } from 'node:zlib';

const SNAPSHOT = 'fab214fdef6a30b61c4fbbf2746e352fc5eaeac0';
const here = dirname(fileURLToPath(import.meta.url));
const rebuildRoot = resolve(here, '..');
const repoRoot = resolve(rebuildRoot, '..');
const outDir = join(rebuildRoot, 'recovery');
const git = (...args) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });

const canonical = JSON.parse(await readFile(join(rebuildRoot, 'content', 'pages.json'), 'utf8'));
const canonicalFingerprints = canonical.map(page => createHash('sha256').update(JSON.stringify({number: page.number, title: page.title, paragraphs: page.paragraphs})).digest('hex'));

const tree = git('ls-tree', '-r', '--name-only', SNAPSHOT).trim().split(/\r?\n/).filter(Boolean);
const historicalPaths = tree.filter(path => path.startsWith('corpus-v08/')).concat(tree.filter(path => path.startsWith('corpus-v08-final/')));
const files = {};
for (const path of historicalPaths) {
  const raw = git('show', `${SNAPSHOT}:${path}`);
  files[path] = raw.replace(/\s+/g, '');
}

function scanRows(text) {
  const marker = ',"pages":[';
  const markerAt = text.indexOf(marker);
  if (markerAt < 0) return { rows: [], firstInvalidOffset: null, reason: 'pages-marker-missing' };
  const start = markerAt + marker.length;
  const rows = [];
  let depth = 0, inString = false, escaped = false, itemStart = -1;
  for (let cursor = start; cursor < text.length; cursor += 1) {
    const ch = text[cursor];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '[') {
      if (depth === 0) itemStart = cursor;
      depth += 1;
    } else if (ch === ']') {
      depth -= 1;
      if (depth === 0 && itemStart >= 0) {
        const candidate = text.slice(itemStart, cursor + 1);
        try {
          const parsed = JSON.parse(candidate);
          const expected = rows.length + 1;
          if (!Array.isArray(parsed) || Number(parsed[0]) !== expected) return { rows, firstInvalidOffset: itemStart, reason: `sequence-${expected}-${parsed?.[0] ?? 'invalid'}` };
          rows.push(parsed);
        } catch (error) {
          return { rows, firstInvalidOffset: itemStart, reason: `json:${error.message}` };
        }
        itemStart = -1;
      }
    }
  }
  return { rows, firstInvalidOffset: itemStart >= 0 ? itemStart : null, reason: itemStart >= 0 ? 'truncated-page' : 'eof' };
}

function migrateRow(row, index) {
  const number = Number(row[0] ?? index + 1);
  const blocks = Array.isArray(row[5]) ? row[5] : [];
  const paragraphs = blocks.map(block => Array.isArray(block) ? String(block[1] ?? '') : String(block ?? '')).filter(Boolean);
  if (number === 1) return { number, title: 'Manual do Participante CATS', paragraphs: ['Curso de Atendimento a Tentativas de Suicídio', 'Manual do Participante • Edição Digital Interativa • 2026'] };
  return { number, title: String(row[4] || `Página ${number}`), paragraphs };
}

function comparePrefix(rows) {
  let matched = 0;
  const limit = Math.min(rows.length, canonical.length);
  for (let i = 0; i < limit; i += 1) {
    const page = migrateRow(rows[i], i);
    const fingerprint = createHash('sha256').update(JSON.stringify(page)).digest('hex');
    if (fingerprint !== canonicalFingerprints[i]) break;
    matched += 1;
  }
  return matched;
}

function decodeCandidates(buffer) {
  const outputs = [];
  const add = (method, fn) => {
    try {
      const value = fn();
      const text = Buffer.isBuffer(value) ? value.toString('utf8') : String(value);
      outputs.push({ method, text });
    } catch (error) {
      outputs.push({ method, error: error.message });
    }
  };
  add('utf8-direct', () => buffer);
  add('gunzip-full', () => gunzipSync(buffer));
  add('gunzip-sync-flush', () => gunzipSync(buffer, { finishFlush: constants.Z_SYNC_FLUSH }));
  add('inflate-full', () => inflateSync(buffer));
  add('inflate-sync-flush', () => inflateSync(buffer, { finishFlush: constants.Z_SYNC_FLUSH }));
  add('inflateRaw-full', () => inflateRawSync(buffer));
  add('inflateRaw-sync-flush', () => inflateRawSync(buffer, { finishFlush: constants.Z_SYNC_FLUSH }));
  add('brotli', () => brotliDecompressSync(buffer));
  return outputs;
}

const names = Object.keys(files);
const combinations = [];
const addCombo = (label, paths) => {
  if (paths.every(path => files[path])) combinations.push({ label, paths, base64: paths.map(path => files[path]).join('') });
};
for (const path of names) addCombo(path, [path]);
addCombo('v08:c01+c02', ['corpus-v08/c01.txt', 'corpus-v08/c02.txt']);
addCombo('v08:c02+c01', ['corpus-v08/c02.txt', 'corpus-v08/c01.txt']);
addCombo('v08final:c00+c01+c02', ['corpus-v08-final/c00.txt', 'corpus-v08/c01.txt', 'corpus-v08/c02.txt']);
addCombo('v08final:c01+c02+c00', ['corpus-v08/c01.txt', 'corpus-v08/c02.txt', 'corpus-v08-final/c00.txt']);
addCombo('v08final:c01+c00+c02', ['corpus-v08/c01.txt', 'corpus-v08-final/c00.txt', 'corpus-v08/c02.txt']);
addCombo('v08final:c00+c02+c01', ['corpus-v08-final/c00.txt', 'corpus-v08/c02.txt', 'corpus-v08/c01.txt']);
addCombo('v08final:c02+c00+c01', ['corpus-v08/c02.txt', 'corpus-v08-final/c00.txt', 'corpus-v08/c01.txt']);
addCombo('v08final:c02+c01+c00', ['corpus-v08/c02.txt', 'corpus-v08/c01.txt', 'corpus-v08-final/c00.txt']);

const results = [];
for (const combo of combinations) {
  const buffer = Buffer.from(combo.base64, 'base64');
  const base = {
    label: combo.label,
    paths: combo.paths,
    base64Chars: combo.base64.length,
    decodedBytes: buffer.length,
    base64Sha256: createHash('sha256').update(combo.base64).digest('hex')
  };
  for (const output of decodeCandidates(buffer)) {
    if (output.error) {
      results.push({ ...base, method: output.method, error: output.error, pages: 0 });
      continue;
    }
    const text = output.text;
    const scanned = scanRows(text);
    const prefixMatched = comparePrefix(scanned.rows);
    results.push({
      ...base,
      method: output.method,
      textChars: text.length,
      pages: scanned.rows.length,
      prefixMatched,
      firstInvalidOffset: scanned.firstInvalidOffset,
      reason: scanned.reason,
      startsWith: text.slice(0, 80)
    });
  }
}

results.sort((a,b) => (b.pages ?? 0) - (a.pages ?? 0) || (b.prefixMatched ?? 0) - (a.prefixMatched ?? 0));
const best = results[0] ?? null;
await mkdir(outDir, { recursive: true });
const report = {
  scannerVersion: 1,
  snapshot: SNAPSHOT,
  historicalPaths,
  fileSizes: Object.fromEntries(Object.entries(files).map(([k,v]) => [k, v.length])),
  canonicalPages: canonical.length,
  best,
  successful: results.filter(r => r.pages > 0).slice(0, 30),
  top: results.slice(0, 40)
};
await writeFile(join(outDir, 'v08-scan.json'), `${JSON.stringify(report, null, 2)}\n`);
const lines = [
  '# v0.8 historical corpus recovery scan', '',
  `Snapshot: ${SNAPSHOT}`,
  `Files: ${historicalPaths.join(', ') || 'none'}`,
  best ? `Best: ${best.pages} pages, prefix match ${best.prefixMatched}, ${best.label}, ${best.method}` : 'Best: none', '',
  '| pages | prefix match | candidate | method | reason/error |',
  '|---:|---:|---|---|---|',
  ...results.slice(0, 40).map(r => `| ${r.pages ?? 0} | ${r.prefixMatched ?? 0} | ${r.label} | ${r.method} | ${(r.reason ?? r.error ?? '').replaceAll('|','\\|')} |`)
];
await writeFile(join(outDir, 'v08-scan.md'), `${lines.join('\n')}\n`);
console.log(`V08_SCAN_OK files=${historicalPaths.length} bestPages=${best?.pages ?? 0} prefixMatched=${best?.prefixMatched ?? 0} candidate=${best?.label ?? 'none'} method=${best?.method ?? 'none'}`);
