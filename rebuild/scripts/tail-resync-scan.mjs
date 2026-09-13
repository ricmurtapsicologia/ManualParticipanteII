import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { constants, gunzipSync } from 'node:zlib';

const SOURCE_COMMIT = '9e6e2a844fbb16adfdce4dec0dbd3c2ec6983111';
const here = dirname(fileURLToPath(import.meta.url));
const rebuildRoot = resolve(here, '..');
const repoRoot = resolve(rebuildRoot, '..');
const outDir = join(rebuildRoot, 'recovery');
const git = (...args) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });

const names = Array.from({ length: 17 }, (_, i) => `data${i + 1}.js`);
let base64 = '';
for (const name of names) {
  const source = git('show', `${SOURCE_COMMIT}:${name}`);
  const match = source.match(/\+\s*'([^']+)'\s*;?\s*$/s);
  if (!match) throw new Error(`Missing encoded chunk in ${name}`);
  base64 += match[1];
}
const compressed = Buffer.from(base64, 'base64');
const text = gunzipSync(compressed, { finishFlush: constants.Z_SYNC_FLUSH }).toString('utf8');

function balancedArrayAt(start) {
  if (text[start] !== '[') return { error: 'not-array-start' };
  let depth = 0, inString = false, escaped = false;
  for (let cursor = start; cursor < text.length; cursor += 1) {
    const ch = text[cursor];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) return { end: cursor, candidate: text.slice(start, cursor + 1) };
      if (depth < 0) return { error: 'negative-depth', end: cursor };
    }
  }
  return { error: 'unterminated-array' };
}

function findStarts(number) {
  const needles = [`[${number},`, `[${number} ,`];
  const starts = new Set();
  for (const needle of needles) {
    let from = 0;
    while (true) {
      const at = text.indexOf(needle, from);
      if (at < 0) break;
      starts.add(at);
      from = at + 1;
    }
  }
  return [...starts].sort((a,b) => a-b);
}

function transform(row) {
  const number = Number(row[0]);
  const blocks = Array.isArray(row[5]) ? row[5] : [];
  return {
    number,
    part: row[1] ?? null,
    partTitle: String(row[2] ?? ''),
    chapter: row[3] ?? null,
    title: String(row[4] || `Página ${number}`),
    paragraphs: blocks.map(block => Array.isArray(block) ? String(block[1] ?? '') : String(block ?? '')).filter(Boolean)
  };
}

const pages = [];
const failures = [];
for (let number = 156; number <= 249; number += 1) {
  const starts = findStarts(number);
  let recovered = null;
  const attempts = [];
  for (const start of starts) {
    const balanced = balancedArrayAt(start);
    if (balanced.error) {
      attempts.push({ start, error: balanced.error });
      continue;
    }
    try {
      const row = JSON.parse(balanced.candidate);
      if (Array.isArray(row) && Number(row[0]) === number) {
        const page = transform(row);
        if (page.title && page.paragraphs.length) {
          recovered = {
            ...page,
            start,
            end: balanced.end,
            rawSha256: createHash('sha256').update(balanced.candidate).digest('hex')
          };
          break;
        }
        attempts.push({ start, error: 'parsed-but-incomplete' });
      } else attempts.push({ start, error: 'wrong-row-number' });
    } catch (error) {
      attempts.push({ start, end: balanced.end, error: `json:${error.message}`, chars: balanced.candidate.length });
    }
  }
  if (recovered) pages.push(recovered);
  else failures.push({ number, occurrences: starts.length, attempts: attempts.slice(0, 5) });
}

const recoveredNumbers = pages.map(p => p.number);
const ranges = [];
for (const n of recoveredNumbers) {
  const last = ranges.at(-1);
  if (!last || n !== last[1] + 1) ranges.push([n, n]);
  else last[1] = n;
}
const missing = [];
for (let n = 156; n <= 249; n += 1) if (!recoveredNumbers.includes(n)) missing.push(n);

const page156 = failures.find(f => f.number === 156) ?? null;
const report = {
  scannerVersion: 1,
  sourceCommit: SOURCE_COMMIT,
  partialJsonChars: text.length,
  sourceCompressedBytes: compressed.length,
  requestedRange: [156, 249],
  recoveredCount: pages.length,
  recoveredRanges: ranges,
  missing,
  page156,
  pages: pages.map(({paragraphs, ...p}) => ({...p, paragraphCount: paragraphs.length, contentSha256: createHash('sha256').update(JSON.stringify(paragraphs)).digest('hex')})),
};
await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, 'tail-resync-scan.json'), `${JSON.stringify(report, null, 2)}\n`);
const lines = [
  '# Tail resynchronization scan', '',
  `Source: ${SOURCE_COMMIT}`,
  `Recovered: ${pages.length}/94 pages in 156–249`,
  `Ranges: ${ranges.map(([a,b]) => a === b ? String(a) : `${a}-${b}`).join(', ') || 'none'}`,
  `Missing: ${missing.join(', ') || 'none'}`,
  '',
  '| page | title | paragraphs | start | end |',
  '|---:|---|---:|---:|---:|',
  ...pages.map(p => `| ${p.number} | ${p.title.replaceAll('|','\\|')} | ${p.paragraphs.length} | ${p.start} | ${p.end} |`)
];
await writeFile(join(outDir, 'tail-resync-scan.md'), `${lines.join('\n')}\n`);
console.log(`TAIL_RESYNC_SCAN_OK recovered=${pages.length} ranges=${ranges.map(r=>r.join('-')).join(',') || 'none'} missing=${missing.length}`);
