import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { constants, gunzipSync } from 'node:zlib';

const SCANNER_VERSION = 2;
const here = dirname(fileURLToPath(import.meta.url));
const rebuildRoot = resolve(here, '..');
const repoRoot = resolve(rebuildRoot, '..');
const outDir = join(rebuildRoot, 'recovery');
const candidateNames = Array.from({ length: 25 }, (_, i) => `data${i + 1}.js`);
const git = (...args) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });

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

const commits = git('rev-list', '--all', '--', ...candidateNames).trim().split(/\s+/).filter(Boolean);
const seenHashes = new Set();
const results = [];

for (const commit of commits) {
  try {
    let base64 = '';
    let chunkCount = 0;
    const files = [];
    for (const name of candidateNames) {
      try {
        const source = git('show', `${commit}:${name}`);
        const chunk = extractChunk(source);
        if (!chunk) break;
        base64 += chunk;
        files.push(name);
        chunkCount += 1;
      } catch {
        break;
      }
    }
    if (chunkCount === 0) continue;

    const sourceSha256 = createHash('sha256').update(base64).digest('hex');
    const identity = `${chunkCount}:${sourceSha256}`;
    if (seenHashes.has(identity)) continue;
    seenHashes.add(identity);

    const compressed = Buffer.from(base64, 'base64');
    let fullGzip = true;
    try { gunzipSync(compressed); } catch { fullGzip = false; }

    let partialJson = '';
    let recovery = { pages: 0, firstInvalidOffset: null, reason: 'not-scanned' };
    try {
      partialJson = gunzipSync(compressed, { finishFlush: constants.Z_SYNC_FLUSH }).toString('utf8');
      recovery = recoverPages(partialJson);
    } catch (error) {
      recovery = { pages: 0, firstInvalidOffset: null, reason: `gunzip:${error.message}` };
    }

    const meta = git('show', '-s', '--format=%cI%x09%s', commit).trim();
    const [date, ...msg] = meta.split('\t');
    results.push({
      commit,
      date,
      message: msg.join('\t'),
      chunkCount,
      files,
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

results.sort((a, b) => (b.pages ?? 0) - (a.pages ?? 0) || Number(b.fullGzip) - Number(a.fullGzip) || (b.chunkCount ?? 0) - (a.chunkCount ?? 0) || String(b.date ?? '').localeCompare(String(a.date ?? '')));
const top = results.slice(0, 50);
const best = top[0] ?? null;
const maxChunkCount = results.reduce((m, r) => Math.max(m, r.chunkCount ?? 0), 0);
const tailCandidates = results.filter(r => (r.chunkCount ?? 0) >= 18).slice(0, 20);

await mkdir(outDir, { recursive: true });
const report = { scannerVersion: SCANNER_VERSION, scannedUniquePayloads: results.length, maxChunkCount, best, tailCandidates, top };
await writeFile(join(outDir, 'history-scan.json'), `${JSON.stringify(report, null, 2)}\n`);
const lines = [
  '# CATS corpus historical recovery scan',
  '',
  `Scanner version: ${SCANNER_VERSION}`,
  `Unique payloads scanned: ${results.length}`,
  `Maximum contiguous data chunks found: ${maxChunkCount}`,
  best ? `Best: ${best.pages} pages / ${best.chunkCount} chunks at ${best.commit} (${best.message})` : 'Best: none',
  '',
  '| pages | chunks | full gzip | commit | date | message | reason |',
  '|---:|---:|:---:|---|---|---|---|',
  ...top.map(r => `| ${r.pages ?? 0} | ${r.chunkCount ?? 0} | ${r.fullGzip ? 'yes' : 'no'} | ${String(r.commit).slice(0, 12)} | ${r.date ?? ''} | ${(r.message ?? '').replaceAll('|', '\\|')} | ${(r.reason ?? '').replaceAll('|', '\\|')} |`)
];
await writeFile(join(outDir, 'history-scan.md'), `${lines.join('\n')}\n`);
console.log(`RECOVERY_HISTORY_SCAN_OK version=${SCANNER_VERSION} unique=${results.length} maxChunks=${maxChunkCount} bestPages=${best?.pages ?? 0} bestChunks=${best?.chunkCount ?? 0} bestCommit=${best?.commit ?? 'none'} fullGzip=${best?.fullGzip ?? false}`);
