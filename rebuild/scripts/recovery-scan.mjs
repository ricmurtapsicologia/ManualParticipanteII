import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { constants, gunzipSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const rebuildRoot = resolve(here, '..');
const repoRoot = resolve(rebuildRoot, '..');
const outDir = join(rebuildRoot, 'recovery');
const names = Array.from({ length: 17 }, (_, i) => `data${i + 1}.js`);
const git = (...args) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

function extractChunk(source) {
  const match = source.match(/\+\s*'([^']+)'\s*;?\s*$/s);
  return match?.[1] ?? null;
}

function recoverPages(partialJson) {
  const marker = ',"pages":[';
  const markerAt = partialJson.indexOf(marker);
  if (markerAt < 0) return { pages: 0, firstInvalidOffset: null, reason: 'pages-marker-missing' };
  const start = markerAt + marker.length;
  let depth = 0, inString = false, escaped = false, itemStart = -1;
  const recovered = [];
  for (let cursor = start; cursor < partialJson.length; cursor += 1) {
    const ch = partialJson[cursor];
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
        const candidate = partialJson.slice(itemStart, cursor + 1);
        try {
          const parsed = JSON.parse(candidate);
          const expected = recovered.length + 1;
          if (!Array.isArray(parsed) || Number(parsed[0]) !== expected) {
            return { pages: recovered.length, firstInvalidOffset: itemStart, reason: `sequence-${expected}-${parsed?.[0] ?? 'invalid'}` };
          }
          recovered.push(parsed);
        } catch (error) {
          return { pages: recovered.length, firstInvalidOffset: itemStart, reason: `json:${error.message}` };
        }
        itemStart = -1;
      }
    }
  }
  return { pages: recovered.length, firstInvalidOffset: itemStart >= 0 ? itemStart : null, reason: itemStart >= 0 ? 'truncated-page' : 'eof' };
}

const paths = names.join(' ');
const commits = git('rev-list', '--all', '--', ...names).trim().split(/\s+/).filter(Boolean);
const seenHashes = new Set();
const results = [];

for (const commit of commits) {
  try {
    let base64 = '';
    let completeFiles = true;
    for (const name of names) {
      try {
        const source = git('show', `${commit}:${name}`);
        const chunk = extractChunk(source);
        if (!chunk) { completeFiles = false; break; }
        base64 += chunk;
      } catch { completeFiles = false; break; }
    }
    if (!completeFiles) continue;
    const sourceSha256 = createHash('sha256').update(base64).digest('hex');
    if (seenHashes.has(sourceSha256)) continue;
    seenHashes.add(sourceSha256);

    const compressed = Buffer.from(base64, 'base64');
    let fullGzip = true;
    try { gunzipSync(compressed); } catch { fullGzip = false; }
    let partialJson = '';
    try {
      partialJson = gunzipSync(compressed, { finishFlush: constants.Z_SYNC_FLUSH }).toString('utf8');
    } catch (error) {
      const meta = git('show', '-s', '--format=%cI%x09%s', commit).trim();
      const [date, ...msg] = meta.split('\t');
      results.push({ commit, date, message: msg.join('\t'), sourceSha256, fullGzip, pages: 0, firstInvalidOffset: null, reason: `gunzip:${error.message}` });
      continue;
    }
    const recovery = recoverPages(partialJson);
    const meta = git('show', '-s', '--format=%cI%x09%s', commit).trim();
    const [date, ...msg] = meta.split('\t');
    results.push({
      commit,
      date,
      message: msg.join('\t'),
      sourceSha256,
      compressedBytes: compressed.length,
      partialChars: partialJson.length,
      fullGzip,
      ...recovery
    });
  } catch (error) {
    results.push({ commit, pages: 0, reason: `scan:${error.message}` });
  }
}

results.sort((a, b) => (b.pages ?? 0) - (a.pages ?? 0) || Number(b.fullGzip) - Number(a.fullGzip) || String(b.date ?? '').localeCompare(String(a.date ?? '')));
const top = results.slice(0, 30);
const best = top[0] ?? null;
await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, 'history-scan.json'), `${JSON.stringify({ scannedUniquePayloads: results.length, best, top }, null, 2)}\n`);
const lines = [
  '# CATS corpus historical recovery scan',
  '',
  `Unique payloads scanned: ${results.length}`,
  best ? `Best: ${best.pages} pages at ${best.commit} (${best.message})` : 'Best: none',
  '',
  '| pages | full gzip | commit | date | message | reason |',
  '|---:|:---:|---|---|---|---|',
  ...top.map(r => `| ${r.pages ?? 0} | ${r.fullGzip ? 'yes' : 'no'} | ${String(r.commit).slice(0, 12)} | ${r.date ?? ''} | ${(r.message ?? '').replaceAll('|', '\\|')} | ${(r.reason ?? '').replaceAll('|', '\\|')} |`)
];
await writeFile(join(outDir, 'history-scan.md'), `${lines.join('\n')}\n`);
console.log(`RECOVERY_HISTORY_SCAN_OK unique=${results.length} bestPages=${best?.pages ?? 0} bestCommit=${best?.commit ?? 'none'} fullGzip=${best?.fullGzip ?? false}`);
