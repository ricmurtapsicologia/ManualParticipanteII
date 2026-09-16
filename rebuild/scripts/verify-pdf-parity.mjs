import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pdfPath = path.join(root, 'public', 'downloads', 'Manual-do-Participante-CATS-Edicao-Digital-2026.pdf');
const textPath = path.join(root, 'reports', 'pdf-extracted.txt');
const reportPath = path.join(root, 'reports', 'parity-report.json');
const [semantic, navigation, preflight] = await Promise.all([
  readFile(path.join(root, 'content', 'semantic-pages.json'), 'utf8').then(JSON.parse),
  readFile(path.join(root, 'content', 'navigation.json'), 'utf8').then(JSON.parse),
  readFile(path.join(root, 'public', 'downloads', 'manual-preflight.json'), 'utf8').then(JSON.parse)
]);

await mkdir(path.dirname(textPath), { recursive: true });
const pdftotext = spawnSync('pdftotext', ['-layout', '-nopgbrk', pdfPath, textPath], { encoding: 'utf8' });
if (pdftotext.status !== 0) throw new Error(`pdftotext falhou: ${pdftotext.stderr || pdftotext.stdout}`);

const extracted = await readFile(textPath, 'utf8');

const normalizeText = value => String(value ?? '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[\u00ad\u200b☐□]/g, '')
  .replace(/-\s*\n\s*/g, '-')
  .replace(/\/\s*\n\s*/g, '/')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const tokenize = value => normalizeText(value).match(/[a-z0-9]+/g) ?? [];
const pdfText = normalizeText(extracted);
const pdfTokens = tokenize(extracted);
const positions = new Map();
for (let i = 0; i < pdfTokens.length; i += 1) {
  const token = pdfTokens[i];
  const list = positions.get(token) ?? [];
  list.push(i);
  positions.set(token, list);
}

const lowerBound = (array, target) => {
  let lo = 0;
  let hi = array.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (array[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

// Conservador: todas as palavras da fonte precisam existir, na mesma ordem.
// Só são tolerados tokens extras inseridos pelo pdftotext (cabeçalhos, paginação
// física ou artefatos de reflow). Nenhum token da fonte pode ser ignorado.
const tokenSequencePresent = value => {
  const needle = tokenize(value);
  if (needle.length === 0) return true;
  const starts = positions.get(needle[0]) ?? [];
  const maxGapPerToken = 16;
  const maxTotalExtras = Math.max(16, Math.ceil(needle.length * 0.35));

  for (const start of starts) {
    let cursor = start;
    let extras = 0;
    let matched = true;
    for (let i = 1; i < needle.length; i += 1) {
      const candidates = positions.get(needle[i]);
      if (!candidates) { matched = false; break; }
      const index = lowerBound(candidates, cursor + 1);
      if (index >= candidates.length) { matched = false; break; }
      const next = candidates[index];
      const gap = next - cursor - 1;
      if (gap > maxGapPerToken) { matched = false; break; }
      extras += gap;
      if (extras > maxTotalExtras) { matched = false; break; }
      cursor = next;
    }
    if (matched) return true;
  }
  return false;
};

const blocks = (semantic.pages ?? []).flatMap(page => [
  { page: page.number, kind: 'page-title', text: page.title },
  ...(page.blocks ?? []).map(block => ({ page: page.number, kind: block.kind, text: block.text }))
]).filter(item => tokenize(item.text).length > 0);

const canonicalCoverLine = normalizeText('Manual do Participante • Edição Digital Interativa • 2026');
const coverSegments = ['Manual do Participante', 'Edição Digital Interativa', '2026'].map(normalizeText);
const firstCoverTokens = new Set(pdfTokens.slice(0, 220));
const coverEquivalent = item => {
  const normalized = normalizeText(item.text);
  if (item.page !== 1) return false;
  if (normalized === canonicalCoverLine && coverSegments.every(segment => pdfText.includes(segment))) return true;
  if (item.kind === 'page-title') {
    const tokens = tokenize(item.text);
    return tokens.length > 0 && tokens.every(token => firstCoverTokens.has(token));
  }
  return false;
};

const missing = [];
let exactMatches = 0;
let tokenSequenceMatches = 0;
let coverEquivalentMatches = 0;
for (const item of blocks) {
  const normalized = normalizeText(item.text);
  if (pdfText.includes(normalized)) { exactMatches += 1; continue; }
  if (tokenSequencePresent(item.text)) { tokenSequenceMatches += 1; continue; }
  if (coverEquivalent(item)) { coverEquivalentMatches += 1; continue; }
  missing.push({ page: item.page, kind: item.kind, text: String(item.text).slice(0, 240) });
}

const logicalPages = Number(preflight.sourcePageCount);
const physicalPages = Number(preflight.pageCount);
const maxResidual = Number(preflight.layout?.measuredMaxResidualBlankAreaExcludingLastRegular ?? 1);
const bodySize = Number(preflight.bodyTypography?.sizePt ?? 0);
const bodyLeading = Number(preflight.bodyTypography?.leadingPt ?? 0);
const logicalMapLength = Array.isArray(preflight.logicalPageMap) ? preflight.logicalPageMap.length : 0;
const sourcePageCountMatch = logicalPages === (semantic.pages ?? []).length;
const logicalMapMatch = logicalMapLength === (semantic.pages ?? []).length;
const condensationValid = physicalPages > 0 && physicalPages < logicalPages;
const chapterCountMatch = Number(preflight.chapterCount) === Number(navigation.chapterCount ?? 34);
const typographyValid = bodySize >= 11.2 && bodyLeading >= 16;
const residualValid = maxResidual <= 0.20;

const ok = missing.length === 0 && sourcePageCountMatch && logicalMapMatch && condensationValid && chapterCountMatch && typographyValid && residualValid;
const report = {
  schemaVersion: 2,
  status: ok ? 'PASS' : 'FAIL',
  logicalPages,
  physicalPages,
  sourceChapters: navigation.chapterCount ?? 34,
  pdfManifestChapters: preflight.chapterCount,
  blocksChecked: blocks.length,
  exactMatches,
  tokenSequenceMatches,
  coverEquivalentMatches,
  blocksMissing: missing.length,
  bodyTypography: preflight.bodyTypography,
  maxResidualBlankArea: maxResidual,
  checks: {
    sourcePageCountMatch,
    logicalMapMatch,
    condensationValid,
    chapterCountMatch,
    typographyValid,
    residualValid
  },
  missing: missing.slice(0, 100)
};

await writeFile(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!ok) process.exit(1);
